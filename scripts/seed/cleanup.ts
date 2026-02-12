import { PrismaClient } from '@prisma/client'

export async function cleanup(prisma: PrismaClient) {
  console.log('🧹 Cleaning up existing data...')
  // Delete in strict dependency order (children before parents)
  await prisma.response.deleteMany({})
  await prisma.attempt.deleteMany({})
  await prisma.theta.deleteMany({})
  await prisma.enrollment.deleteMany({})
  await prisma.quizItem.deleteMany({})
  await prisma.quizModule.deleteMany({})
  await prisma.quiz.deleteMany({})
  await prisma.itemOption.deleteMany({})
  await prisma.item.deleteMany({})
  await prisma.module.deleteMany({})
  await prisma.courseOffering.deleteMany({})
  await prisma.course.deleteMany({})
  await prisma.term.deleteMany({})
  await prisma.user.deleteMany({})
  console.log('✅ Cleanup complete')
}
