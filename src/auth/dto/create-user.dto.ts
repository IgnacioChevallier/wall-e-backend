import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, Matches, MaxLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  // You might want to add regex for password complexity if needed
  // @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, { message: 'Password too weak' })
  password: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  // Example: Allow only alphanumeric characters and underscores for alias
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Alias can only contain alphanumeric characters and underscores',
  })
  alias?: string;
} 