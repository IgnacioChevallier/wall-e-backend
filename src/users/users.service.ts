import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '../../generated/prisma';
import { CreateUserDto } from 'src/auth/dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto): Promise<User> {
    let { email, password, alias } = dto;
    if (!alias) { alias = generateAlias(email); }
  
    const hashedPassword = await bcrypt.hash(password, 10);
    return this.prisma.user.create({
      data: { 
        email, 
        password: hashedPassword, 
        alias, 
        wallet: { create: { balance: 0 } } 
      },
    });
  }

  async findAll(): Promise<User[]> {
    return await (this.prisma.user as any).findMany();
  }

  async findOne(id: string): Promise<User> {
    const user = await (this.prisma.user as any).findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return user;
  }

  async findByEmailOrAlias(identifier: string): Promise<User | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { alias: identifier }],
      },
    });
    if (!user) {
      throw new NotFoundException(
        `User with email or alias ${identifier} not found`,
      );
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByAlias(alias: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { alias } });
  }

  async update(id: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: { ...dto },
    });
  }

  async remove(id: string): Promise<User> {
    return await (this.prisma.user as any).delete({ where: { id } });
  }
}

function generateAlias(email: string): string {
  const namePart = email.split('@')[0]; // Get the part before the '@'
  const randomSuffix = Math.random().toString(36).substring(2, 5); // Generate a random suffix
  return `${namePart}_${randomSuffix}`; // Combine to form the alias
}
