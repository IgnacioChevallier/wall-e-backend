import { IsNotEmpty, IsNumber, IsString, IsEnum } from 'class-validator';

// las formas de pago -> integro la posibilidad de deb-in (débito)
export enum PaymentMethod {
  BANK_ACCOUNT = 'BANK_ACCOUNT',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
}

export class AddMoneyDto {
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsNotEmpty()
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsString()
  sourceIdentifier?: string; // CBU/Alias
}
