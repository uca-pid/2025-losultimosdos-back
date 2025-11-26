-- CreateEnum
CREATE TYPE "public"."ChallengeFrequency" AS ENUM ('DAILY', 'WEEKLY');

-- AlterEnum
ALTER TYPE "public"."PointEventType" ADD VALUE 'CHALLENGE_COMPLETE';

-- CreateTable
CREATE TABLE "public"."Challenge" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "frequency" "public"."ChallengeFrequency" NOT NULL,
    "pointsReward" INTEGER NOT NULL,
    "minLevel" INTEGER NOT NULL DEFAULT 3,
    "sedeId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserChallenge" (
    "id" SERIAL NOT NULL,
    "challengeId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserChallenge_challengeId_userId_periodKey_key" ON "public"."UserChallenge"("challengeId", "userId", "periodKey");

-- AddForeignKey
ALTER TABLE "public"."Challenge" ADD CONSTRAINT "Challenge_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "public"."Sede"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserChallenge" ADD CONSTRAINT "UserChallenge_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "public"."Challenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
