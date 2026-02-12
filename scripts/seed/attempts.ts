import { PrismaClient, Enrollment, Quiz, Module, Item, ItemOption } from '@prisma/client'
import { STUDENTS } from './users'
import { AbilityPersona, PERSONA_CORRECT_RATE, PERSONA_FINAL_THETA, randBetween, randInt, shuffle } from './types'

/** Maps username -> persona */
const STUDENT_PERSONA_MAP: Record<string, AbilityPersona> = Object.fromEntries(
  STUDENTS.map(s => [s.username, s.persona])
)

/**
 * Returns the persona for a given username. Non-student users (instructors, TAs)
 * who appear in enrollments get AVERAGE as a fallback.
 */
function getPersona(username: string): AbilityPersona {
  return STUDENT_PERSONA_MAP[username] ?? 'AVERAGE'
}

/**
 * Generate a date within the term range, offset by attempt index for spread.
 */
function attemptDate(termStart: Date, termEnd: Date, attemptIndex: number, totalAttempts: number): Date {
  const range = termEnd.getTime() - termStart.getTime()
  // Spread attempts evenly but add some jitter
  const base = termStart.getTime() + (range * attemptIndex) / totalAttempts
  const jitter = (Math.random() - 0.5) * range * 0.05
  return new Date(base + jitter)
}

/**
 * Simulate CAT theta update (simplified EAP-like step).
 * For seeding purposes we just nudge theta toward the "true" ability.
 */
function updateTheta(currentTheta: number, isCorrect: boolean, irtB: number): number {
  const step = 0.08
  if (isCorrect) {
    return currentTheta + step * (1 + Math.max(0, irtB - currentTheta) * 0.3)
  } else {
    return currentTheta - step * (1 + Math.max(0, currentTheta - irtB) * 0.3)
  }
}

