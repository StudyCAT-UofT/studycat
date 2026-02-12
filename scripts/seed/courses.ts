import { PrismaClient, Course, CourseOffering, Module, Term } from '@prisma/client'

export interface CourseDef {
  code: string
  title: string
  termName: string
  display?: string
  modules: string[]
}

export const COURSE_DEFS: CourseDef[] = [
  // Ultra-detailed courses
  {
    code: 'BCH210',
    title: 'Biochemistry I',
    termName: 'Fall 2024',
    display: 'BCH210 - Fall 2024',
    modules: [
      'Amino Acids & Proteins',
      'Enzyme Kinetics',
      'Carbohydrates & Lipids',
      'DNA Replication & Transcription',
      'Metabolism & Bioenergetics',
    ],
  },
  {
    code: 'CSC108',
    title: 'Introduction to Computer Science',
    termName: 'Winter 2025',
    display: 'CSC108 - Winter 2025',
    modules: [
      'Python Basics & Variables',
      'Control Flow & Functions',
      'Lists, Strings & Loops',
      'File I/O & Exceptions',
    ],
  },
  // Medium-detail courses
  {
    code: 'CSC207',
    title: 'Software Design',
    termName: 'Fall 2024',
    display: 'CSC207 - Fall 2024',
    modules: ['Object-Oriented Design', 'Design Patterns', 'Testing & Refactoring'],
  },
  {
    code: 'CSC343',
    title: 'Introduction to Databases',
    termName: 'Winter 2025',
    display: 'CSC343 - Winter 2025',
    modules: ['Relational Model & SQL', 'Query Optimization', 'Transactions & Concurrency'],
  },
  // Light courses
  {
    code: 'CSC369',
    title: 'Operating Systems',
    termName: 'Fall 2024',
    display: 'CSC369 - Fall 2024',
    modules: ['Processes & Threads', 'Memory Management'],
  },
  {
    code: 'CSC373',
    title: 'Algorithm Design & Analysis',
    termName: 'Winter 2025',
    display: 'CSC373 - Winter 2025',
    modules: ['Greedy & Divide-and-Conquer', 'Dynamic Programming & NP-Completeness'],
  },
  {
    code: 'CSC358',
    title: 'Introduction to Computer Networks',
    termName: 'Fall 2024',
    display: 'CSC358 - Fall 2024',
    modules: ['Network Layers & Protocols', 'Transport & Application Layer'],
  },
  {
    code: 'MAT137',
    title: 'Calculus with Proofs',
    termName: 'Winter 2025',
    display: 'MAT137 - Winter 2025',
    modules: ['Limits & Continuity', 'Differentiation & Integration'],
  },
]

export interface CourseSeeds {
  courses: Map<string, Course>
  offerings: Map<string, CourseOffering>
  modules: Map<string, Module>
}

/** Offering key: "{courseCode}_{termName}" */
export function offeringKey(courseCode: string, termName: string): string {
  return `${courseCode}_${termName}`
}

/** Module key: "{offeringKey}::{moduleName}" */
export function moduleKey(courseCode: string, termName: string, moduleName: string): string {
  return `${offeringKey(courseCode, termName)}::${moduleName}`
}

export async function seedCourses(
  prisma: PrismaClient,
  terms: Map<string, Term>,
): Promise<CourseSeeds> {
  console.log('📚 Seeding courses, offerings, and modules...')
  const courses = new Map<string, Course>()
  const offerings = new Map<string, CourseOffering>()
  const modules = new Map<string, Module>()

  for (const def of COURSE_DEFS) {
    const term = terms.get(def.termName)!

    // Course
    const course = await prisma.course.upsert({
      where: { code_title: { code: def.code, title: def.title } },
      update: {},
      create: { code: def.code, title: def.title },
    })
    courses.set(def.code, course)

    // Offering
    const offering = await prisma.courseOffering.upsert({
      where: { courseId_termId: { courseId: course.id, termId: term.id } },
      update: {},
      create: { courseId: course.id, termId: term.id, display: def.display },
    })
    offerings.set(offeringKey(def.code, def.termName), offering)

    // Modules
    for (const modName of def.modules) {
      const mod = await prisma.module.upsert({
        where: { offeringId_name: { offeringId: offering.id, name: modName } },
        update: {},
        create: { offeringId: offering.id, name: modName },
      })
      modules.set(moduleKey(def.code, def.termName, modName), mod)
    }
  }

  console.log(`  Created ${courses.size} courses, ${offerings.size} offerings, ${modules.size} modules`)
  return { courses, offerings, modules }
}
