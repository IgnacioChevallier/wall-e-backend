import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionType, Wallet, Transaction } from '../../generated/prisma';
import { Prisma } from '../../generated/prisma';

export interface P2PTransactionData {
  amount: number;
  senderWallet: Wallet;
  recipientWallet: Wallet;
  senderDescription: string;
  recipientDescription: string;
}

@Injectable()
export class TransactionsRepository {
  constructor(private prisma: PrismaService) {}

  async createP2PTransfer(data: P2PTransactionData): Promise<{ senderTransaction: Transaction, recipientTransaction: Transaction}> {
    const { amount, senderWallet, recipientWallet, senderDescription, recipientDescription } = data;

    return this.prisma.$transaction(async (tx) => {
      // 1. Decrement sender's balance
      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: amount } },
      });

      // 2. Increment recipient's balance
      await tx.wallet.update({
        where: { id: recipientWallet.id },
        data: { balance: { increment: amount } },
      });

      // 3. Create sender's transaction record (OUT)
      const senderTransaction = await tx.transaction.create({
        data: {
          amount,
          type: TransactionType.OUT,
          description: senderDescription,
          senderWalletId: senderWallet.id,
          receiverWalletId: recipientWallet.id,
          effectedWalletId: senderWallet.id, 
        },
      });

      // 4. Create recipient's transaction record (IN)
      const recipientTransaction = await tx.transaction.create({
        data: {
          amount,
          type: TransactionType.IN,
          description: recipientDescription,
          senderWalletId: senderWallet.id,
          receiverWalletId: recipientWallet.id,
          effectedWalletId: recipientWallet.id,
        },
      });

      return { senderTransaction, recipientTransaction };
    });
  }
}