export async function seedAttempts(
  prisma: PrismaClient,
  enrollments: Map<string, Enrollment>,
  quizzes: Map<string, Quiz>,
  modules: Map<string, Module>,
  itemsByModule: Map<string, Item[]>,
): Promise<void> {
  console.log('🎯 Seeding attempts, responses, and thetas...')

  // Pre-load all item options for efficiency
  const allItems = Array.from(itemsByModule.values()).flat()
  const itemOptions = await prisma.itemOption.findMany({
    where: { itemId: { in: allItems.map(i => i.id) } },
  })
  const optionsByItem = new Map<string, ItemOption[]>()
  for (const opt of itemOptions) {
    if (!optionsByItem.has(opt.itemId)) optionsByItem.set(opt.itemId, [])
    optionsByItem.get(opt.itemId)!.push(opt)
  }

  // Build a map of quizId -> { items, moduleIds }
  const quizItemLinks = await prisma.quizItem.findMany({
    where: { quizId: { in: Array.from(quizzes.values()).map(q => q.id) } },
  })
  const quizModuleLinks = await prisma.quizModule.findMany({
    where: { quizId: { in: Array.from(quizzes.values()).map(q => q.id) } },
  })

  const quizItemsMap = new Map<string, string[]>() // quizId -> itemIds
  for (const link of quizItemLinks) {
    if (!quizItemsMap.has(link.quizId)) quizItemsMap.set(link.quizId, [])
    quizItemsMap.get(link.quizId)!.push(link.itemId)
  }

  const quizModulesMap = new Map<string, string[]>() // quizId -> moduleIds
  for (const link of quizModuleLinks) {
    if (!quizModulesMap.has(link.quizId)) quizModulesMap.set(link.quizId, [])
    quizModulesMap.get(link.quizId)!.push(link.moduleId)
  }

  // Build itemId -> item lookup
  const itemById = new Map<string, Item>()
  for (const item of allItems) itemById.set(item.id, item)

  // Build enrollmentId -> username lookup
  const enrollmentUserMap = new Map<string, string>()

  let totalAttempts = 0
  let totalResponses = 0
  let totalThetas = 0

  // Determine which courses are "ultra-detailed" (more attempts)
  const ultraDetailedOfferingKeys = new Set<string>()
  ultraDetailedOfferingKeys.add('BCH210_Fall 2024')
  ultraDetailedOfferingKeys.add('CSC108_Winter 2025')

  // Process each enrollment
  for (const [enrollKey, enrollment] of enrollments) {
    // enrollKey format: "{username}::{courseCode}_{termName}"
    const [username, offeringKeyStr] = enrollKey.split('::')
    enrollmentUserMap.set(enrollment.id, username)

    // Only students get attempts
    const persona = getPersona(username)
    const role = enrollment.offeringRole
    if (role !== 'STUDENT') continue

    // Get offering ID from enrollment
    const offeringId = enrollment.offeringId

    // Find quizzes in this offering
    const relevantQuizzes = Array.from(quizzes.values()).filter(q => q.offeringId === offeringId && q.active)

    if (relevantQuizzes.length === 0) continue

    const isUltraDetailed = ultraDetailedOfferingKeys.has(offeringKeyStr)
    const attemptsPerQuiz = isUltraDetailed ? randInt(4, 6) : randInt(1, 2)

    // Determine term dates based on offering key
    const isWinter2025 = offeringKeyStr.includes('Winter 2025')
    const termStart = isWinter2025 ? new Date('2025-01-06') : new Date('2024-09-03')
    const termEnd = isWinter2025 ? new Date('2025-04-15') : new Date('2024-12-15')

    // Initialize per-module theta tracking for this enrollment
    const moduleThetas = new Map<string, number>()
    const moduleIds = new Set<string>()
    for (const quiz of relevantQuizzes) {
      for (const modId of quizModulesMap.get(quiz.id) ?? []) {
        moduleIds.add(modId)
        if (!moduleThetas.has(modId)) moduleThetas.set(modId, 0.0)
      }
    }

    let attemptIndex = 0
    const totalAttemptsForEnrollment = relevantQuizzes.length * attemptsPerQuiz

    for (const quiz of relevantQuizzes) {
      const quizItemIds = quizItemsMap.get(quiz.id) ?? []
      if (quizItemIds.length === 0) continue

      const quizModuleIds = quizModulesMap.get(quiz.id) ?? []

      for (let a = 0; a < attemptsPerQuiz; a++) {
        attemptIndex++

        // Determine status: last attempt per quiz has chance of being in-progress or abandoned
        let status: string
        const isLastAttempt = a === attemptsPerQuiz - 1
        if (isLastAttempt) {
          const roll = Math.random()
          status = roll < 0.70 ? 'COMPLETED' : roll < 0.85 ? 'IN_PROGRESS' : 'ABANDONED'
        } else {
          status = Math.random() < 0.85 ? 'COMPLETED' : 'ABANDONED'
        }

        const startedAt = attemptDate(termStart, termEnd, attemptIndex, totalAttemptsForEnrollment)
        const finishedAt = status === 'COMPLETED' ? new Date(startedAt.getTime() + randInt(8, 45) * 60 * 1000) : null

        // Scope snapshot (omit eligibleItemIds to stay within column length limits)
        const scopeSnapshot = JSON.stringify({
          includedModules: quizModuleIds,
          includedBlooms: quiz.includedBlooms ? quiz.includedBlooms.split(',') : [],
        })

        const attempt = await prisma.attempt.create({
          data: {
            quizId: quiz.id,
            enrollmentId: enrollment.id,
            startedAt,
            finishedAt: finishedAt ?? undefined,
            status,
            fixedLengthN: quiz.fixedLength,
            engineVersion: '1.0.0',
            scopeSnapshot,
          },
        })
        totalAttempts++

        // Determine how many items to answer
        const itemsToAnswer = status === 'COMPLETED'
          ? quiz.fixedLength
          : status === 'IN_PROGRESS'
            ? randInt(1, quiz.fixedLength - 1)
            : randInt(1, 3) // abandoned: just a few

        // Pick items for this attempt
        const availableItems = shuffle(quizItemIds)
          .slice(0, Math.min(itemsToAnswer, quizItemIds.length))
          .map(id => itemById.get(id))
          .filter((i): i is Item => !!i)

        // Build mastery snapshot state
        const currentModuleThetas = new Map(moduleThetas)

        let questionTime = startedAt.getTime()
        const masteryAtFinish: Record<string, number> = {}

        for (const item of availableItems) {
          const options = optionsByItem.get(item.id) ?? []
          if (options.length === 0) continue

          const correctOption = options.find(o => o.isCorrect)
          if (!correctOption) continue

          const correctRate = PERSONA_CORRECT_RATE[persona]
          // Add jitter based on item difficulty
          const thetaForMod = currentModuleThetas.get(item.moduleId) ?? 0
          const difficultyPenalty = Math.max(0, item.irtB - thetaForMod) * 0.1
          const adjustedRate = Math.max(0.15, Math.min(0.95, correctRate - difficultyPenalty + (Math.random() - 0.5) * 0.15))

          const isCorrect = Math.random() < adjustedRate
          const selectedOption = isCorrect
            ? correctOption
            : options.filter(o => !o.isCorrect)[randInt(0, options.filter(o => !o.isCorrect).length - 1)]

          const responseTimeMs = randInt(15000, 120000)
          const askedAt = new Date(questionTime)
          const answeredAt = new Date(questionTime + responseTimeMs)
          questionTime = answeredAt.getTime() + randInt(1000, 5000)

          // Update theta
          const prevTheta = currentModuleThetas.get(item.moduleId) ?? 0
          const newTheta = updateTheta(prevTheta, isCorrect, item.irtB)
          currentModuleThetas.set(item.moduleId, newTheta)

          const masterySnapshot: Record<string, number> = {}
          for (const [modId, theta] of currentModuleThetas) {
            masterySnapshot[modId] = Math.round(theta * 1000) / 1000
          }

          await prisma.response.create({
            data: {
              attemptId: attempt.id,
              itemId: item.id,
              selectedLabel: selectedOption.label,
              itemOptionId: selectedOption.id,
              isCorrect,
              askedAt,
              answeredAt,
              responseTimeMs,
              engineMasterySnapshot: JSON.stringify(masterySnapshot),
            },
          })
          totalResponses++
        }

        // After attempt, update running thetas
        for (const [modId, theta] of currentModuleThetas) {
          if (quizModuleIds.includes(modId)) {
            moduleThetas.set(modId, theta)
            masteryAtFinish[modId] = Math.round(theta * 1000) / 1000
          }
        }

        // Update engineMasteryAtFinish on completed attempts
        if (status === 'COMPLETED') {
          await prisma.attempt.update({
            where: { id: attempt.id },
            data: { engineMasteryAtFinish: JSON.stringify(masteryAtFinish) },
          })
        }
      }
    }

    // Clamp final thetas to persona range and create Theta records
    const [thetaMin, thetaMax] = PERSONA_FINAL_THETA[persona]
    for (const modId of moduleIds) {
      const rawTheta = moduleThetas.get(modId) ?? 0
      // Blend toward persona range
      const clampedTheta = Math.max(thetaMin, Math.min(thetaMax, rawTheta + randBetween(-0.1, 0.1)))

      const existing = await prisma.theta.findUnique({
        where: { enrollmentId_moduleId: { enrollmentId: enrollment.id, moduleId: modId } },
      })
      if (existing) {
        await prisma.theta.update({
          where: { id: existing.id },
          data: { value: clampedTheta },
        })
      } else {
        await prisma.theta.create({
          data: { enrollmentId: enrollment.id, moduleId: modId, value: clampedTheta },
        })
      }
      totalThetas++
    }
  }

  console.log(`  Created ${totalAttempts} attempts, ${totalResponses} responses, ${totalThetas} theta records`)
}
