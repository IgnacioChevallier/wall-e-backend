import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  Post,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { AddMoneyDto } from './dto/add-money.dto';
import { WithdrawMoneyDto } from './dto/withdraw-money.dto';

interface RequestWithUser {
  user: {
    sub: string;
  };
}

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  async getBalance(@Request() req: RequestWithUser) {
    return {
      balance: await this.walletService.getWalletBalance(req.user.sub),
    };
  }

  @Get()
  async getWalletDetails(@Request() req: RequestWithUser) {
    return this.walletService.getWalletDetails(req.user.sub);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<any> {
    return await this.walletService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateWalletDto: UpdateWalletDto,
  ): Promise<any> {
    return await this.walletService.update(id, updateWalletDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<any> {
    return await this.walletService.remove(id);
  }

  // estos dos endpoints son para la integración con medio externo de pago
  @Post('deposit')
  async addMoney(@Request() req, @Body() addMoneyDto: AddMoneyDto) {
    return this.walletService.addMoney(req.user.sub, addMoneyDto);
  }

  @Post('topup/manual')
  async addMoneyManual(@Request() req, @Body() addMoneyDto: AddMoneyDto) {
    return this.walletService.addMoney(req.user.id, addMoneyDto);
  }

  @Post('topup/debin')
  async requestDebin(@Request() req, @Body() data: { amount: number }) {
    return this.walletService.requestDebin(req.user.id, data.amount);
  }
}
