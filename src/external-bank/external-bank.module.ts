import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ExternalBankService } from './external-bank.service';
import { ExternalBankController } from './external-bank.controller';
import { UsersModule } from '../users/users.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ConfigModule, UsersModule, PrismaModule],
  controllers: [ExternalBankController],
  providers: [ExternalBankService],
  exports: [ExternalBankService],
})
export class ExternalBankModule {}
