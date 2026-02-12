import { PrismaClient, Quiz, CourseOffering, Module, Item, User } from '@prisma/client'
import { offeringKey, moduleKey } from './courses'

export interface QuizRecord {
  quiz: Quiz
  courseCode: string
  termName: string
}

export async function seedQuizzes(
  prisma: PrismaClient,
  offerings: Map<string, CourseOffering>,
  modules: Map<string, Module>,
  items: Map<string, Item[]>,
  users: Map<string, User>,
): Promise<Map<string, Quiz>> {
  console.log('📝 Seeding quizzes...')
  const quizzes = new Map<string, Quiz>()

  async function createQuiz(
    title: string,
    courseCode: string,
    termName: string,
    fixedLength: number,
    active: boolean,
    moduleNames: string[],
    includedBlooms: string,
    createdByUsername: string,
  ): Promise<Quiz> {
    const offering = offerings.get(offeringKey(courseCode, termName))!
    const createdBy = users.get(createdByUsername)!

    const quiz = await prisma.quiz.create({
      data: {
        offeringId: offering.id,
        title,
        fixedLength,
        active,
        includedBlooms,
        createdById: createdBy.id,
      },
    })

    // Link modules
    for (const modName of moduleNames) {
      const mod = modules.get(moduleKey(courseCode, termName, modName))!
      await prisma.quizModule.create({
        data: { quizId: quiz.id, moduleId: mod.id },
      })
    }

    // Link items from those modules
    const quizItemIds = new Set<string>()
    for (const modName of moduleNames) {
      const modItems = items.get(moduleKey(courseCode, termName, modName)) ?? []
      for (const item of modItems) {
        if (!quizItemIds.has(item.id)) {
          quizItemIds.add(item.id)
          await prisma.quizItem.create({ data: { quizId: quiz.id, itemId: item.id } })
        }
      }
    }

    quizzes.set(`${courseCode}::${title}`, quiz)
    return quiz
  }

  // ── BCH210 Quizzes ────────────────────────────────────────────────────────────
  const bch210Modules = [
    'Amino Acids & Proteins',
    'Enzyme Kinetics',
    'Carbohydrates & Lipids',
    'DNA Replication & Transcription',
    'Metabolism & Bioenergetics',
  ]

  await createQuiz(
    'Amino Acids & Proteins Practice',
    'BCH210', 'Fall 2024',
    10, true,
    ['Amino Acids & Proteins'],
    'REMEMBER,UNDERSTAND,APPLY',
    'instructor',
  )
  await createQuiz(
    'Midterm Prep: Modules 1-3',
    'BCH210', 'Fall 2024',
    15, true,
    ['Amino Acids & Proteins', 'Enzyme Kinetics', 'Carbohydrates & Lipids'],
    'REMEMBER,UNDERSTAND,APPLY,ANALYZE',
    'instructor',
  )
  await createQuiz(
    'Final Exam Review',
    'BCH210', 'Fall 2024',
    20, false,
    bch210Modules,
    'REMEMBER,UNDERSTAND,APPLY,ANALYZE,EVALUATE,CREATE',
    'instructor',
  )

  // ── CSC108 Quizzes ────────────────────────────────────────────────────────────
  const csc108Modules = [
    'Python Basics & Variables',
    'Control Flow & Functions',
    'Lists, Strings & Loops',
    'File I/O & Exceptions',
  ]

  await createQuiz(
    'Python Basics Quiz',
    'CSC108', 'Winter 2025',
    10, true,
    ['Python Basics & Variables'],
    'REMEMBER,UNDERSTAND,APPLY',
    'instructor',
  )
  await createQuiz(
    'Midterm Prep: Modules 1-2',
    'CSC108', 'Winter 2025',
    15, true,
    ['Python Basics & Variables', 'Control Flow & Functions'],
    'REMEMBER,UNDERSTAND,APPLY,ANALYZE',
    'instructor',
  )
  await createQuiz(
    'Final Exam Review',
    'CSC108', 'Winter 2025',
    20, false,
    csc108Modules,
    'REMEMBER,UNDERSTAND,APPLY,ANALYZE,EVALUATE,CREATE',
    'instructor',
  )

  // ── CSC207 Quizzes ────────────────────────────────────────────────────────────
  await createQuiz(
    'OOP Fundamentals Quiz',
    'CSC207', 'Fall 2024',
    8, true,
    ['Object-Oriented Design'],
    'REMEMBER,UNDERSTAND,APPLY,ANALYZE',
    'prof_kim',
  )
  await createQuiz(
    'Design Patterns & Testing Quiz',
    'CSC207', 'Fall 2024',
    8, true,
    ['Design Patterns', 'Testing & Refactoring'],
    'REMEMBER,UNDERSTAND,APPLY,ANALYZE',
    'prof_kim',
  )

  // ── CSC343 Quizzes ────────────────────────────────────────────────────────────
  await createQuiz(
    'SQL & Relational Model Quiz',
    'CSC343', 'Winter 2025',
    8, true,
    ['Relational Model & SQL'],
    'REMEMBER,UNDERSTAND,APPLY',
    'prof_kim',
  )
  await createQuiz(
    'Advanced DB Concepts Quiz',
    'CSC343', 'Winter 2025',
    8, true,
    ['Query Optimization', 'Transactions & Concurrency'],
    'REMEMBER,UNDERSTAND,APPLY,ANALYZE',
    'prof_kim',
  )

  // ── CSC369 Quiz ───────────────────────────────────────────────────────────────
  await createQuiz(
    'OS Fundamentals Quiz',
    'CSC369', 'Fall 2024',
    5, true,
    ['Processes & Threads', 'Memory Management'],
    'REMEMBER,UNDERSTAND,APPLY',
    'prof_ali',
  )

  // ── CSC373 Quiz ───────────────────────────────────────────────────────────────
  await createQuiz(
    'Algorithm Design Quiz',
    'CSC373', 'Winter 2025',
    5, true,
    ['Greedy & Divide-and-Conquer', 'Dynamic Programming & NP-Completeness'],
    'REMEMBER,UNDERSTAND,APPLY,ANALYZE',
    'prof_ali',
  )

  // ── CSC358 Quiz ───────────────────────────────────────────────────────────────
  await createQuiz(
    'Networking Fundamentals Quiz',
    'CSC358', 'Fall 2024',
    5, true,
    ['Network Layers & Protocols', 'Transport & Application Layer'],
    'REMEMBER,UNDERSTAND,APPLY',
    'prof_ali',
  )

  // ── MAT137 Quiz ───────────────────────────────────────────────────────────────
  await createQuiz(
    'Calculus Concepts Quiz',
    'MAT137', 'Winter 2025',
    5, true,
    ['Limits & Continuity', 'Differentiation & Integration'],
    'REMEMBER,UNDERSTAND,APPLY',
    'prof_ali',
  )

  console.log(`  Created ${quizzes.size} quizzes`)
  return quizzes
}
