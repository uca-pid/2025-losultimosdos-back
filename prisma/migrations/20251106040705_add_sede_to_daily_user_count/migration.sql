-- AlterTable
ALTER TABLE "public"."DailyUserCount" ADD COLUMN     "sedeId" INTEGER NOT NULL DEFAULT 1;

-- AddForeignKey
ALTER TABLE "public"."DailyUserCount" ADD CONSTRAINT "DailyUserCount_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "public"."Sede"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
