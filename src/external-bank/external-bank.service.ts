import { Injectable, HttpException, HttpStatus, Inject, forwardRef } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import {
  BankTransferRequest,
  BankTransferResponse,
  DebinRequest,
  DebinResponse,
  BANK_API_ENDPOINTS,
} from './bank-api.interface';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExternalBankService {
  private readonly bankApiUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
  ) {
    this.bankApiUrl =
      this.configService.get<string>('BANK_API_URL') ||
      'http://eva-bank:3001';
  }

  async Transfer(data: BankTransferRequest): Promise<BankTransferResponse> {
    try {
      const response = await axios.post<BankTransferResponse>(
        `${this.bankApiUrl}${BANK_API_ENDPOINTS.transfer}`,
        data,
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new HttpException(
          error.response?.data?.error || 'External bank service error',
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw error;
    }
  }

  async ExecuteDebin(data: DebinRequest): Promise<DebinResponse> {
    try {
      const response = await axios.post<DebinResponse>(
        `${this.bankApiUrl}${BANK_API_ENDPOINTS.debin}`,
        data,
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new HttpException(
          error.response?.data?.error || 'External bank service error',
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw error;
    }
  }

  async depositMoney(data: { amount: number; alias: string; source: string }): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      // Find user by alias
      const user = await this.usersService.findByAlias(data.alias);
      if (!user) {
        return { success: false, error: `User with alias ${data.alias} not found` };
      }

      // Get user's wallet
      const wallet = await this.prisma.wallet.findUnique({
        where: { userId: user.id },
      });
      if (!wallet) {
        return { success: false, error: `Wallet for user ${data.alias} not found` };
      }

      // Use a database transaction to ensure consistency
      const result = await this.prisma.$transaction(async (prisma) => {
        // Create or find system user
        const systemUser = await prisma.user.upsert({
          where: { email: 'system@walle.internal' },
          update: {},
          create: {
            email: 'system@walle.internal',
            alias: 'SYSTEM',
            password: 'N/A',
          },
        });

        // Create or find system wallet
        const systemWallet =
          (await prisma.wallet.findFirst({
            where: { userId: systemUser.id },
          })) ||
          (await prisma.wallet.create({
            data: {
              userId: systemUser.id,
              balance: 0,
            },
          }));

        // Create the transaction
        const transaction = await prisma.transaction.create({
          data: {
            amount: data.amount,
            type: 'IN',
            description: `External transfer from ${data.source}`,
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

        // Update the wallet balance
        const updatedWallet = await prisma.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: {
              increment: data.amount,
            },
          },
        });

        return {
          success: true,
          message: 'Money deposited successfully',
          balance: updatedWallet.balance,
        };
      });

      return result;
    } catch (error) {
      console.error('Error depositing money:', error);
      return { success: false, error: 'Failed to deposit money' };
    }
  }
}
