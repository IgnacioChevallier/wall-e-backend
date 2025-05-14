import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Transaction, Prisma } from '../../generated/prisma';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

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
