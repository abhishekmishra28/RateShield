-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Algorithm" AS ENUM ('TOKEN_BUCKET', 'SLIDING_WINDOW');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "algorithm" "Algorithm" NOT NULL DEFAULT 'TOKEN_BUCKET',
    "burstSize" INTEGER NOT NULL DEFAULT 10,
    "refillRate" INTEGER NOT NULL DEFAULT 5,
    "windowSize" INTEGER NOT NULL DEFAULT 60,
    "maxRequests" INTEGER NOT NULL DEFAULT 100,
    "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clients_apiKey_key" ON "clients"("apiKey");

