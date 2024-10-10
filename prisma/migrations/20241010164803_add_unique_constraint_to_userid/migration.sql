/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `Referral` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Referral_userId_key" ON "Referral"("userId");
