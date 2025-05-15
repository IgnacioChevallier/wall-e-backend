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

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

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

    // Simular validación del medio de pago
    this.validatePaymentMethod(addMoneyDto);

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

  async withdrawMoney(userId: string, withdrawDto: WithdrawMoneyDto) {
    const wallet = await this.getWalletByUserId(userId);

    if (wallet.balance < withdrawDto.amount) {
      throw new BadRequestException('Insufficient funds');
    }

    // Simular validación de la cuenta bancaria
    this.validateBankAccount(withdrawDto.bankAccount);

    // Usar una transacción de base de datos para asegurar consistencia
    const result = await this.prisma.$transaction(async (prisma) => {
      // Primero creamos o buscamos una wallet del sistema para representar el destino externo
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
          amount: -withdrawDto.amount, // Monto negativo para retiros
          type: 'OUT',
          description: `Withdrawal to bank account ${withdrawDto.bankAccount}`,
          effectedWallet: {
            connect: { id: wallet.id },
          },
          senderWallet: {
            connect: { id: wallet.id },
          },
          receiverWallet: {
            connect: { id: systemWallet.id },
          },
        },
      });

      // Actualizar el balance de la wallet
      const updatedWallet = await prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: {
            decrement: withdrawDto.amount,
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

  private validatePaymentMethod(addMoneyDto: AddMoneyDto): void {
    if (addMoneyDto.amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }
    // Aquí iría la lógica de validación específica para cada método de pago
    return;
  }

  private validateBankAccount(bankAccount: string): void {
    if (!bankAccount) {
      throw new BadRequestException('Bank account is required');
    }
    // Aquí iría la lógica de validación específica para cuentas bancarias
    return;
  }
}
