-- CreateTable
CREATE TABLE "public"."ExercisePerformance" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "routineId" INTEGER,
    "exerciseId" INTEGER NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "reps" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExercisePerformance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExercisePerformance_userId_exerciseId_idx" ON "public"."ExercisePerformance"("userId", "exerciseId");

-- CreateIndex
CREATE INDEX "ExercisePerformance_userId_routineId_idx" ON "public"."ExercisePerformance"("userId", "routineId");

-- AddForeignKey
ALTER TABLE "public"."ExercisePerformance" ADD CONSTRAINT "ExercisePerformance_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "public"."Routine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExercisePerformance" ADD CONSTRAINT "ExercisePerformance_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "public"."Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
