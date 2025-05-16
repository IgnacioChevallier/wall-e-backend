import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';
import { UsersService } from '../users/users.service'; // Adjust path if needed
import { ConfigService } from '@nestjs/config'; // For securely accessing JWT_SECRET

export interface JwtPayload {
  userId: string;
  email: string;
  walletId: string;
}

// Custom extractor function to get token from cookie
const cookieExtractor = (req: Request): string | null => {
  let token = null;
  if (req && req.cookies) {
    token = req.cookies['access_token']; // Ensure cookie name matches what you set
  }
  return token;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private usersService: UsersService,
    private configService: ConfigService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error(
        'JWT_SECRET not found in configuration. Please set it in your .env file or environment variables.',
      );
    }
    super({
      jwtFromRequest: cookieExtractor,
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<any> {
    if (!payload || !payload.userId) {
      throw new UnauthorizedException('Invalid token payload');
    }
    const user = await this.usersService.findOne(payload.userId);
    if (!user) {
      throw new UnauthorizedException('User not found or deactivated');
    }

    return { id: user.id, email: user.email, alias: user.alias };
  }
}
