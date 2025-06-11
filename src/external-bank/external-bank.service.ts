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
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class ExternalBankService {
  private readonly bankApiUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => WalletService))
    private readonly walletService: WalletService,
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
      const wallet = await this.walletService.getWalletByUserId(user.id);
      if (!wallet) {
        return { success: false, error: `Wallet for user ${data.alias} not found` };
      }

      // Add money to the wallet (this will create the necessary transaction records)
      await this.walletService.addMoneyDirect(user.id, {
        amount: data.amount,
        description: `External transfer from ${data.source}`,
        source: data.source,
      });

      return { success: true, message: 'Money deposited successfully' };
    } catch (error) {
      console.error('Error depositing money:', error);
      return { success: false, error: 'Failed to deposit money' };
    }
  }
}
