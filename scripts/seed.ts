/**
 * Comprehensive seed script for StudyCAT.
 *
 * Covers:
 *  - 2 ultra-detailed courses: BCH210 (Fall 2024), CSC108 (Winter 2025)
 *  - 6 medium/light courses: CSC207, CSC343, CSC369, CSC373, CSC358, MAT137
 *  - 2 terms: Fall 2024, Winter 2025
 *  - ~25 users: instructor (Shibboleth primary), student (Shibboleth primary),
 *    additional instructors, TAs, and 20 students across 3 ability personas
 *  - 30-50 items per module for ultra-detailed courses, 8-15 for others
 *  - Quizzes with module scopes and item links
 *  - Rich attempt + response history with theta progression
 *
 * Run with: pnpm db:seed
 */

import { PrismaClient } from '@prisma/client'
import { cleanup } from './seed/cleanup'
import { seedUsers } from './seed/users'
import { seedTerms } from './seed/terms'
import { seedCourses } from './seed/courses'
import { seedItems } from './seed/items/index'
import { seedQuizzes } from './seed/quizzes'
import { seedEnrollments } from './seed/enrollments'
import { seedAttempts } from './seed/attempts'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting comprehensive seed...\n')

  await cleanup(prisma)

  const users = await seedUsers(prisma)
  const terms = await seedTerms(prisma)
  const { offerings, modules } = await seedCourses(prisma, terms)
  const itemsByModule = await seedItems(prisma, modules)
  const quizzes = await seedQuizzes(prisma, offerings, modules, itemsByModule, users)
  const enrollments = await seedEnrollments(prisma, users, offerings)
  await seedAttempts(prisma, enrollments, quizzes, modules, itemsByModule)

  console.log('\n✅ Seed complete!')
  console.log('\nPrimary Shibboleth users:')
  console.log('  instructor  — INSTRUCTOR in BCH210 + CSC108, STUDENT in CSC207 (dual-role)')
  console.log('  student     — STUDENT in BCH210 + CSC108 (AVERAGE persona)')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
