import { PrismaClient, Item, Module } from '@prisma/client'
import { BCH210_ITEMS } from './bch210'
import { CSC108_ITEMS } from './csc108'
import { OTHER_COURSE_ITEMS } from './other-courses'
import type { ItemDef } from '../types'

const ALL_ITEMS: ItemDef[] = [...BCH210_ITEMS, ...CSC108_ITEMS, ...OTHER_COURSE_ITEMS]

export async function seedItems(
  prisma: PrismaClient,
  modules: Map<string, Module>,
): Promise<Map<string, Item[]>> {
  console.log('📖 Seeding items...')
  const itemsByModule = new Map<string, Item[]>()

  // Build courseId lookup: we need to find the course for each module
  // Module key format: "{courseCode}_{termName}::{moduleName}"
  // We'll look up courseId from the module's offering
  const allModules = Array.from(modules.values())
  const offeringIds = [...new Set(allModules.map(m => m.offeringId))]
  const offeringsWithCourse = await prisma.courseOffering.findMany({
    where: { id: { in: offeringIds } },
    include: { course: true },
  })
  const courseByOfferingId = new Map<string, string>() // offeringId -> courseId
  for (const o of offeringsWithCourse) {
    courseByOfferingId.set(o.id, o.courseId)
  }

  let created = 0
  for (const def of ALL_ITEMS) {
    const mod = modules.get(def.moduleKey)
    if (!mod) {
      console.warn(`  ⚠️  Module not found for key: ${def.moduleKey}`)
      continue
    }
    const courseId = courseByOfferingId.get(mod.offeringId)
    if (!courseId) {
      console.warn(`  ⚠️  Course not found for module: ${def.moduleKey}`)
      continue
    }

    const item = await prisma.item.upsert({
      where: { courseId_externalQuestionId: { courseId, externalQuestionId: def.externalQuestionId } },
      update: {},
      create: {
        courseId,
        moduleId: mod.id,
        externalQuestionId: def.externalQuestionId,
        bloom: def.bloom,
        stem: def.stem,
        reference: def.reference,
        irtA: def.irtA,
        irtB: def.irtB,
        irtC: def.irtC,
        active: true,
      },
    })

    // Create options (only if item was newly created)
    const existingOptions = await prisma.itemOption.count({ where: { itemId: item.id } })
    if (existingOptions === 0) {
      for (const opt of def.options) {
        await prisma.itemOption.create({
          data: {
            itemId: item.id,
            label: opt.label,
            text: opt.text,
            justification: opt.justification,
            isCorrect: opt.isCorrect,
          },
        })
      }
    }

    if (!itemsByModule.has(def.moduleKey)) itemsByModule.set(def.moduleKey, [])
    itemsByModule.get(def.moduleKey)!.push(item)
    created++
  }

  console.log(`  Created ${created} items across ${itemsByModule.size} modules`)
  return itemsByModule
}
