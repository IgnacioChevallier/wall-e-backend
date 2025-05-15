import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Wallet } from '../../generated/prisma';
import { AddMoneyDto, PaymentMethod } from './dto/add-money.dto';
import { WithdrawMoneyDto } from './dto/withdraw-money.dto';
import { ExternalBankService } from '../external-bank/external-bank.service';

@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
    private externalBankService: ExternalBankService,
  ) {}

  create(userId: string) {
    return this.prisma.wallet.create({
      data: { userId, balance: 0 },
    });
  }

  findAll() {
    // esto habría q sacarlo no? para que no se pueda acceder a todos los wallets?
    return `This action returns all wallet`;
  }

  findOne(id: string) {
    return this.prisma.wallet.findUnique({ where: { id } });
  }

  async update(id: string, data: any): Promise<any> {
    return await (this.prisma.wallet as any).update({ where: { id }, data });
  }

  async remove(id: string): Promise<any> {
    return await (this.prisma.wallet as any).delete({ where: { id } });
  }

  async getWalletByUserId(userId: string): Promise<Wallet> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });
    if (!wallet) {
      throw new NotFoundException(`Wallet for user ID ${userId} not found.`);
    }
    return wallet;
  }

  async getWalletBalance(userId: string): Promise<number> {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
    return wallet.balance;
  }

  async getWalletDetails(userId: string): Promise<Wallet> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        allTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 10, // Get last 10 transactions
        },
      },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return wallet;
  }

  async updateWalletBalance(
    userId: string,
    amount: number,
    operation: 'increment' | 'decrement',
  ): Promise<Wallet> {
    const wallet = await this.getWalletByUserId(userId);

    const newBalance =
      operation === 'increment'
        ? wallet.balance + amount
        : wallet.balance - amount;

    if (newBalance < 0) {
      throw new BadRequestException('Insufficient funds');
    }

    return this.prisma.wallet.update({
      where: { userId },
      data: { balance: newBalance },
    });
  }

  async addMoney(userId: string, addMoneyDto: AddMoneyDto) {
    const wallet = await this.getWalletByUserId(userId);

    // Verificar con el servicio externo simulado
    const externalResponse = await this.externalBankService.Transfer({
      amount: addMoneyDto.amount,
      toWalletId: wallet.id,
      source: addMoneyDto.sourceIdentifier || 'unknown',
    });

    if (!externalResponse.success) {
      throw new BadRequestException(
        externalResponse.error || 'External transfer failed',
      );
    }

    // Usar una transacción de base de datos para asegurar consistencia
    const result = await this.prisma.$transaction(async (prisma) => {
      // Primero creamos o buscamos una wallet del sistema para representar el origen externo
      const systemWallet =
        (await prisma.wallet.findFirst({
          where: { userId: 'SYSTEM' },
        })) ||
        (await prisma.wallet.create({
          data: {
            userId: 'SYSTEM',
            balance: 0,
          },
        }));

      // Crear la transacción
      const transaction = await prisma.transaction.create({
        data: {
          amount: addMoneyDto.amount,
          type: 'IN',
          description: `Deposit via ${addMoneyDto.method} - ${addMoneyDto.sourceIdentifier || 'Unknown source'}`,
          effectedWallet: {
            connect: { id: wallet.id },
          },
          senderWallet: {
            connect: { id: systemWallet.id },
          },
          receiverWallet: {
            connect: { id: wallet.id },
          },
        },
      });

      // Actualizar el balance de la wallet
      const updatedWallet = await prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: {
            increment: addMoneyDto.amount,
          },
        },
        include: {
          allTransactions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      return {
        success: true,
        balance: updatedWallet.balance,
        transaction: transaction,
      };
    });

    return result;
  }

  async requestDebin(userId: string, amount: number) {
    const wallet = await this.getWalletByUserId(userId);

    // Solicitar DEBIN al servicio externo
    const debinResponse = await this.externalBankService.ExecuteDebin({
      amount,
      toWalletId: wallet.id,
    });

    if (!debinResponse.approved) {
      throw new BadRequestException('DEBIN request was not approved');
    }

    // Si el DEBIN fue aprobado, proceder con la transacción
    const result = await this.prisma.$transaction(async (prisma) => {
      const systemWallet =
        (await prisma.wallet.findFirst({
          where: { userId: 'SYSTEM' },
        })) ||
        (await prisma.wallet.create({
          data: {
            userId: 'SYSTEM',
            balance: 0,
          },
        }));

      const transaction = await prisma.transaction.create({
        data: {
          amount: amount,
          type: 'IN',
          description: `DEBIN transfer approved`,
          effectedWallet: {
            connect: { id: wallet.id },
          },
          senderWallet: {
            connect: { id: systemWallet.id },
          },
          receiverWallet: {
            connect: { id: wallet.id },
          },
        },
      });

      const updatedWallet = await prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: {
            increment: amount,
          },
        },
        include: {
          allTransactions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      return {
        success: true,
        balance: updatedWallet.balance,
        transaction: transaction,
      };
    });

    return result;
  }
}
