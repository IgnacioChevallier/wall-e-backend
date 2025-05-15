import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockUser = {
    id: 'user-id',
    email: 'test@example.com',
    password: 'hashed-password',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const mockUsers = [
        mockUser,
        { ...mockUser, id: 'user-id-2', email: 'test2@example.com' },
      ];
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.findAll();

      expect(result).toEqual(mockUsers);
      expect(mockPrismaService.user.findMany).toHaveBeenCalled();
    });

    it('should return an empty array when no users exist', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
      expect(mockPrismaService.user.findMany).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockPrismaService.user.findMany.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.findAll()).rejects.toThrow('Database error');
      expect(mockPrismaService.user.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a user when found', async () => {
      const userId = 'user-id';
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne(userId);

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      const userId = 'non-existent-id';
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne(userId)).rejects.toThrow(
        new NotFoundException(`User with ID ${userId} not found`),
      );
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });

    it('should handle database errors', async () => {
      const userId = 'user-id';
      mockPrismaService.user.findUnique.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.findOne(userId)).rejects.toThrow('Database error');
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });
  });

  describe('update', () => {
    it('should update and return a user', async () => {
      const userId = 'user-id';
      const updateDto: UpdateUserDto = {
        email: 'updated@example.com',
        password: 'newPassword12345',
      };
      const updatedUser = {
        ...mockUser,
        email: updateDto.email,
        password: 'new-hashed-password',
        updatedAt: new Date(),
      };

      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.update(userId, updateDto);

      expect(result).toEqual(updatedUser);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateDto,
      });
    });

    it('should handle database errors including non-existent user', async () => {
      const userId = 'non-existent-id';
      const updateDto: UpdateUserDto = {
        email: 'updated@example.com',
        password: 'newPassword12345',
      };

      mockPrismaService.user.update.mockRejectedValue(
        new Error('Record to update not found'),
      );

      await expect(service.update(userId, updateDto)).rejects.toThrow(
        'Record to update not found',
      );
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateDto,
      });
    });
  });

  describe('remove', () => {
    it('should delete and return a user', async () => {
      const userId = 'user-id';
      mockPrismaService.user.delete.mockResolvedValue(mockUser);

      const result = await service.remove(userId);

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });

    it('should handle database errors including non-existent user', async () => {
      const userId = 'non-existent-id';

      mockPrismaService.user.delete.mockRejectedValue(
        new Error('Record to delete not found'),
      );

      await expect(service.remove(userId)).rejects.toThrow(
        'Record to delete not found',
      );
      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });
  });
});
