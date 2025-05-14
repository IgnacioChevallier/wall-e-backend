import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from './wallet.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('WalletService', () => {
  let service: WalletService;

  const mockPrismaService = {
    wallet: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getWalletBalance', () => {
    const userId = 'test-user-id';
    const mockWallet = { balance: 100 };

    it('should return wallet balance when wallet exists', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue(mockWallet);

      const result = await service.getWalletBalance(userId);

      expect(result).toBe(100);
      expect(mockPrismaService.wallet.findUnique).toHaveBeenCalledWith({
        where: { userId },
        select: { balance: true },
      });
    });

    it('should throw NotFoundException when wallet does not exist', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue(null);

      await expect(service.getWalletBalance(userId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.wallet.findUnique).toHaveBeenCalledWith({
        where: { userId },
        select: { balance: true },
      });
    });
  });

  describe('getWalletDetails', () => {
    const userId = 'test-user-id';
    const mockWallet = {
      id: 'wallet-id',
      balance: 100,
      userId,
      transactions: [
        {
          id: 'transaction-1',
          amount: 50,
          type: 'IN',
          description: 'Test transaction',
          createdAt: new Date(),
        },
      ],
    };

    it('should return wallet details with transactions when wallet exists', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue(mockWallet);

      const result = await service.getWalletDetails(userId);

      expect(result).toEqual(mockWallet);
      expect(mockPrismaService.wallet.findUnique).toHaveBeenCalledWith({
        where: { userId },
        include: {
          transactions: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });
    });

    it('should throw NotFoundException when wallet does not exist', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue(null);

      await expect(service.getWalletDetails(userId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.wallet.findUnique).toHaveBeenCalledWith({
        where: { userId },
        include: {
          transactions: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });
    });
  });
});
