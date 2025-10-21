import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const main = async () => {
  console.log('🌱 Starting seed...')

  // Clean existing data (optional - comment out if you want to preserve data)
  await prisma.response.deleteMany()
  await prisma.attempt.deleteMany()
  await prisma.quizItem.deleteMany()
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

  // Create users
  const instructor = await prisma.user.create({
    data: {
      username: 'instructor1',
    },
  })

  const student1 = await prisma.user.create({
    data: {
      username: 'student1',
    },
  })

  const student2 = await prisma.user.create({
    data: {
      username: 'student2',
    },
  })

  console.log('✅ Created users')

  // Create term
  const term = await prisma.term.create({
    data: {
      name: 'Fall 2024',
      startDate: new Date('2024-09-01'),
      endDate: new Date('2024-12-15'),
    },
  })

  console.log('✅ Created term')

  // Create course
  const course = await prisma.course.create({
    data: {
      code: 'CS101',
      title: 'Introduction to Computer Science',
    },
  })

  console.log('✅ Created course')

  // Create course offering
  const offering = await prisma.courseOffering.create({
    data: {
      courseId: course.id,
      termId: term.id,
      display: 'CS101 - Fall 2024',
    },
  })

  console.log('✅ Created course offering')

  // Create modules
  const module1 = await prisma.module.create({
    data: {
      offeringId: offering.id,
      name: 'Programming Basics',
    },
  })

  const module2 = await prisma.module.create({
    data: {
      offeringId: offering.id,
      name: 'Data Structures',
    },
  })

  console.log('✅ Created modules')

  // Create enrollments
  await prisma.enrollment.createMany({
    data: [
      {
        userId: instructor.id,
        offeringId: offering.id,
        offeringRole: 'INSTRUCTOR',
      },
      {
        userId: student1.id,
        offeringId: offering.id,
        offeringRole: 'STUDENT',
      },
      {
        userId: student2.id,
        offeringId: offering.id,
        offeringRole: 'STUDENT',
      },
    ],
  })

  console.log('✅ Created enrollments')

  // Create items (questions) with options
  const item1 = await prisma.item.create({
    data: {
      courseId: course.id,
      moduleId: module1.id,
      externalQuestionId: 'Q001',
      bloom: 'REMEMBER',
      stem: 'What is a variable in programming?',
      reference: 'Chapter 2, Section 1',
      irtA: 1.2,
      irtB: -0.5,
      irtC: 0.2,
      ptBi: 0.75,
      average: 0.68,
      attemptsCount: 150,
    },
  })

  const item2 = await prisma.item.create({
    data: {
      courseId: course.id,
      moduleId: module1.id,
      externalQuestionId: 'Q002',
      bloom: 'UNDERSTAND',
      stem: 'Which of the following best describes the purpose of a loop?',
      reference: 'Chapter 3, Section 2',
      irtA: 0.8,
      irtB: 0.3,
      irtC: 0.15,
      ptBi: 0.65,
      average: 0.72,
      attemptsCount: 120,
    },
  })

  const item3 = await prisma.item.create({
    data: {
      courseId: course.id,
      moduleId: module2.id,
      externalQuestionId: 'Q003',
      bloom: 'APPLY',
      stem: 'Given the array [1, 2, 3, 4, 5], what is the result of accessing index 2?',
      reference: 'Chapter 4, Section 1',
      irtA: 1.5,
      irtB: -0.2,
      irtC: 0.1,
      ptBi: 0.85,
      average: 0.78,
      attemptsCount: 100,
    },
  })

  console.log('✅ Created items')

  // Create item options
  await prisma.itemOption.createMany({
    data: [
      // Item 1 options
      {
        itemId: item1.id,
        label: 'A',
        text: 'A storage location with a name',
        justification: 'Variables are named storage locations that hold values.',
        isCorrect: true,
      },
      {
        itemId: item1.id,
        label: 'B',
        text: 'A type of function',
        justification: 'Functions are different from variables.',
        isCorrect: false,
      },
      {
        itemId: item1.id,
        label: 'C',
        text: 'A programming language',
        justification: 'Programming languages are different from variables.',
        isCorrect: false,
      },
      {
        itemId: item1.id,
        label: 'D',
        text: 'A computer program',
        justification: 'Programs are different from variables.',
        isCorrect: false,
      },
      // Item 2 options
      {
        itemId: item2.id,
        label: 'A',
        text: 'To store data permanently',
        justification: 'Loops are for repetition, not storage.',
        isCorrect: false,
      },
      {
        itemId: item2.id,
        label: 'B',
        text: 'To repeat a block of code multiple times',
        justification: 'Loops allow code to be executed repeatedly.',
        isCorrect: true,
      },
      {
        itemId: item2.id,
        label: 'C',
        text: 'To define a new function',
        justification: 'Functions are defined differently.',
        isCorrect: false,
      },
      {
        itemId: item2.id,
        label: 'D',
        text: 'To handle errors',
        justification: 'Error handling is different from loops.',
        isCorrect: false,
      },
      // Item 3 options
      {
        itemId: item3.id,
        label: 'A',
        text: '1',
        justification: 'Index 0 would be 1, but we want index 2.',
        isCorrect: false,
      },
      {
        itemId: item3.id,
        label: 'B',
        text: '2',
        justification: 'Index 1 would be 2, but we want index 2.',
        isCorrect: false,
      },
      {
        itemId: item3.id,
        label: 'C',
        text: '3',
        justification: 'Index 2 corresponds to the third element, which is 3.',
        isCorrect: true,
      },
      {
        itemId: item3.id,
        label: 'D',
        text: '4',
        justification: 'Index 3 would be 4, but we want index 2.',
        isCorrect: false,
      },
    ],
  })

  console.log('✅ Created item options')

  // Create quiz
  const quiz = await prisma.quiz.create({
    data: {
      offeringId: offering.id,
      title: 'Programming Basics Quiz',
      fixedLength: 3,
      includedModuleIds: [module1.id, module2.id],
      includedBlooms: ['REMEMBER', 'UNDERSTAND', 'APPLY'],
      createdById: instructor.id,
    },
  })

  console.log('✅ Created quiz')

  // Link items to quiz
  await prisma.quizItem.createMany({
    data: [
      {
        quizId: quiz.id,
        itemId: item1.id,
      },
      {
        quizId: quiz.id,
        itemId: item2.id,
      },
      {
        quizId: quiz.id,
        itemId: item3.id,
      },
    ],
  })

  console.log('✅ Linked items to quiz')

  // Create a completed attempt for student1
  const attempt = await prisma.attempt.create({
    data: {
      quizId: quiz.id,
      userId: student1.id,
      startedAt: new Date('2024-10-01T10:00:00Z'),
      finishedAt: new Date('2024-10-01T10:15:00Z'),
      status: 'COMPLETED',
      fixedLengthN: 3,
      engineVersion: '1.0.0',
      scopeSnapshot: {
        includedModuleIds: [module1.id, module2.id],
        includedBlooms: ['REMEMBER', 'UNDERSTAND', 'APPLY'],
        eligibleItemIds: [item1.id, item2.id, item3.id],
      },
      engineMasteryAtFinish: {
        [module1.id]: 0.8,
        [module2.id]: 0.6,
      },
    },
  })

  console.log('✅ Created attempt')

  // Get the correct options for responses
  const correctOption1 = await prisma.itemOption.findFirst({
    where: { itemId: item1.id, isCorrect: true },
  })
  const correctOption2 = await prisma.itemOption.findFirst({
    where: { itemId: item2.id, isCorrect: true },
  })
  const correctOption3 = await prisma.itemOption.findFirst({
    where: { itemId: item3.id, isCorrect: true },
  })

  // Create responses for the attempt
  await prisma.response.createMany({
    data: [
      {
        attemptId: attempt.id,
        itemId: item1.id,
        selectedLabel: 'A',
        itemOptionId: correctOption1?.id,
        isCorrect: true,
        askedAt: new Date('2024-10-01T10:00:00Z'),
        answeredAt: new Date('2024-10-01T10:02:30Z'),
        responseTimeMs: 150000, // 2.5 minutes
        engineMasterySnapshot: {
          [module1.id]: 0.7,
        },
      },
      {
        attemptId: attempt.id,
        itemId: item2.id,
        selectedLabel: 'B',
        itemOptionId: correctOption2?.id,
        isCorrect: true,
        askedAt: new Date('2024-10-01T10:03:00Z'),
        answeredAt: new Date('2024-10-01T10:06:45Z'),
        responseTimeMs: 225000, // 3.75 minutes
        engineMasterySnapshot: {
          [module1.id]: 0.8,
        },
      },
      {
        attemptId: attempt.id,
        itemId: item3.id,
        selectedLabel: 'C',
        itemOptionId: correctOption3?.id,
        isCorrect: true,
        askedAt: new Date('2024-10-01T10:07:00Z'),
        answeredAt: new Date('2024-10-01T10:10:15Z'),
        responseTimeMs: 195000, // 3.25 minutes
        engineMasterySnapshot: {
          [module1.id]: 0.8,
          [module2.id]: 0.6,
        },
      },
    ],
  })

  console.log('✅ Created responses')

  console.log('🎉 Seed completed successfully!')
  console.log('\n📊 Summary:')
  console.log(`- Users: 3 (1 instructor, 2 students)`)
  console.log(`- Course: CS101 - Introduction to Computer Science`)
  console.log(`- Term: Fall 2024`)
  console.log(`- Items: 3 questions with 4 options each`)
  console.log(`- Quiz: Programming Basics Quiz (3 questions)`)
  console.log(`- Attempt: 1 completed attempt by student1`)
  console.log(`- Responses: 3 responses (all correct)`)
  console.log('\n🔑 Test credentials:')
  console.log('- Instructor: instructor1')
  console.log('- Students: student1, student2')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
