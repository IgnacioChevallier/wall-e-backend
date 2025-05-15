import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { P2PTransferDto } from './dto/p2p-transfer.dto';
import { UsersService } from '../users/users.service';
import { WalletService } from '../wallet/wallet.service';
import { TransactionsRepository } from './transactions.repository';
import { User } from '../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { Transaction, Prisma } from '../../generated/prisma';

@Injectable()
export class TransactionsService {
  constructor(
    private usersService: UsersService,
    private walletService: WalletService,
    private transactionsRepository: TransactionsRepository,
  ) {}

  async createP2PTransfer(
    senderUserId: string,
    p2pTransferDto: P2PTransferDto,
  ) {
    const { recipientIdentifier, amount } = p2pTransferDto;

    // 1. Fetch sender
    const sender = await this.usersService.findOne(senderUserId);
    if (!sender) {
      throw new NotFoundException(`Sender with ID ${senderUserId} not found.`);
    }

    // 2. Fetch recipient by email (as per requirement)
    let recipient: User | null = null;
    try {
      recipient = await this.usersService.findByEmailOrAlias(recipientIdentifier);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(
          `Recipient with email ${recipientIdentifier} not found.`, 
        );
      }
      throw error; // Re-throw other errors
    }

    if (!recipient) { // Should be caught by findByEmail, but as a safeguard
        throw new NotFoundException(
            `Recipient with email ${recipientIdentifier} not found.`,
        );
    }

    if (sender.id === recipient.id) {
      throw new BadRequestException('Cannot transfer funds to yourself.');
    }

    // 3. Fetch sender's wallet
    const senderWallet = await this.walletService.getWalletByUserId(sender.id);
    if (!senderWallet) {
        throw new NotFoundException(`Wallet for sender ${sender.id} not found. Please ensure the sender has a wallet.`);
    }
    
    if (senderWallet.balance < amount) {
      throw new BadRequestException('Insufficient funds.');
    }

    // 4. Fetch recipient's wallet
    const recipientWallet = await this.walletService.getWalletByUserId(recipient.id);
    if (!recipientWallet) {
      throw new NotFoundException(`Wallet for recipient ${recipient.email} not found. Please ensure the recipient has a wallet.`);
    }

    // 5. Perform the transfer using the repository
    try {
      const { senderTransaction, recipientTransaction } = await this.transactionsRepository.createP2PTransfer({
        amount,
        senderWallet,
        recipientWallet,
        senderDescription: `Transfer to ${recipient.email}`,
        recipientDescription: `Transfer from ${sender.email}`,
      });

      return {
        message: 'Transfer successful',
        senderTransaction,
        recipientTransaction,
      };
    } catch (error) {
      // Log the error for debugging
      console.error("P2P Transfer failed:", error);
      // Re-throw a generic error or a more specific one based on the type of error
      throw new BadRequestException('P2P Transfer failed. Please try again later.');
    }
  }

  async create(
    createTransactionDto: CreateTransactionDto,
  ): Promise<Transaction> {
    const { amount, type, walletId, description } = createTransactionDto;
    return await (this.prisma.transaction as any).create({
      data: {
        amount,
        type,
        walletId,
        description,
      },
    });
  }

  async findAll(): Promise<Transaction[]> {
    return await (this.prisma.transaction as any).findMany();
  }

  async findOne(id: string): Promise<Transaction> {
    const transaction = await (this.prisma.transaction as any).findUnique({
      where: { id },
    });
    if (!transaction) {
      throw new NotFoundException(`Transaction with ID #${id} not found`);
    }
    return transaction;
  }

  async update(
    id: string,
    updateTransactionDto: UpdateTransactionDto,
  ): Promise<Transaction> {
    try {
      return await (this.prisma.transaction as any).update({
        where: { id },
        data: updateTransactionDto,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(
          `Transaction with ID #${id} not found for update`,
        );
      }
      throw error;
    }
  }

  async remove(id: string): Promise<Transaction> {
    try {
      return await (this.prisma.transaction as any).delete({
        where: { id },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(
          `Transaction with ID #${id} not found for deletion`,
        );
      }
      throw error;
    }
  }
}
