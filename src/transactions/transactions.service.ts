import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { P2PTransferDto } from './dto/p2p-transfer.dto';
import { UsersService } from '../users/users.service';
import { WalletService } from '../wallet/wallet.service';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionType } from '../../generated/prisma'; // Assuming TransactionType enum exists

@Injectable()
export class TransactionsService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private walletService: WalletService,
  ) {}

  async createP2PTransfer(
    senderId: string,
    p2pTransferDto: P2PTransferDto,
  ) {
    const { recipientIdentifier, amount } = p2pTransferDto;

    if (amount <= 0) {
      throw new BadRequestException('Transfer amount must be positive.');
    }

    const sender = await this.usersService.findOne(senderId);
    if (!sender) {
      throw new NotFoundException(`Sender with ID ${senderId} not found.`);
    }

    const recipient = await this.usersService.findByEmailOrAlias(
      recipientIdentifier,
    );
    if (!recipient) {
      throw new NotFoundException(
        `Recipient with identifier ${recipientIdentifier} not found.`,
      );
    }

    if (sender.id === recipient.id) {
      throw new BadRequestException('Cannot transfer funds to yourself.');
    }

    const senderWallet = await this.walletService.getWalletDetails(sender.id);
    if (!senderWallet) {
        throw new NotFoundException(`Wallet for sender ${sender.id} not found`);
    }
    
    if (senderWallet.balance < amount) {
      throw new BadRequestException('Insufficient funds.');
    }

    // Perform the transfer in a transaction to ensure atomicity
    return this.prisma.$transaction(async (tx) => {
      // Debit sender
      await tx.wallet.update({
        where: { userId: sender.id },
        data: { balance: { decrement: amount } },
      });

      // Credit recipient
      await tx.wallet.update({
        where: { userId: recipient.id },
        data: { balance: { increment: amount } },
      });

      // Create transaction record for sender
      const senderTransaction = await tx.transaction.create({
        data: {
          amount,
          type: TransactionType.OUT, // Placeholder
          userId: sender.id,
          walletId: senderWallet.id,
          relatedUserId: recipient.id,
          description: `Transfer to ${recipient.email || recipient.id}`,
        },
      });

      const recipientWallet = await this.walletService.getWalletDetails(recipient.id);
      if (!recipientWallet) {
        // This should ideally not happen if recipient user exists and wallets are created with users
        throw new NotFoundException(`Wallet for recipient ${recipient.id} not found`);
      }

      // Create transaction record for recipient
      const recipientTransaction = await tx.transaction.create({
        data: {
          amount,
          type: TransactionType.IN, // Placeholder
          userId: recipient.id,
          walletId: recipientWallet.id,
          relatedUserId: sender.id,
          description: `Transfer from ${sender.email || sender.id}`,
        },
      });

      return {
        message: 'Transfer successful',
        senderTransaction,
        recipientTransaction,
      };
    });
  }

  create(createTransactionDto: CreateTransactionDto) {
    return 'This action adds a new transaction';
  }

  findAll() {
    return `This action returns all transactions`;
  }

  findOne(id: number) {
    return `This action returns a #${id} transaction`;
  }

  update(id: number, updateTransactionDto: UpdateTransactionDto) {
    return `This action updates a #${id} transaction`;
  }

  remove(id: number) {
    return `This action removes a #${id} transaction`;
  }
}
