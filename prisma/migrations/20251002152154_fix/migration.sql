/*
  Warnings:

  - You are about to drop the column `users` on the `RoutineExercise` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Routine" ADD COLUMN     "users" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "public"."RoutineExercise" DROP COLUMN "users";
