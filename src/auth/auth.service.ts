import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
// import { LoginDto } from '../users/dto/login-user.dto';
// import { RegisterDto } from '../users/dto/register-user.dto';
import { JwtService } from '@nestjs/jwt';
// import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  // async register(dto: RegisterDto) {
  //   const hash: string = await bcrypt.hash(dto.password, 10);
  //
  //   // Check if user already exists
  //   const user = await this.prisma.user.create({
  //     data: { email: dto.email, password: hash },
  //   });
  //
  //   return this.signToken(user.id, user.email);
  // }

  // async login(dto: LoginDto) {
  //   const user = await this.prisma.user.findUnique({
  //     where: { email: dto.email },
  //   });
  //   if (!user) throw new ForbiddenException('Credentials incorrect');
  //
  //   const pwMatches = await bcrypt.compare(dto.password, user.password);
  //   if (!pwMatches) throw new ForbiddenException('Credentials incorrect');
  //
  //   return this.signToken(user.id, user.email);
  // }

  private async signToken(userId: string, email: string) {
    const payload = { sub: userId, email };
    const token = await this.jwt.signAsync(payload);
    return { access_token: token };
  }
}
