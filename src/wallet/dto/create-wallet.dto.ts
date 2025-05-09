import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateWalletDto {
    @IsNotEmpty()
    @IsNumber()
    balance: number;

    @IsNotEmpty()
    @IsString()
    userId: string;
}
