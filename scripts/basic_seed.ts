import { PrismaClient, Module, Item } from '@prisma/client'

const prisma = new PrismaClient()

// --- Helpers ---

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function getRandomSubset<T>(array: T[], count: number): T[] {
  const shuffled = array.slice().sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}

// --- Enums as Objects (since they are strings in Schema) ---
const BloomCategory = {
  REMEMBER: 'REMEMBER',
  UNDERSTAND: 'UNDERSTAND',
  APPLY: 'APPLY',
  ANALYZE: 'ANALYZE',
  EVALUATE: 'EVALUATE',
  CREATE: 'CREATE'
}

const OptionLabel = {
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D'
}

// --- Enums as Objects (AttemptStatus is not an Enum in schema) ---
const AttemptStatus = {
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  ABANDONED: 'ABANDONED'
}

// --- Main ---

async function main() {
  console.log('🌱 Starting comprehensive seed...')

  // 1. Cleanup (Correct Order)
  console.log('🧹 Cleaning up database...')
  await prisma.response.deleteMany()
  await prisma.attempt.deleteMany()
  await prisma.quizItem.deleteMany()
  await prisma.quizModule.deleteMany()
  await prisma.quiz.deleteMany()
  await prisma.itemOption.deleteMany()
  await prisma.item.deleteMany()
  await prisma.theta.deleteMany()
  await prisma.module.deleteMany()
  await prisma.enrollment.deleteMany()
  await prisma.courseOffering.deleteMany()
  await prisma.course.deleteMany()
  await prisma.term.deleteMany()
  await prisma.user.deleteMany()

  // 2. Create Users
  console.log('👤 Creating users...')
  const student = await prisma.user.create({ data: { username: 'student', givenName: 'Test', familyName: 'Student' } })
  const instructor = await prisma.user.create({ data: { username: 'instructor', givenName: 'Prof', familyName: 'Instructor' } })
  const admin = await prisma.user.create({ data: { username: 'admin', givenName: 'Sys', familyName: 'Admin' } })

  // Dummy users for "Multiple Users" requirement
  const alice = await prisma.user.create({ data: { username: 'alice', givenName: 'Alice', familyName: 'Wonderland' } })
  const bob = await prisma.user.create({ data: { username: 'bob', givenName: 'Bob', familyName: 'Builder' } })
  const charlie = await prisma.user.create({ data: { username: 'charlie', givenName: 'Charlie', familyName: 'Chocolate' } })

  const allStudents = [student, alice, bob, charlie]

  // 3. Create Structure (Term, Course, Offering)
  console.log('🏫 Creating courses...')
  const term = await prisma.term.create({
    data: { name: 'Fall 2024', startDate: new Date('2024-09-01'), endDate: new Date('2024-12-31') }
  })

  // Course 1: CSC101 (The main active course)
  const csc101 = await prisma.course.create({ data: { code: 'CSC101', title: 'Intro to Computer Science' } })
  const off101 = await prisma.courseOffering.create({
    data: { courseId: csc101.id, termId: term.id, display: 'CSC101 - Fall 2024' }
  })

  // Course 2: CSC207 (For Dual Role: Instructor is a student here)
  const csc207 = await prisma.course.create({ data: { code: 'CSC207', title: 'Software Design' } })
  const off207 = await prisma.courseOffering.create({
    data: { courseId: csc207.id, termId: term.id, display: 'CSC207 - Fall 2024' }
  })

  // Course 3: CSC343 (Another course)
  const csc343 = await prisma.course.create({ data: { code: 'CSC343', title: 'Introduction to Databases' } })
  const off343 = await prisma.courseOffering.create({
    data: { courseId: csc343.id, termId: term.id, display: 'CSC343 - Fall 2024' }
  })

  // 4. Enrollments
  console.log('📝 Enrolling users...')

  // CSC101: Instructor teaches, everyone else is a student
  await prisma.enrollment.create({ data: { userId: instructor.id, offeringId: off101.id, offeringRole: 'INSTRUCTOR' } })
  for (const s of allStudents) {
    await prisma.enrollment.create({ data: { userId: s.id, offeringId: off101.id, offeringRole: 'STUDENT' } })
  }

  // CSC207: Dual Role! Instructor is a STUDENT here. Admin teaches (just to fill the slot).
  await prisma.enrollment.create({ data: { userId: admin.id, offeringId: off207.id, offeringRole: 'INSTRUCTOR' } })
  await prisma.enrollment.create({ data: { userId: instructor.id, offeringId: off207.id, offeringRole: 'STUDENT' } }) // <--- Dual Role
  await prisma.enrollment.create({ data: { userId: student.id, offeringId: off207.id, offeringRole: 'STUDENT' } })

  // CSC343: Just admin as student, random setup
  await prisma.enrollment.create({ data: { userId: admin.id, offeringId: off343.id, offeringRole: 'STUDENT' } })


  // 5. Content Generation (Modules, Items)
  console.log('📚 Generating component content...')

  // Defines a reusable Content Schema
  const contentSpecs = [
    {
      offering: off101,
      course: csc101,
      modules: [
        { name: 'Variables & Types', topic: 'Programming' },
        { name: 'Control Flow', topic: 'Logic' },
        { name: 'Functions', topic: 'Abstraction' }
      ]
    },
    {
      offering: off207,
      course: csc207,
      modules: [
        { name: 'Design Patterns', topic: 'Architecture' },
        { name: 'Clean Code', topic: 'Style' }
      ]
    }
  ]

  // Track created items for quiz generation
  const createdModules: Module[] = []
  const createdItems: Item[] = []

  for (const spec of contentSpecs) {
    for (const modSpec of spec.modules) {
      const mod = await prisma.module.create({
        data: { offeringId: spec.offering.id, name: modSpec.name }
      })
      createdModules.push(mod)

      // Create 5-8 items per module
      const itemCount = getRandomInt(5, 8)
      for (let i = 0; i < itemCount; i++) {
        const item = await prisma.item.create({
          data: {
            courseId: spec.course.id,
            moduleId: mod.id,
            externalQuestionId: `${spec.course.code}-${modSpec.topic}-${i}`,
            bloom: Object.values(BloomCategory)[getRandomInt(0, 5)] as string, // Random Bloom
            stem: `Question about ${modSpec.topic} #${i + 1} in ${modSpec.name}`,
            reference: `Lecture ${getRandomInt(1, 10)}`,
            irtA: Math.random() * 2,
            irtB: Math.random() * 2 - 1,
            irtC: Math.random() * 0.25,
            ptBi: Math.random(),
            average: Math.random(),
            attemptsCount: getRandomInt(0, 100)
          }
        })
        createdItems.push(item)

        // Create 4 Options
        const labels = [OptionLabel.A, OptionLabel.B, OptionLabel.C, OptionLabel.D]
        const correctIdx = getRandomInt(0, 3)

        for (let j = 0; j < 4; j++) {
          await prisma.itemOption.create({
            data: {
              itemId: item.id,
              label: labels[j],
              text: `Option ${labels[j]} for ${item.externalQuestionId}`,
              isCorrect: j === correctIdx,
              justification: j === correctIdx ? 'This is correct because...' : 'Incorrect.'
            }
          })
        }
      }
    }
  }

  // 6. Quizzes
  console.log('📝 Creating quizzes...')

  // CSC101 Quizzes
  const off101Modules = createdModules.filter((m) => m.offeringId === off101.id)

  // Quiz 1: Midterm (Active)
  const quiz1 = await prisma.quiz.create({
    data: {
      offeringId: off101.id,
      title: 'Midterm Exam',
      active: true,
      fixedLength: 5,
      createdById: instructor.id,
      quizModules: {
        create: off101Modules.map((m) => ({ moduleId: m.id, masteryThreshold: 0.7 }))
      }
    }
  })

  // Quiz 2: Practice (Inactive)
  await prisma.quiz.create({
    data: {
      offeringId: off101.id,
      title: 'Practice Quiz (Old)',
      active: false,
      fixedLength: 3,
      createdById: instructor.id,
      quizModules: {
        create: [{ moduleId: off101Modules[0].id, masteryThreshold: 0.7 }] // Just first module
      }
    }
  })

  // Link Items to Quizzes
  // For simplicity, link all items from relevant modules to the quiz
  const quiz1Items = await prisma.item.findMany({ where: { moduleId: { in: off101Modules.map((m) => m.id) } } })
  const quiz1Selection = getRandomSubset(quiz1Items, 10) // Select 10 random items from pool
  await prisma.quizItem.createMany({
    data: quiz1Selection.map(item => ({ quizId: quiz1.id, itemId: item.id }))
  })


  // 7. Attempts & Responses
  console.log('✍️ Simulating student attempts...')

  // Find users enrolled in 101 (students)
  const students101 = await prisma.enrollment.findMany({
    where: { offeringId: off101.id, offeringRole: 'STUDENT' },
    include: { user: true }
  })

  for (const enroll of students101) {
    // 70% chance to have taken the quiz
    if (Math.random() > 0.3) {
      const attempt = await prisma.attempt.create({
        data: {
          quizId: quiz1.id,
          enrollmentId: enroll.id,
          status: AttemptStatus.COMPLETED,
          fixedLengthN: 5,
          startedAt: new Date(Date.now() - getRandomInt(0, 10000000)),
          finishedAt: new Date(),
        }
      })

      // Generate responses for the 5 items (subset of the quiz items)
      const attemptItems = getRandomSubset(quiz1Selection, 5)
      for (const item of attemptItems) {
        const options = await prisma.itemOption.findMany({ where: { itemId: item.id } })
        const selected = options[getRandomInt(0, 3)]

        await prisma.response.create({
          data: {
            attemptId: attempt.id,
            itemId: item.id,
            selectedLabel: selected.label,
            itemOptionId: selected.id,
            isCorrect: selected.isCorrect,
            askedAt: new Date(),
            answeredAt: new Date(),
            responseTimeMs: getRandomInt(1000, 30000)
          }
        })
      }
      console.log(`   -> Attempt recorded for ${enroll.user.username}`)
    }
  }

  // Dual Role Check: Make sure Instructor (as Student in 207) has no attempts yet (or maybe 1)
  // Let's verify data in logs
  console.log('✅ Seed complete!')
  console.log('-----------------------------------')
  console.log('Credentials to test:')
  console.log('1. student (enrolled in 101, 207)')
  console.log('2. instructor (INSTRUCTOR in 101, STUDENT in 207)')
  console.log('3. admin (STUDENT in 343)')
  console.log('-----------------------------------')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
