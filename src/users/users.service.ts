import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { User, Prisma } from '../../generated/prisma';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<User[]> {
    return await (this.prisma.user as any).findMany();
  }

  async findOne(id: string): Promise<User> {
    const user = await (this.prisma.user as any).findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    return await (this.prisma.user as any).update({
      where: { id },
      data: { ...dto },
    });
  }

  async remove(id: string): Promise<User> {
    return await (this.prisma.user as any).delete({ where: { id } });
  }
}
