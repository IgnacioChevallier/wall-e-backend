import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ExternalBankService } from './external-bank.service';
import { ExternalBankController } from './external-bank.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [ConfigModule, UsersModule, forwardRef(() => import('../wallet/wallet.module'))],
  controllers: [ExternalBankController],
  providers: [ExternalBankService],
  exports: [ExternalBankService],
})
export class ExternalBankModule {}
