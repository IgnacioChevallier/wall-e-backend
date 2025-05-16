import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { P2PTransferDto } from './dto/p2p-transfer.dto';
import { Transaction } from '../../generated/prisma';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('p2p')
  @UseGuards(AuthGuard('jwt'))
  async p2pTransfer(@Request() req, @Body() p2pTransferDto: P2PTransferDto) {
    const senderId = req.user?.id;
    if (!senderId) {
      throw new Error('User not authenticated');
    }
    return this.transactionsService.createP2PTransfer(senderId, p2pTransferDto);
  }

  @Post()
  async create(
    @Body() createTransactionDto: CreateTransactionDto,
  ): Promise<Transaction> {
    return this.transactionsService.create(createTransactionDto);
  }

  @Get()
  async findAll(): Promise<Transaction[]> {
    return this.transactionsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Transaction> {
    return this.transactionsService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
  ): Promise<Transaction> {
    return this.transactionsService.update(id, updateTransactionDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<Transaction> {
    return this.transactionsService.remove(id);
  }
}
