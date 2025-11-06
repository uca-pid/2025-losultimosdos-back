/*
  Warnings:

  - Added the required column `sedeId` to the `Class` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sedeId` to the `Routine` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Class" ADD COLUMN     "sedeId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."Routine" ADD COLUMN     "sedeId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "public"."Sede" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "users" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "Sede_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Class" ADD CONSTRAINT "Class_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "public"."Sede"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Routine" ADD CONSTRAINT "Routine_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "public"."Sede"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
