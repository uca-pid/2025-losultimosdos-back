-- CreateEnum
CREATE TYPE "public"."GoalCategory" AS ENUM ('USER_REGISTRATIONS', 'CLASS_ENROLLMENTS', 'ROUTINE_ASSIGNMENTS');

-- CreateTable
CREATE TABLE "public"."Goal" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "public"."GoalCategory" NOT NULL,
    "targetValue" INTEGER NOT NULL,
    "currentValue" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "sedeId" INTEGER NOT NULL,
    "targetClassId" INTEGER,
    "targetRoutineId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Goal" ADD CONSTRAINT "Goal_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "public"."Sede"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Goal" ADD CONSTRAINT "Goal_targetClassId_fkey" FOREIGN KEY ("targetClassId") REFERENCES "public"."Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Goal" ADD CONSTRAINT "Goal_targetRoutineId_fkey" FOREIGN KEY ("targetRoutineId") REFERENCES "public"."Routine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
