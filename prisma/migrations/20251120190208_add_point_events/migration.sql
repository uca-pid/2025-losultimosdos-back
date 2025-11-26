-- CreateEnum
CREATE TYPE "public"."PointEventType" AS ENUM ('CLASS_ENROLL', 'ROUTINE_ASSIGN', 'ROUTINE_COMPLETE');

-- CreateTable
CREATE TABLE "public"."PointEvent" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "sedeId" INTEGER NOT NULL,
    "type" "public"."PointEventType" NOT NULL,
    "points" INTEGER NOT NULL,
    "classId" INTEGER,
    "routineId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."PointEvent" ADD CONSTRAINT "PointEvent_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "public"."Sede"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
