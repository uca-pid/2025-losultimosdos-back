/*
  Warnings:

  - The `level` column on the `Routine` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."Level" AS ENUM ('Beginner', 'Intermediate', 'Advanced');

-- AlterTable
ALTER TABLE "public"."Routine" DROP COLUMN "level",
ADD COLUMN     "level" "public"."Level" NOT NULL DEFAULT 'Beginner';
