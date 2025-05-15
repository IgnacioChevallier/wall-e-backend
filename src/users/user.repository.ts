import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Wallet } from '../../generated/prisma';

@Injectable()
export class UserRepository {
  constructor(private prisma: PrismaService) {}

  findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  findUserWithWallet(email: string): Promise<(User & { wallet: Wallet | null }) | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: { wallet: true },
    });
  }

  createUser(email: string, password: string, alias: string): Promise<User> {
    return this.prisma.user.create({
      data: {
        email,
        password,
        alias: alias,
        wallet: {
          create: { balance: 0 }
        }
      },
      include: { wallet: true }
    });
  }
}
