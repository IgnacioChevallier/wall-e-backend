import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class P2PTransferDto {
  @IsString()
  @IsNotEmpty()
  recipientIdentifier: string; // Email or alias

  @IsNumber()
  @Min(0.01) // Assuming a minimum transfer amount
  amount: number;
} 