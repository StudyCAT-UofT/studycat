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

  // Additional Programming Basics questions
  const item4 = await prisma.item.create({
    data: {
      courseId: course.id,
      moduleId: module1.id,
      externalQuestionId: 'Q004',
      bloom: 'REMEMBER',
      stem: 'What is the purpose of comments in code?',
      reference: 'Chapter 2, Section 3',
      irtA: 0.9,
      irtB: -0.8,
      irtC: 0.25,
      ptBi: 0.70,
      average: 0.65,
      attemptsCount: 140,
    },
  })

  const item5 = await prisma.item.create({
    data: {
      courseId: course.id,
      moduleId: module1.id,
      externalQuestionId: 'Q005',
      bloom: 'UNDERSTAND',
      stem: 'What happens when you divide by zero in most programming languages?',
      reference: 'Chapter 3, Section 1',
      irtA: 1.1,
      irtB: 0.5,
      irtC: 0.2,
      ptBi: 0.60,
      average: 0.55,
      attemptsCount: 110,
    },
  })

  const item6 = await prisma.item.create({
    data: {
      courseId: course.id,
      moduleId: module1.id,
      externalQuestionId: 'Q006',
      bloom: 'APPLY',
      stem: 'Which operator would you use to check if two values are equal?',
      reference: 'Chapter 3, Section 3',
      irtA: 1.3,
      irtB: -0.3,
      irtC: 0.15,
      ptBi: 0.80,
      average: 0.75,
      attemptsCount: 130,
    },
  })

  // Additional Data Structures questions
  const item7 = await prisma.item.create({
    data: {
      courseId: course.id,
      moduleId: module2.id,
      externalQuestionId: 'Q007',
      bloom: 'REMEMBER',
      stem: 'What is the main advantage of using an array?',
      reference: 'Chapter 4, Section 2',
      irtA: 1.0,
      irtB: -0.6,
      irtC: 0.2,
      ptBi: 0.75,
      average: 0.70,
      attemptsCount: 125,
    },
  })

  const item8 = await prisma.item.create({
    data: {
      courseId: course.id,
      moduleId: module2.id,
      externalQuestionId: 'Q008',
      bloom: 'UNDERSTAND',
      stem: 'What is the time complexity of accessing an element by index in an array?',
      reference: 'Chapter 4, Section 3',
      irtA: 1.4,
      irtB: 0.2,
      irtC: 0.1,
      ptBi: 0.85,
      average: 0.80,
      attemptsCount: 95,
    },
  })

  const item9 = await prisma.item.create({
    data: {
      courseId: course.id,
      moduleId: module2.id,
      externalQuestionId: 'Q009',
      bloom: 'APPLY',
      stem: 'If you have an array of size 10, what is the valid range of indices?',
      reference: 'Chapter 4, Section 1',
      irtA: 1.2,
      irtB: -0.4,
      irtC: 0.15,
      ptBi: 0.78,
      average: 0.73,
      attemptsCount: 115,
    },
  })

  const item10 = await prisma.item.create({
    data: {
      courseId: course.id,
      moduleId: module1.id,
      externalQuestionId: 'Q010',
      bloom: 'ANALYZE',
      stem: 'Given the code: int x = 5; int y = x++; What is the value of y?',
      reference: 'Chapter 3, Section 4',
      irtA: 1.6,
      irtB: 0.8,
      irtC: 0.05,
      ptBi: 0.90,
      average: 0.85,
      attemptsCount: 80,
    },
  })

  const item11 = await prisma.item.create({
    data: {
      courseId: course.id,
      moduleId: module2.id,
      externalQuestionId: 'Q011',
      bloom: 'EVALUATE',
      stem: 'Which data structure would be most efficient for implementing a stack?',
      reference: 'Chapter 5, Section 1',
      irtA: 1.8,
      irtB: 1.2,
      irtC: 0.1,
      ptBi: 0.95,
      average: 0.88,
      attemptsCount: 70,
    },
  })

  const item12 = await prisma.item.create({
    data: {
      courseId: course.id,
      moduleId: module1.id,
      externalQuestionId: 'Q012',
      bloom: 'CREATE',
      stem: 'What would be the result of this expression: (5 + 3) * 2 - 4?',
      reference: 'Chapter 2, Section 2',
      irtA: 1.5,
      irtB: 0.0,
      irtC: 0.1,
      ptBi: 0.82,
      average: 0.77,
      attemptsCount: 105,
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
      // Item 4 options
      {
        itemId: item4.id,
        label: 'A',
        text: 'To make the code run faster',
        justification: 'Comments do not affect code execution speed.',
        isCorrect: false,
      },
      {
        itemId: item4.id,
        label: 'B',
        text: 'To explain what the code does',
        justification: 'Comments provide documentation and explanation for code.',
        isCorrect: true,
      },
      {
        itemId: item4.id,
        label: 'C',
        text: 'To store data',
        justification: 'Comments are not used for data storage.',
        isCorrect: false,
      },
      {
        itemId: item4.id,
        label: 'D',
        text: 'To create variables',
        justification: 'Comments are not used to create variables.',
        isCorrect: false,
      },
      // Item 5 options
      {
        itemId: item5.id,
        label: 'A',
        text: 'The result is infinity',
        justification: 'Division by zero typically causes an error, not infinity.',
        isCorrect: false,
      },
      {
        itemId: item5.id,
        label: 'B',
        text: 'The program crashes or throws an error',
        justification: 'Division by zero typically causes a runtime error.',
        isCorrect: true,
      },
      {
        itemId: item5.id,
        label: 'C',
        text: 'The result is 0',
        justification: 'Division by zero does not result in 0.',
        isCorrect: false,
      },
      {
        itemId: item5.id,
        label: 'D',
        text: 'The result is undefined',
        justification: 'While mathematically undefined, programs typically error instead.',
        isCorrect: false,
      },
      // Item 6 options
      {
        itemId: item6.id,
        label: 'A',
        text: '=',
        justification: 'The assignment operator assigns values, not compares them.',
        isCorrect: false,
      },
      {
        itemId: item6.id,
        label: 'B',
        text: '==',
        justification: 'The equality operator (==) checks if two values are equal.',
        isCorrect: true,
      },
      {
        itemId: item6.id,
        label: 'C',
        text: '!=',
        justification: 'The inequality operator (!=) checks if values are NOT equal.',
        isCorrect: false,
      },
      {
        itemId: item6.id,
        label: 'D',
        text: '++',
        justification: 'The increment operator (++) increases a value by 1.',
        isCorrect: false,
      },
      // Item 7 options
      {
        itemId: item7.id,
        label: 'A',
        text: 'Fast access to elements by index',
        justification: 'Arrays provide O(1) random access by index.',
        isCorrect: true,
      },
      {
        itemId: item7.id,
        label: 'B',
        text: 'Dynamic size adjustment',
        justification: 'Arrays typically have fixed size, unlike dynamic structures.',
        isCorrect: false,
      },
      {
        itemId: item7.id,
        label: 'C',
        text: 'Automatic sorting',
        justification: 'Arrays do not automatically sort their elements.',
        isCorrect: false,
      },
      {
        itemId: item7.id,
        label: 'D',
        text: 'Built-in search functionality',
        justification: 'Arrays do not have built-in search; you must implement it.',
        isCorrect: false,
      },
      // Item 8 options
      {
        itemId: item8.id,
        label: 'A',
        text: 'O(log n)',
        justification: 'Binary search is O(log n), but direct index access is faster.',
        isCorrect: false,
      },
      {
        itemId: item8.id,
        label: 'B',
        text: 'O(1)',
        justification: 'Array access by index is constant time O(1).',
        isCorrect: true,
      },
      {
        itemId: item8.id,
        label: 'C',
        text: 'O(n)',
        justification: 'Linear search is O(n), but index access is faster.',
        isCorrect: false,
      },
      {
        itemId: item8.id,
        label: 'D',
        text: 'O(n²)',
        justification: 'Quadratic time is much slower than array access.',
        isCorrect: false,
      },
      // Item 9 options
      {
        itemId: item9.id,
        label: 'A',
        text: '0 to 9',
        justification: 'Array indices start at 0, so size 10 means indices 0-9.',
        isCorrect: true,
      },
      {
        itemId: item9.id,
        label: 'B',
        text: '1 to 10',
        justification: 'Array indices start at 0, not 1.',
        isCorrect: false,
      },
      {
        itemId: item9.id,
        label: 'C',
        text: '0 to 10',
        justification: 'Index 10 would be out of bounds for a size 10 array.',
        isCorrect: false,
      },
      {
        itemId: item9.id,
        label: 'D',
        text: '1 to 9',
        justification: 'Array indices start at 0, not 1.',
        isCorrect: false,
      },
      // Item 10 options
      {
        itemId: item10.id,
        label: 'A',
        text: '5',
        justification: 'x++ returns the original value (5) before incrementing.',
        isCorrect: true,
      },
      {
        itemId: item10.id,
        label: 'B',
        text: '6',
        justification: 'y gets the original value of x, not the incremented value.',
        isCorrect: false,
      },
      {
        itemId: item10.id,
        label: 'C',
        text: 'undefined',
        justification: 'The value is well-defined and will be 5.',
        isCorrect: false,
      },
      {
        itemId: item10.id,
        label: 'D',
        text: '0',
        justification: 'The post-increment operator returns the original value.',
        isCorrect: false,
      },
      // Item 11 options
      {
        itemId: item11.id,
        label: 'A',
        text: 'Linked list',
        justification: 'Arrays are more efficient for stack operations than linked lists.',
        isCorrect: false,
      },
      {
        itemId: item11.id,
        label: 'B',
        text: 'Array',
        justification: 'Arrays provide O(1) push/pop operations for stack implementation.',
        isCorrect: true,
      },
      {
        itemId: item11.id,
        label: 'C',
        text: 'Hash table',
        justification: 'Hash tables are not suitable for stack implementation.',
        isCorrect: false,
      },
      {
        itemId: item11.id,
        label: 'D',
        text: 'Binary tree',
        justification: 'Binary trees are not efficient for stack operations.',
        isCorrect: false,
      },
      // Item 12 options
      {
        itemId: item12.id,
        label: 'A',
        text: '10',
        justification: 'Incorrect calculation: (5+3)*2-4 = 8*2-4 = 16-4 = 12.',
        isCorrect: false,
      },
      {
        itemId: item12.id,
        label: 'B',
        text: '12',
        justification: 'Correct: (5+3)*2-4 = 8*2-4 = 16-4 = 12.',
        isCorrect: true,
      },
      {
        itemId: item12.id,
        label: 'C',
        text: '14',
        justification: 'Incorrect calculation: (5+3)*2-4 = 8*2-4 = 16-4 = 12.',
        isCorrect: false,
      },
      {
        itemId: item12.id,
        label: 'D',
        text: '16',
        justification: 'Incorrect calculation: (5+3)*2-4 = 8*2-4 = 16-4 = 12.',
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
      fixedLength: 5, // Increased from 3 to 5 to allow more variety
      includedModuleIds: [module1.id, module2.id],
      includedBlooms: ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE'],
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
      {
        quizId: quiz.id,
        itemId: item4.id,
      },
      {
        quizId: quiz.id,
        itemId: item5.id,
      },
      {
        quizId: quiz.id,
        itemId: item6.id,
      },
      {
        quizId: quiz.id,
        itemId: item7.id,
      },
      {
        quizId: quiz.id,
        itemId: item8.id,
      },
      {
        quizId: quiz.id,
        itemId: item9.id,
      },
      {
        quizId: quiz.id,
        itemId: item10.id,
      },
      {
        quizId: quiz.id,
        itemId: item11.id,
      },
      {
        quizId: quiz.id,
        itemId: item12.id,
      },
    ],
  })

  console.log('✅ Linked items to quiz')

  // Get the enrollment for student1
  const student1Enrollment = await prisma.enrollment.findFirst({
    where: {
      userId: student1.id,
      offeringId: offering.id,
    },
  });

  if (!student1Enrollment) {
    throw new Error('Student1 enrollment not found');
  }

  // Create a completed attempt for student1
  const attempt = await prisma.attempt.create({
    data: {
      quizId: quiz.id,
      enrollmentId: student1Enrollment.id,
      startedAt: new Date('2024-10-01T10:00:00Z'),
      finishedAt: new Date('2024-10-01T10:20:00Z'),
      status: 'COMPLETED',
      fixedLengthN: 5,
      engineVersion: '1.0.0',
      scopeSnapshot: {
        includedModuleIds: [module1.id, module2.id],
        includedBlooms: ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE'],
        eligibleItemIds: [item1.id, item2.id, item3.id, item4.id, item5.id, item6.id, item7.id, item8.id, item9.id, item10.id, item11.id, item12.id],
      },
      engineMasteryAtFinish: {
        [module1.id]: 0.85,
        [module2.id]: 0.75,
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
  const correctOption4 = await prisma.itemOption.findFirst({
    where: { itemId: item4.id, isCorrect: true },
  })
  const correctOption5 = await prisma.itemOption.findFirst({
    where: { itemId: item5.id, isCorrect: true },
  })

  // Create responses for the attempt (5 questions as per fixedLengthN)
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
      {
        attemptId: attempt.id,
        itemId: item4.id,
        selectedLabel: 'B',
        itemOptionId: correctOption4?.id,
        isCorrect: true,
        askedAt: new Date('2024-10-01T10:11:00Z'),
        answeredAt: new Date('2024-10-01T10:13:20Z'),
        responseTimeMs: 140000, // 2.33 minutes
        engineMasterySnapshot: {
          [module1.id]: 0.85,
          [module2.id]: 0.6,
        },
      },
      {
        attemptId: attempt.id,
        itemId: item5.id,
        selectedLabel: 'B',
        itemOptionId: correctOption5?.id,
        isCorrect: true,
        askedAt: new Date('2024-10-01T10:14:00Z'),
        answeredAt: new Date('2024-10-01T10:17:30Z'),
        responseTimeMs: 210000, // 3.5 minutes
        engineMasterySnapshot: {
          [module1.id]: 0.85,
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
  console.log(`- Items: 12 questions with 4 options each`)
  console.log(`- Quiz: Programming Basics Quiz (5 questions from 12 available)`)
  console.log(`- Attempt: 1 completed attempt by student1`)
  console.log(`- Responses: 5 responses (all correct)`)
  console.log('\n🔑 Test credentials:')
  console.log('- Instructor: instructor1')
  console.log('- Students: student1, student2')
  console.log('\n📚 Question Topics:')
  console.log('- Programming Basics (7 questions): variables, loops, comments, operators, expressions')
  console.log('- Data Structures (5 questions): arrays, indexing, time complexity, stack implementation')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
