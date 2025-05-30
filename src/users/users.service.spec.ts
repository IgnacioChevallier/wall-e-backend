import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRepository } from './user.repository';
import { NotFoundException } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: PrismaService;
  let userRepository: UserRepository;

  const mockPrismaService = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockUserRepository = {
    findAllAliases: jest.fn(),
  };

  const mockUser = {
    id: 'user-id',
    email: 'test@example.com',
    password: 'hashed-password',
    alias: 'testuser_123',
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
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);
    userRepository = module.get<UserRepository>(UserRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user with generated alias', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      const createdUser = {
        ...mockUser,
        email: createUserDto.email,
        password: createUserDto.password,
        alias: 'test_abc', // Generated alias
      };

      mockPrismaService.user.create.mockResolvedValue(createdUser);

      const result = await service.create(createUserDto);

      expect(result).toEqual(createdUser);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: createUserDto.email,
          password: createUserDto.password,
          alias: expect.stringMatching(/^test_[a-z0-9]{3}$/), // Generated alias pattern
          wallet: { create: { balance: 0 } },
        },
      });
    });

    it('should create a new user with provided alias', async () => {
      const createUserDto = {
        email: 'test@example.com',
        password: 'password123',
        alias: 'custom_alias',
      };
      const createdUser = {
        ...mockUser,
        email: createUserDto.email,
        password: createUserDto.password,
        alias: createUserDto.alias,
      };

      mockPrismaService.user.create.mockResolvedValue(createdUser);

      const result = await service.create(createUserDto);

      expect(result).toEqual(createdUser);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: createUserDto.email,
          password: createUserDto.password,
          alias: createUserDto.alias,
          wallet: { create: { balance: 0 } },
        },
      });
    });
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

  describe('findByEmail', () => {
    it('should return a user when found by email', async () => {
      const email = 'test@example.com';
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByEmail(email);

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
    });

    it('should return null when user not found by email', async () => {
      const email = 'nonexistent@example.com';
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail(email);

      expect(result).toBeNull();
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
    });
  });

  describe('findByAlias', () => {
    it('should return a user when found by alias', async () => {
      const alias = 'testuser_123';
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByAlias(alias);

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { alias },
      });
    });

    it('should return null when user not found by alias', async () => {
      const alias = 'nonexistent_alias';
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findByAlias(alias);

      expect(result).toBeNull();
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { alias },
      });
    });
  });

  describe('findAllAliases', () => {
    it('should return all aliases from repository', async () => {
      const mockAliases = ['user1_123', 'user2_456', 'user3_789'];
      mockUserRepository.findAllAliases.mockResolvedValue(mockAliases);

      const result = await service.findAllAliases();

      expect(result).toEqual(mockAliases);
      expect(mockUserRepository.findAllAliases).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update and return a user', async () => {
      const userId = 'user-id';
      const updateDto: UpdateUserDto = {
        email: 'updated@example.com',
        password: 'newPassword123',
      };
      const updatedUser = {
        ...mockUser,
        email: updateDto.email,
        password: updateDto.password,
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
        password: 'newPassword123',
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
