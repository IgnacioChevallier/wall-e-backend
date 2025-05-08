import { ForbiddenException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRepository } from '../users/user.repository';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private repository: UserRepository,
    private jwt: JwtService,
  ) {}

  // Register method for user registration
  async register(dto: RegisterUserDto) {
    const hash: string = await bcrypt.hash(dto.password, 10);

    // Check if user already exists
    const existingUser = await this.repository.findUserByEmail(dto.email);

    if (existingUser) {
      throw new ForbiddenException('Email already in use');
    }

    // Create the new user
    const user = await this.repository.createUser(dto.email, hash);

    // Sign and return the JWT token
    return this.signToken(user.id, user.email);
  }

  // Login method for user authentication
  async login(dto: LoginUserDto) {
    const user = await this.repository.findUserByEmail(dto.email);
    if (!user) throw new ForbiddenException('Credentials incorrect');

    const pwMatches = await bcrypt.compare(dto.password, user.password);
    if (!pwMatches) throw new ForbiddenException('Credentials incorrect');

    return this.signToken(user.id, user.email);
  }

  // Private method to sign JWT token
  private async signToken(userId: string, email: string) {
    const payload = { sub: userId, email };
    const token = await this.jwt.signAsync(payload);
    return { access_token: token };
  }
}
