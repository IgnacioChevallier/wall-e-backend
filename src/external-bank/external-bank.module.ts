import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ExternalBankService } from './external-bank.service';

@Module({
  imports: [ConfigModule],
  providers: [ExternalBankService],
  exports: [ExternalBankService],
})
export class ExternalBankModule {} 