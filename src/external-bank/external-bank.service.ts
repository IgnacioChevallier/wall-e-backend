import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import {
  BankTransferRequest,
  BankTransferResponse,
  DebinRequest,
  DebinResponse,
  BANK_API_ENDPOINTS,
} from './bank-api.interface';

@Injectable()
export class ExternalBankService {
  private readonly bankApiUrl: string;

  constructor(private readonly configService: ConfigService) {
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
}
