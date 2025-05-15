import { IsNotEmpty, IsNumber, IsString, IsEnum } from 'class-validator';

// las formas de pago -> integro la posibilidad de deb-in (débito)
export enum PaymentMethod {
  BANK_ACCOUNT = 'BANK_ACCOUNT',
  DEBIN = 'DEBIN',
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
