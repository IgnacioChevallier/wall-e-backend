import { Test, TestingModule } from '@nestjs/testing';
import { UserRepository } from './user.repository';
import { PrismaService } from '../prisma/prisma.service';

describe('UserRepository', () => {
  let repository: UserRepository;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<UserRepository>(UserRepository);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findUserByEmail', () => {
    const email = 'test@example.com';
    const mockUser = {
      id: 'user-id',
      email,
      password: 'hashed-password',
    };

    it('should return user when found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await repository.findUserByEmail(email);

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
    });

    it('should return null when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await repository.findUserByEmail(email);

      expect(result).toBeNull();
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
    });

    it('should handle database errors', async () => {
      mockPrismaService.user.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(repository.findUserByEmail(email)).rejects.toThrow('Database error');
    });
  });

  describe('findUserWithWallet', () => {
    const email = 'test@example.com';
    const mockUserWithWallet = {
      id: 'user-id',
      email,
      password: 'hashed-password',
      wallet: {
        id: 'wallet-id',
        balance: 100,
        userId: 'user-id',
      },
    };

    it('should return user with wallet when found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUserWithWallet);

      const result = await repository.findUserWithWallet(email);

      expect(result).toEqual(mockUserWithWallet);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
        include: { wallet: true },
      });
    });

    it('should return user with null wallet when wallet not found', async () => {
      const userWithoutWallet = {
        id: 'user-id',
        email,
        password: 'hashed-password',
        wallet: null,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(userWithoutWallet);

      const result = await repository.findUserWithWallet(email);

      expect(result).toEqual(userWithoutWallet);
      expect(result?.wallet).toBeNull();
    });

    it('should return null when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await repository.findUserWithWallet(email);

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      mockPrismaService.user.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(repository.findUserWithWallet(email)).rejects.toThrow('Database error');
    });
  });

  describe('createUser', () => {
    const email = 'test@example.com';
    const password = 'hashed-password';
    const alias = 'testAlias';
    const mockCreatedUser = {
      id: 'user-id',
      email,
      password,
      alias,
      wallet: {
        id: 'wallet-id',
        balance: 0,
        userId: 'user-id',
      },
    };

    it('should create user with wallet', async () => {
      mockPrismaService.user.create.mockResolvedValue(mockCreatedUser);

      const result = await repository.createUser(email, password, alias);

      expect(result).toEqual(mockCreatedUser);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          email,
          password,
          alias,
          wallet: {
            create: { balance: 0 }
          }
        },
        include: { wallet: true }
      });
    });

    it('should handle database errors during user creation', async () => {
      mockPrismaService.user.create.mockRejectedValue(new Error('Database error'));

      await expect(repository.createUser(email, password, alias)).rejects.toThrow('Database error');
    });
  });
});