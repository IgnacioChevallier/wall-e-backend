import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class WithdrawMoneyDto {
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsNotEmpty()
  @IsString()
  bankAccount: string; // CBU/Alias de la cuenta de destino
} 