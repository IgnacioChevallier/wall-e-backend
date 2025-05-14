import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Wallet } from '../../generated/prisma';
import { AddMoneyDto, PaymentMethod } from './dto/add-money.dto';
import { WithdrawMoneyDto } from './dto/withdraw-money.dto';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  create(userId: string) {
    // esta tampoco haría falta xq se crea cuando creas un user directo. 
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

  update(id: string, updateWalletDto: UpdateWalletDto) {
    return this.prisma.wallet.update({
      where: { id },
      data: updateWalletDto,
    });
  }

  remove(id: string) {
    return this.prisma.wallet.delete({ where: { id } });
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
        transactions: {
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

  async addMoney(userId: string, addMoneyDto: AddMoneyDto) {
    const wallet = await this.prisma.wallet.findUnique({ 
      where: { userId } 
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Simular validación del medio de pago
    await this.validatePaymentMethod(addMoneyDto);

    // Crear la transacción y actualizar el balance en una transacción de base de datos
    const result = await this.prisma.$transaction(async (prisma) => {
      // Crear la transacción
      const transaction = await prisma.transaction.create({
        data: {
          amount: addMoneyDto.amount,
          type: 'IN',
          description: `Deposit via ${addMoneyDto.method} - ${addMoneyDto.sourceIdentifier || 'Unknown source'}`,
          walletId: wallet.id
        }
      });

      // Actualizar el balance de la wallet
      const updatedWallet = await prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: {
            increment: addMoneyDto.amount
          }
        },
        include: {
          transactions: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });

      return {
        success: true,
        balance: updatedWallet.balance,
        transaction: transaction
      };
    });

    return result;
  }

  async withdrawMoney(userId: string, withdrawDto: WithdrawMoneyDto) {
    const wallet = await this.prisma.wallet.findUnique({ 
      where: { userId } 
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    if (wallet.balance < withdrawDto.amount) {
      throw new BadRequestException('Insufficient funds');
    }

    // Simular validación de la cuenta bancaria
    await this.validateBankAccount(withdrawDto.bankAccount);

    // Crear la transacción y actualizar el balance en una transacción de base de datos
    const result = await this.prisma.$transaction(async (prisma) => {
      // Crear la transacción
      const transaction = await prisma.transaction.create({
        data: {
          amount: -withdrawDto.amount, // Monto negativo para retiros
          type: 'OUT',
          description: `Withdrawal to bank account ${withdrawDto.bankAccount}`,
          walletId: wallet.id
        }
      });

      // Actualizar el balance de la wallet
      const updatedWallet = await prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: {
            decrement: withdrawDto.amount
          }
        },
        include: {
          transactions: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });

      return {
        success: true,
        balance: updatedWallet.balance,
        transaction: transaction
      };
    });

    return result;
  }

  private async validatePaymentMethod(addMoneyDto: AddMoneyDto): Promise<void> {
    // lógica de validación
    return;
  }

  private async validateBankAccount(bankAccount: string): Promise<void> {
    // lógica de validación
    return;
  }
}

