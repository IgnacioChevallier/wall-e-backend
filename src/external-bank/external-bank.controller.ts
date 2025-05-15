import { Controller, Post, Body } from '@nestjs/common';
import { ExternalBankService } from './external-bank.service';

@Controller('bank')
export class ExternalBankController {
  constructor(private readonly externalBankService: ExternalBankService) {}

  @Post('/transfer')
  async simulateTransfer(
    @Body() data: { amount: number; toWalletId: string; source: string },
  ) {
    return this.externalBankService.Transfer(data);
  }

  @Post('/debin-request')
  async simulateDebin(
    @Body() data: { amount: number; toWalletId: string },
  ) {
    return this.externalBankService.ExecuteDebin(data);
  }
} 