import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { UsersModule } from '../users/users.module';
import { WalletModule } from '../wallet/wallet.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TransactionsRepository } from './transactions.repository';
@Module({
  imports: [PrismaModule, UsersModule, WalletModule],
  controllers: [TransactionsController],
  providers: [TransactionsService, TransactionsRepository],
  exports: [TransactionsService, TransactionsRepository],
})
export class TransactionsModule {}
