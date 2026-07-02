-- CreateEnum
CREATE TYPE "Algorithm" AS ENUM ('TOKEN_BUCKET', 'SLIDING_WINDOW');

-- CreateTable
CREATE TABLE "client" (
    "id" SERIAL NOT NULL,
    "clientKey" TEXT NOT NULL,
    "algorithm" "Algorithm" NOT NULL,
    "refillRate" INTEGER NOT NULL,
    "burstSize" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_clientKey_key" ON "client"("clientKey");
