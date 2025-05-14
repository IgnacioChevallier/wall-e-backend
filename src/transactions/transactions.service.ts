import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Transaction, TransactionType } from '../../generated/prisma'; // Assuming TransactionType is also generated

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async create(createTransactionDto: CreateTransactionDto): Promise<Transaction> {
    const { amount, type, walletId, description } = createTransactionDto;
    return this.prisma.transaction.create({
      data: {
        amount,
        type,
        walletId,
        description,
        // wallet: { connect: { id: walletId } } // Alternative way to connect to wallet if needed
      },
    });
  }

  async findAll(): Promise<Transaction[]> {
    return this.prisma.transaction.findMany();
  }

  async findOne(id: string): Promise<Transaction> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
    });
    if (!transaction) {
      throw new NotFoundException(`Transaction with ID #${id} not found`);
    }
    return transaction;
  }

  async update(id: string, updateTransactionDto: UpdateTransactionDto): Promise<Transaction> {
    try {
      return await this.prisma.transaction.update({
        where: { id },
        data: updateTransactionDto,
      });
    } catch (error: any) { // Added :any for error.code access
      if (error && error.code === 'P2025') {
        throw new NotFoundException(`Transaction with ID #${id} not found for update`);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<Transaction> {
    try {
      return await this.prisma.transaction.delete({
        where: { id },
      });
    } catch (error: any) {
      if (error && error.code === 'P2025') {
        throw new NotFoundException(`Transaction with ID #${id} not found for deletion`);
      }
      throw error;
    }
  }
}
