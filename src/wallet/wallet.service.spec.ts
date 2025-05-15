import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from './wallet.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { TransactionType } from '../../generated/prisma';

describe('WalletService', () => {
  let service: WalletService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    wallet: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockWallet = {
    id: 'wallet-id',
    userId: 'user-id',
    balance: 100.0,
    user: {
      id: 'user-id',
      email: 'user@example.com',
      alias: 'username',
      password: 'hashed-password',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    initiatedTransactions: [],
    receivedTransactions: [],
    allTransactions: [],
  };

  const mockWalletWithTransactions = {
    ...mockWallet,
    allTransactions: [
      {
        id: 'transaction-1',
        amount: 50.0,
        type: TransactionType.IN,
        description: 'Deposit',
        createdAt: new Date(),
        senderWalletId: 'external-wallet',
        receiverWalletId: 'wallet-id',
        effectedWalletId: 'wallet-id',
      },
      {
        id: 'transaction-2',
        amount: 25.0,
        type: TransactionType.OUT,
        description: 'Withdrawal',
        createdAt: new Date(),
        senderWalletId: 'wallet-id',
        receiverWalletId: 'external-wallet',
        effectedWalletId: 'wallet-id',
      },
    ],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

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
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a wallet with initial balance of 0', async () => {
      const userId = 'user-id';
      mockPrismaService.wallet.create.mockResolvedValue({ ...mockWallet, balance: 0 });

      const result = await service.create(userId);

      expect(result).toEqual({ ...mockWallet, balance: 0 });
      expect(mockPrismaService.wallet.create).toHaveBeenCalledWith({
        data: { userId, balance: 0 },
      });
    });

    it('should handle database errors during wallet creation', async () => {
      const userId = 'user-id';
      mockPrismaService.wallet.create.mockRejectedValue(new Error('Database error'));

      await expect(service.create(userId)).rejects.toThrow('Database error');
    });
  });

  describe('findOne', () => {
    it('should return a wallet when found', async () => {
      const walletId = 'wallet-id';
      mockPrismaService.wallet.findUnique.mockResolvedValue(mockWallet);

      const result = await service.findOne(walletId);

      expect(result).toEqual(mockWallet);
      expect(mockPrismaService.wallet.findUnique).toHaveBeenCalledWith({
        where: { id: walletId },
      });
    });

    it('should return null when wallet not found', async () => {
      const walletId = 'non-existent-id';
      mockPrismaService.wallet.findUnique.mockResolvedValue(null);

      const result = await service.findOne(walletId);

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      const walletId = 'wallet-id';
      mockPrismaService.wallet.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(service.findOne(walletId)).rejects.toThrow('Database error');
    });
  });

  describe('update', () => {
    it('should update a wallet', async () => {
      const walletId = 'wallet-id';
      const updateDto = { balance: 150.0 };
      const updatedWallet = { ...mockWallet, balance: 150.0 };
      
      mockPrismaService.wallet.update.mockResolvedValue(updatedWallet);

      const result = await service.update(walletId, updateDto);

      expect(result).toEqual(updatedWallet);
      expect(mockPrismaService.wallet.update).toHaveBeenCalledWith({
        where: { id: walletId },
        data: updateDto,
      });
    });

    it('should handle database errors during update', async () => {
      const walletId = 'wallet-id';
      const updateDto = { balance: 150.0 };
      
      mockPrismaService.wallet.update.mockRejectedValue(new Error('Database error'));

      await expect(service.update(walletId, updateDto)).rejects.toThrow('Database error');
    });
  });

  describe('remove', () => {
    it('should delete a wallet', async () => {
      const walletId = 'wallet-id';
      mockPrismaService.wallet.delete.mockResolvedValue(mockWallet);

      const result = await service.remove(walletId);

      expect(result).toEqual(mockWallet);
      expect(mockPrismaService.wallet.delete).toHaveBeenCalledWith({
        where: { id: walletId },
      });
    });

    it('should handle database errors during deletion', async () => {
      const walletId = 'wallet-id';
      mockPrismaService.wallet.delete.mockRejectedValue(new Error('Database error'));

      await expect(service.remove(walletId)).rejects.toThrow('Database error');
    });
  });

  describe('getWalletBalance', () => {
    it('should return wallet balance when wallet found', async () => {
      const userId = 'user-id';
      mockPrismaService.wallet.findUnique.mockResolvedValue(mockWallet);

      const result = await service.getWalletBalance(userId);

      expect(result).toEqual(mockWallet.balance);
      expect(mockPrismaService.wallet.findUnique).toHaveBeenCalledWith({
        where: { userId },
      });
    });

    it('should throw NotFoundException when wallet not found', async () => {
      const userId = 'non-existent-user';
      mockPrismaService.wallet.findUnique.mockResolvedValue(null);

      await expect(service.getWalletBalance(userId)).rejects.toThrow(
        new NotFoundException('Wallet not found')
      );
    });

    it('should handle database errors', async () => {
      const userId = 'user-id';
      mockPrismaService.wallet.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(service.getWalletBalance(userId)).rejects.toThrow('Database error');
    });
  });

  describe('getWalletDetails', () => {
    it('should return wallet with transactions when wallet found', async () => {
      const userId = 'user-id';
      mockPrismaService.wallet.findUnique.mockResolvedValue(mockWalletWithTransactions);

      const result = await service.getWalletDetails(userId);

      expect(result).toEqual(mockWalletWithTransactions);
      expect(mockPrismaService.wallet.findUnique).toHaveBeenCalledWith({
        where: { userId },
        include: {
          allTransactions: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });
    });

    it('should throw NotFoundException when wallet not found', async () => {
      const userId = 'non-existent-user';
      mockPrismaService.wallet.findUnique.mockResolvedValue(null);

      await expect(service.getWalletDetails(userId)).rejects.toThrow(
        new NotFoundException('Wallet not found')
      );
    });

    it('should handle database errors', async () => {
      const userId = 'user-id';
      mockPrismaService.wallet.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(service.getWalletDetails(userId)).rejects.toThrow('Database error');
    });
  });
});
