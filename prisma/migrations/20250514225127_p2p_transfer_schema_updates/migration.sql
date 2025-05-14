/*
  Warnings:

  - You are about to drop the column `walletId` on the `Transaction` table. All the data in the column will be lost.
  - Added the required column `effectedWalletId` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `receiverWalletId` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `senderWalletId` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_walletId_fkey";

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "walletId",
ADD COLUMN     "effectedWalletId" TEXT NOT NULL,
ADD COLUMN     "receiverWalletId" TEXT NOT NULL,
ADD COLUMN     "senderWalletId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_senderWalletId_fkey" FOREIGN KEY ("senderWalletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_receiverWalletId_fkey" FOREIGN KEY ("receiverWalletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_effectedWalletId_fkey" FOREIGN KEY ("effectedWalletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
