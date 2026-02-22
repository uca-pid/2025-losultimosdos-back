-- CreateEnum
CREATE TYPE "public"."SessionStatus" AS ENUM ('COMPLETED', 'PARTIAL', 'NOT_DONE');

-- AlterTable
ALTER TABLE "public"."ExercisePerformance" ADD COLUMN     "comment" TEXT,
ADD COLUMN     "sessionId" INTEGER,
ADD COLUMN     "setNumber" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "public"."WorkoutSession" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "routineId" INTEGER NOT NULL,
    "status" "public"."SessionStatus" NOT NULL DEFAULT 'COMPLETED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkoutSession_userId_idx" ON "public"."WorkoutSession"("userId");

-- CreateIndex
CREATE INDEX "WorkoutSession_userId_routineId_idx" ON "public"."WorkoutSession"("userId", "routineId");

-- CreateIndex
CREATE INDEX "ExercisePerformance_sessionId_idx" ON "public"."ExercisePerformance"("sessionId");

-- AddForeignKey
ALTER TABLE "public"."WorkoutSession" ADD CONSTRAINT "WorkoutSession_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "public"."Routine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExercisePerformance" ADD CONSTRAINT "ExercisePerformance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."WorkoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
