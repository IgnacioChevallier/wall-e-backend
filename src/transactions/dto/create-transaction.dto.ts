import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  IsPositive,
} from 'class-validator';
import { TransactionType } from '../../../generated/prisma'; // Adjust path if necessary

export class CreateTransactionDto {
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  amount: number;

  @IsEnum(TransactionType)
  @IsNotEmpty()
  type: TransactionType;

  @IsString()
  @IsNotEmpty()
  walletId: string;

  @IsString()
  @IsOptional()
  description?: string;
}
