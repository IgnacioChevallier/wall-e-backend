import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Wallet } from '../../generated/prisma';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  async create(data: any): Promise<any> {
    return await (this.prisma.wallet as any).create({ data });
  }

  findAll() {
    // esto habría q sacarlo no? para que no se pueda acceder a todos los wallets?
    return `This action returns all wallet`;
  }

  async findOne(id: string): Promise<any> {
    return await (this.prisma.wallet as any).findUnique({ where: { id } });
  }

  async update(id: string, data: any): Promise<any> {
    return await (this.prisma.wallet as any).update({ where: { id }, data });
  }

  async remove(id: string): Promise<any> {
    return await (this.prisma.wallet as any).delete({ where: { id } });
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
}
