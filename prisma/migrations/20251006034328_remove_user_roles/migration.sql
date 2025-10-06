/*
  Warnings:

  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."User_role_idx";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role";

-- DropEnum
DROP TYPE "public"."UserRole";
