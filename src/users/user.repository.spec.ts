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
  });

  describe('createUser', () => {
    const email = 'test@example.com';
    const password = 'hashed-password';
    const mockCreatedUser = {
      id: 'user-id',
      email,
      password,
      wallet: {
        id: 'wallet-id',
        balance: 0,
        userId: 'user-id',
      },
    };

    it('should create user with wallet', async () => {
      mockPrismaService.user.create.mockResolvedValue(mockCreatedUser);

      const result = await repository.createUser(email, password);

      expect(result).toEqual(mockCreatedUser);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          email,
          password,
          wallet: {
            create: { balance: 0 },
          },
        },
        include: { wallet: true },
      });
    });
  });
});
