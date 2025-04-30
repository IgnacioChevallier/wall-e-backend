import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await (this.$connect as () => Promise<void>)();
  }
  async onModuleDestroy() {
    await (this.$disconnect as () => Promise<void>)();
  }
}
