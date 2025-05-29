import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ExternalBankService } from './external-bank.service';
import { ExternalBankController } from './external-bank.controller';

@Module({
  imports: [ConfigModule],
  controllers: [ExternalBankController],
  providers: [ExternalBankService],
  exports: [ExternalBankService],
})
export class ExternalBankModule {}
