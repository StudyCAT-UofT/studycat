/*
  Warnings:

  - You are about to drop the column `email` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `role` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'TA', 'INSTRUCTOR');

-- CreateEnum
CREATE TYPE "OfferingRole" AS ENUM ('STUDENT', 'TA', 'INSTRUCTOR');

-- CreateEnum
CREATE TYPE "BloomCategory" AS ENUM ('REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE');

-- CreateEnum
CREATE TYPE "OptionLabel" AS ENUM ('A', 'B', 'C', 'D');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- DropIndex
DROP INDEX "public"."User_email_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "email",
DROP COLUMN "name",
ADD COLUMN     "role" "UserRole" NOT NULL,
ADD COLUMN     "username" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Term" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),

    CONSTRAINT "Term_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseOffering" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "display" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseOffering_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "offeringRole" "OfferingRole" NOT NULL DEFAULT 'STUDENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "externalQuestionId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "bloom" "BloomCategory" NOT NULL,
    "stem" TEXT NOT NULL,
    "reference" TEXT,
    "figureUrl" TEXT,
    "ptBi" DOUBLE PRECISION,
    "average" DOUBLE PRECISION,
    "attemptsCount" INTEGER,
    "irtA" DOUBLE PRECISION NOT NULL,
    "irtB" DOUBLE PRECISION NOT NULL,
    "irtC" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemOption" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "label" "OptionLabel" NOT NULL,
    "text" TEXT NOT NULL,
    "justification" TEXT,
    "isCorrect" BOOLEAN NOT NULL,

    CONSTRAINT "ItemOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fixedLength" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "includedModules" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "includedBlooms" "BloomCategory"[] DEFAULT ARRAY[]::"BloomCategory"[],
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizItem" (
    "quizId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,

    CONSTRAINT "QuizItem_pkey" PRIMARY KEY ("quizId","itemId")
);

-- CreateTable
CREATE TABLE "Attempt" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "fixedLengthN" INTEGER NOT NULL,
    "engineVersion" TEXT,
    "scopeSnapshot" JSONB,
    "engineMasteryAtFinish" JSONB,

    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Response" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "selectedLabel" "OptionLabel" NOT NULL,
    "itemOptionId" TEXT,
    "isCorrect" BOOLEAN NOT NULL,
    "askedAt" TIMESTAMP(3) NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL,
    "responseTimeMs" INTEGER NOT NULL,
    "engineMasterySnapshot" JSONB,

    CONSTRAINT "Response_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Course_code_title_key" ON "Course"("code", "title");

-- CreateIndex
CREATE UNIQUE INDEX "Term_name_key" ON "Term"("name");

-- CreateIndex
CREATE INDEX "CourseOffering_termId_idx" ON "CourseOffering"("termId");

-- CreateIndex
CREATE INDEX "CourseOffering_courseId_idx" ON "CourseOffering"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseOffering_courseId_termId_key" ON "CourseOffering"("courseId", "termId");

-- CreateIndex
CREATE INDEX "Enrollment_offeringId_idx" ON "Enrollment"("offeringId");

-- CreateIndex
CREATE INDEX "Enrollment_offeringRole_idx" ON "Enrollment"("offeringRole");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_userId_offeringId_key" ON "Enrollment"("userId", "offeringId");

-- CreateIndex
CREATE INDEX "Item_courseId_idx" ON "Item"("courseId");

-- CreateIndex
CREATE INDEX "Item_module_idx" ON "Item"("module");

-- CreateIndex
CREATE INDEX "Item_bloom_idx" ON "Item"("bloom");

-- CreateIndex
CREATE INDEX "Item_active_idx" ON "Item"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Item_courseId_externalQuestionId_key" ON "Item"("courseId", "externalQuestionId");

-- CreateIndex
CREATE INDEX "ItemOption_isCorrect_idx" ON "ItemOption"("isCorrect");

-- CreateIndex
CREATE UNIQUE INDEX "ItemOption_itemId_label_key" ON "ItemOption"("itemId", "label");

-- CreateIndex
CREATE INDEX "Quiz_offeringId_idx" ON "Quiz"("offeringId");

-- CreateIndex
CREATE INDEX "Quiz_active_idx" ON "Quiz"("active");

-- CreateIndex
CREATE INDEX "QuizItem_itemId_idx" ON "QuizItem"("itemId");

-- CreateIndex
CREATE INDEX "Attempt_quizId_idx" ON "Attempt"("quizId");

-- CreateIndex
CREATE INDEX "Attempt_userId_idx" ON "Attempt"("userId");

-- CreateIndex
CREATE INDEX "Attempt_status_idx" ON "Attempt"("status");

-- CreateIndex
CREATE INDEX "Attempt_startedAt_idx" ON "Attempt"("startedAt");

-- CreateIndex
CREATE INDEX "Response_attemptId_idx" ON "Response"("attemptId");

-- CreateIndex
CREATE INDEX "Response_itemId_idx" ON "Response"("itemId");

-- CreateIndex
CREATE INDEX "Response_isCorrect_idx" ON "Response"("isCorrect");

-- CreateIndex
CREATE INDEX "Response_answeredAt_idx" ON "Response"("answeredAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- AddForeignKey
ALTER TABLE "CourseOffering" ADD CONSTRAINT "CourseOffering_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseOffering" ADD CONSTRAINT "CourseOffering_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "CourseOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemOption" ADD CONSTRAINT "ItemOption_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "CourseOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizItem" ADD CONSTRAINT "QuizItem_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizItem" ADD CONSTRAINT "QuizItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_itemOptionId_fkey" FOREIGN KEY ("itemOptionId") REFERENCES "ItemOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;
