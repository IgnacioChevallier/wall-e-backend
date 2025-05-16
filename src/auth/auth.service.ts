import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from '../../generated/prisma';
import { LoginDto } from './dto/login.dto';

export interface AuthResponse {
  accessToken: string;
  user: Omit<User, 'password'>;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(createUserDto: CreateUserDto): Promise<AuthResponse> {
    const { email, password, alias } = createUserDto;

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

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const user: User = await this.usersService.create({
        email,
        password: hashedPassword,
        alias,
      });

      const { password: _, ...userWithoutPassword } = user;
      const payload = { email: user.email, userId: user.id };
      const accessToken = this.jwtService.sign(payload);

      return { accessToken, user: userWithoutPassword };
    } catch (error) {
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

    const user = await this.usersService.findByEmail(email);

    if (
      user &&
      user.password &&
      (await bcrypt.compare(password, user.password))
    ) {
      const { password: _, ...userWithoutPassword } = user;
      const payload = { email: user.email, userId: user.id };
      const accessToken = this.jwtService.sign(payload);
      return { accessToken, user: userWithoutPassword };
    }
    throw new UnauthorizedException('Please check your login credentials');
  }
}
