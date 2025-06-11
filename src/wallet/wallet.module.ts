import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ExternalBankModule } from '../external-bank/external-bank.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PrismaModule, ExternalBankModule, UsersModule],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
