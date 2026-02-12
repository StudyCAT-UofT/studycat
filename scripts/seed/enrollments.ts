import { PrismaClient, Enrollment, CourseOffering, User } from '@prisma/client'
import { offeringKey } from './courses'

export interface EnrollmentRecord {
  enrollment: Enrollment
  username: string
  offeringKey: string
  role: string
}

export async function seedEnrollments(
  prisma: PrismaClient,
  users: Map<string, User>,
  offerings: Map<string, CourseOffering>,
): Promise<Map<string, Enrollment>> {
  console.log('📋 Seeding enrollments...')
  const enrollments = new Map<string, Enrollment>()

  async function enroll(username: string, courseCode: string, termName: string, role: string) {
    const user = users.get(username)
    if (!user) throw new Error(`User not found: ${username}`)
    const offering = offerings.get(offeringKey(courseCode, termName))
    if (!offering) throw new Error(`Offering not found: ${courseCode} ${termName}`)

    const enrollment = await prisma.enrollment.upsert({
      where: { userId_offeringId: { userId: user.id, offeringId: offering.id } },
      update: {},
      create: { userId: user.id, offeringId: offering.id, offeringRole: role },
    })
    const key = `${username}::${offeringKey(courseCode, termName)}`
    enrollments.set(key, enrollment)
  }

  // ── Instructors ──────────────────────────────────────────────────────────────
  // Primary instructor: INSTRUCTOR in BCH210 + CSC108, STUDENT in CSC207 (dual-role)
  await enroll('instructor', 'BCH210', 'Fall 2024', 'INSTRUCTOR')
  await enroll('instructor', 'CSC108', 'Winter 2025', 'INSTRUCTOR')
  await enroll('instructor', 'CSC207', 'Fall 2024', 'STUDENT') // dual-role demo

  await enroll('prof_kim', 'CSC207', 'Fall 2024', 'INSTRUCTOR')
  await enroll('prof_kim', 'CSC343', 'Winter 2025', 'INSTRUCTOR')

  await enroll('prof_ali', 'CSC369', 'Fall 2024', 'INSTRUCTOR')
  await enroll('prof_ali', 'CSC373', 'Winter 2025', 'INSTRUCTOR')
  await enroll('prof_ali', 'CSC358', 'Fall 2024', 'INSTRUCTOR')
  await enroll('prof_ali', 'MAT137', 'Winter 2025', 'INSTRUCTOR')

  // ── TAs ──────────────────────────────────────────────────────────────────────
  await enroll('ta_jones', 'BCH210', 'Fall 2024', 'TA')
  await enroll('ta_park', 'CSC108', 'Winter 2025', 'TA')

  // ── Students ─────────────────────────────────────────────────────────────────
  // BCH210 only (students 02-06, minus overlap below)
  await enroll('student_02', 'BCH210', 'Fall 2024', 'STUDENT')
  await enroll('student_03', 'BCH210', 'Fall 2024', 'STUDENT')
  await enroll('student_04', 'BCH210', 'Fall 2024', 'STUDENT')
  await enroll('student_05', 'BCH210', 'Fall 2024', 'STUDENT')

  // CSC108 only (students 07-10)
  await enroll('student_07', 'CSC108', 'Winter 2025', 'STUDENT')
  await enroll('student_08', 'CSC108', 'Winter 2025', 'STUDENT')
  await enroll('student_09', 'CSC108', 'Winter 2025', 'STUDENT')
  await enroll('student_10', 'CSC108', 'Winter 2025', 'STUDENT')

  // Both BCH210 + CSC108 (primary student + students 11-14)
  await enroll('student', 'BCH210', 'Fall 2024', 'STUDENT')
  await enroll('student', 'CSC108', 'Winter 2025', 'STUDENT')
  await enroll('student_11', 'BCH210', 'Fall 2024', 'STUDENT')
  await enroll('student_11', 'CSC108', 'Winter 2025', 'STUDENT')
  await enroll('student_12', 'BCH210', 'Fall 2024', 'STUDENT')
  await enroll('student_12', 'CSC108', 'Winter 2025', 'STUDENT')
  await enroll('student_13', 'BCH210', 'Fall 2024', 'STUDENT')
  await enroll('student_13', 'CSC108', 'Winter 2025', 'STUDENT')
  await enroll('student_14', 'BCH210', 'Fall 2024', 'STUDENT')
  await enroll('student_14', 'CSC108', 'Winter 2025', 'STUDENT')

  // Lighter courses (students 15-20)
  await enroll('student_06', 'CSC207', 'Fall 2024', 'STUDENT')
  await enroll('student_15', 'CSC207', 'Fall 2024', 'STUDENT')
  await enroll('student_16', 'CSC207', 'Fall 2024', 'STUDENT')
  await enroll('student_17', 'CSC343', 'Winter 2025', 'STUDENT')
  await enroll('student_18', 'CSC343', 'Winter 2025', 'STUDENT')
  await enroll('student_19', 'CSC369', 'Fall 2024', 'STUDENT')
  await enroll('student_20', 'CSC369', 'Fall 2024', 'STUDENT')

  // Strong students in ultra-detailed courses too
  await enroll('student_16', 'BCH210', 'Fall 2024', 'STUDENT')
  await enroll('student_17', 'CSC108', 'Winter 2025', 'STUDENT')
  await enroll('student_18', 'BCH210', 'Fall 2024', 'STUDENT')
  await enroll('student_19', 'CSC108', 'Winter 2025', 'STUDENT')
  await enroll('student_20', 'BCH210', 'Fall 2024', 'STUDENT')

  console.log(`  Created ${enrollments.size} enrollments`)
  return enrollments
}
