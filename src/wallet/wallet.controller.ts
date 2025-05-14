import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { AddMoneyDto } from './dto/add-money.dto';
import { WithdrawMoneyDto } from './dto/withdraw-money.dto';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  async getBalance(@Request() req) {
    return {
      balance: await this.walletService.getWalletBalance(req.user.sub)
    };
  }

  @Get()
  async getWalletDetails(@Request() req) {
    return this.walletService.getWalletDetails(req.user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.walletService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateWalletDto: UpdateWalletDto) {
    return this.walletService.update(id, updateWalletDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.walletService.remove(id);
  }

  // estos dos endpoints son para la integración con medio externo de pago
  @Post('deposit')
  async addMoney(@Request() req, @Body() addMoneyDto: AddMoneyDto) {
    return this.walletService.addMoney(req.user.sub, addMoneyDto);
  }

  @Post('withdraw')
  async withdrawMoney(@Request() req, @Body() withdrawDto: WithdrawMoneyDto) {
    return this.walletService.withdrawMoney(req.user.sub, withdrawDto);
  }
}
