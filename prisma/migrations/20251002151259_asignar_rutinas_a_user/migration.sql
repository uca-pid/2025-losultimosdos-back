-- AlterTable
ALTER TABLE "public"."RoutineExercise" ADD COLUMN     "users" TEXT[] DEFAULT ARRAY[]::TEXT[];
