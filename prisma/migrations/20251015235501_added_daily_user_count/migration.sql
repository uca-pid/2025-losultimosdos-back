-- CreateTable
CREATE TABLE "public"."DailyUserCount" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "basic" INTEGER NOT NULL DEFAULT 0,
    "premium" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DailyUserCount_pkey" PRIMARY KEY ("id")
);
