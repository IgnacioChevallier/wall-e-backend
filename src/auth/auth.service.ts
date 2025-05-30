import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtService } from '@nestjs/jwt';
import { User } from '../../generated/prisma';
import { LoginDto } from './dto/login.dto';
import { Response } from 'express';

export interface AuthResponse {
  accessToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  // Method for testing purposes
  generateJwt(payload: { sub: string; email: string }): string {
    return this.jwtService.sign({ email: payload.email, userId: payload.sub });
  }

  async register(createUserDto: CreateUserDto): Promise<AuthResponse> {
    const { email, password, alias } = createUserDto;

    try {
      const existingUserByEmail = await this.usersService
        .findByEmail(email)
        .catch(() => null);

      if (existingUserByEmail) {
        throw new ConflictException('Email already exists');
      }

      if (alias) {
        const existingUserByAlias = await this.usersService
          .findByAlias(alias)
          .catch(() => null);
        if (existingUserByAlias) {
          throw new ConflictException('Alias already exists');
        }
      }

      const user: User = await this.usersService.create({
        email,
        password,
        alias,
      });

      const payload = { email: user.email, userId: user.id };
      const accessToken = this.jwtService.sign(payload);

      return { accessToken };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (error.code === 'P2002') {
        throw new ConflictException(
          'User with this email or alias already exists (from database constraint).',
        );
      }
      console.error('Error during user registration:', error);
      throw new InternalServerErrorException(
        'Could not create user due to an unexpected error.',
      );
    }
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password } = loginDto;

    try {
      const user = await this.usersService.findByEmail(email);

      if (!user) {
        throw new UnauthorizedException('Please check your login credentials');
      }

      const isPasswordValid = user.password === password;

      if (isPasswordValid) {
        const payload = { email: user.email, userId: user.id };
        const accessToken = this.jwtService.sign(payload);
        return { accessToken };
      }

      throw new UnauthorizedException('Please check your login credentials');
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error during login:', error);
      throw new InternalServerErrorException(
        'An unexpected error occurred during login',
      );
    }
  }

  logout(response: Response): { success: boolean } {
    response.clearCookie('access_token');
    return { success: true };
  }
}
