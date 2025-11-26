-- CreateEnum
CREATE TYPE "public"."BadgeMetric" AS ENUM ('TOTAL_POINTS', 'CLASS_ENROLL_COUNT', 'ROUTINE_COMPLETE_COUNT');

-- CreateTable
CREATE TABLE "public"."Badge" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "metric" "public"."BadgeMetric" NOT NULL,
    "threshold" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserBadge" (
    "id" SERIAL NOT NULL,
    "badgeId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Badge_code_key" ON "public"."Badge"("code");

-- CreateIndex
CREATE UNIQUE INDEX "UserBadge_badgeId_userId_key" ON "public"."UserBadge"("badgeId", "userId");

-- AddForeignKey
ALTER TABLE "public"."UserBadge" ADD CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "public"."Badge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
