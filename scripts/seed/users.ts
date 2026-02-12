import { PrismaClient, User } from '@prisma/client'
import { StudentDef } from './types'

// Shibboleth-compatible primary users (username must match IdP uid)
export const PRIMARY_INSTRUCTOR = { username: 'instructor', givenName: 'Alice', familyName: 'Chen' }
export const PRIMARY_STUDENT = { username: 'student', givenName: 'Bob', familyName: 'Smith' }

export const ADDITIONAL_INSTRUCTORS = [
  { username: 'prof_kim', givenName: 'Jae', familyName: 'Kim' },
  { username: 'prof_ali', givenName: 'Fatima', familyName: 'Ali' },
]

export const TAS = [
  { username: 'ta_jones', givenName: 'Marcus', familyName: 'Jones' },
  { username: 'ta_park', givenName: 'Soo', familyName: 'Park' },
]

export const STUDENTS: StudentDef[] = [
  // WEAK persona (5)
  { username: 'student_02', givenName: 'Chloe', familyName: 'Brown', persona: 'WEAK' },
  { username: 'student_03', givenName: 'Ethan', familyName: 'Davis', persona: 'WEAK' },
  { username: 'student_04', givenName: 'Grace', familyName: 'Wilson', persona: 'WEAK' },
  { username: 'student_05', givenName: 'Henry', familyName: 'Taylor', persona: 'WEAK' },
  { username: 'student_06', givenName: 'Isabella', familyName: 'Martinez', persona: 'WEAK' },
  // AVERAGE persona (10, includes primary student)
  { username: 'student', givenName: 'Bob', familyName: 'Smith', persona: 'AVERAGE' },
  { username: 'student_07', givenName: 'James', familyName: 'Anderson', persona: 'AVERAGE' },
  { username: 'student_08', givenName: 'Lily', familyName: 'Thomas', persona: 'AVERAGE' },
  { username: 'student_09', givenName: 'Noah', familyName: 'Jackson', persona: 'AVERAGE' },
  { username: 'student_10', givenName: 'Olivia', familyName: 'White', persona: 'AVERAGE' },
  { username: 'student_11', givenName: 'Parker', familyName: 'Harris', persona: 'AVERAGE' },
  { username: 'student_12', givenName: 'Quinn', familyName: 'Clark', persona: 'AVERAGE' },
  { username: 'student_13', givenName: 'Ryan', familyName: 'Lewis', persona: 'AVERAGE' },
  { username: 'student_14', givenName: 'Sofia', familyName: 'Robinson', persona: 'AVERAGE' },
  { username: 'student_15', givenName: 'Tyler', familyName: 'Walker', persona: 'AVERAGE' },
  // STRONG persona (5)
  { username: 'student_16', givenName: 'Uma', familyName: 'Hall', persona: 'STRONG' },
  { username: 'student_17', givenName: 'Victor', familyName: 'Allen', persona: 'STRONG' },
  { username: 'student_18', givenName: 'Wendy', familyName: 'Young', persona: 'STRONG' },
  { username: 'student_19', givenName: 'Xander', familyName: 'King', persona: 'STRONG' },
  { username: 'student_20', givenName: 'Yara', familyName: 'Wright', persona: 'STRONG' },
]

export async function seedUsers(prisma: PrismaClient): Promise<Map<string, User>> {
  console.log('👤 Seeding users...')
  const allUserDefs = [
    PRIMARY_INSTRUCTOR,
    ...ADDITIONAL_INSTRUCTORS,
    ...TAS,
    ...STUDENTS.map(s => ({ username: s.username, givenName: s.givenName, familyName: s.familyName })),
  ]

  // Deduplicate by username (student appears in both PRIMARY_STUDENT and STUDENTS)
  const uniqueDefs = Array.from(new Map(allUserDefs.map(u => [u.username, u])).values())

  const users = new Map<string, User>()
  for (const def of uniqueDefs) {
    const user = await prisma.user.upsert({
      where: { username: def.username },
      update: { givenName: def.givenName, familyName: def.familyName },
      create: { username: def.username, givenName: def.givenName, familyName: def.familyName },
    })
    users.set(user.username, user)
  }
  console.log(`  Created ${users.size} users`)
  return users
}
