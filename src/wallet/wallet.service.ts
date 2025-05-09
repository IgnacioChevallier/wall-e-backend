import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Wallet } from '../../generated/prisma';

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
}
