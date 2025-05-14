import { IsNotEmpty, IsNumber, IsPositive, IsString, Min } from 'class-validator';

export class P2PTransferDto {
  @IsString()
  @IsNotEmpty()
  recipientIdentifier: string;

  @IsNumber()
  @Min(0.01)
  @IsPositive()
  amount: number;
} 