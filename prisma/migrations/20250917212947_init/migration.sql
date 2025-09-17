-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('admin', 'user');

-- CreateTable
CREATE TABLE "public"."Class" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hour" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "enrolled" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "users" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);
