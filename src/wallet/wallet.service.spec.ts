import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from './wallet.service';
import { PrismaService } from '../prisma/prisma.service';
import { ExternalBankService } from '../external-bank/external-bank.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentMethod } from './dto/add-money.dto';

// Mock the PrismaService
const mockPrismaService = {
  wallet: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  transaction: {
    create: jest.fn(),
  },
  $transaction: jest.fn((callback) => callback(mockPrismaService)),
};

// Mock the ExternalBankService
const mockExternalBankService = {
  Transfer: jest.fn(),
  ExecuteDebin: jest.fn(),
};

describe('WalletService', () => {
  let service: WalletService;
  let prismaService: PrismaService;
  let externalBankService: ExternalBankService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ExternalBankService,
          useValue: mockExternalBankService,
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    prismaService = module.get<PrismaService>(PrismaService);
    externalBankService = module.get<ExternalBankService>(ExternalBankService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('addMoney', () => {
    const userId = 'test-user-id';
    const walletId = 'test-wallet-id';
    const amount = 100;
    const method = PaymentMethod.BANK_ACCOUNT;
    const sourceIdentifier = 'test-bank-account';

    const mockWallet = {
      id: walletId,
      userId,
      balance: 0,
    };

    const mockSystemWallet = {
      id: 'system-wallet-id',
      userId: 'SYSTEM',
      balance: 0,
    };

    const mockTransaction = {
      id: 'test-transaction-id',
      amount,
      type: 'IN',
    };

    it('should successfully add money when bank transfer is approved', async () => {
      // Mock successful external bank response
      mockExternalBankService.Transfer.mockResolvedValue({
        success: true,
        transactionId: 'test-tx-id',
      });

      // Mock wallet lookup
      mockPrismaService.wallet.findUnique.mockResolvedValue(mockWallet);
      mockPrismaService.wallet.findFirst.mockResolvedValue(mockSystemWallet);
      mockPrismaService.transaction.create.mockResolvedValue(mockTransaction);
      mockPrismaService.wallet.update.mockResolvedValue({
        ...mockWallet,
        balance: amount,
      });

      const result = await service.addMoney(userId, {
        amount,
        method,
        sourceIdentifier,
      });

      expect(result.success).toBe(true);
      expect(result.balance).toBe(amount);
      expect(mockExternalBankService.Transfer).toHaveBeenCalledWith({
        amount,
        toWalletId: walletId,
        source: sourceIdentifier,
      });
    });

    it('should throw BadRequestException when bank transfer is declined', async () => {
      // Mock failed external bank response
      mockExternalBankService.Transfer.mockResolvedValue({
        success: false,
        error: 'Transaction declined by bank',
      });

      mockPrismaService.wallet.findUnique.mockResolvedValue(mockWallet);

      await expect(
        service.addMoney(userId, {
          amount,
          method,
          sourceIdentifier,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when wallet is not found', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue(null);

      await expect(
        service.addMoney(userId, {
          amount,
          method,
          sourceIdentifier,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('requestDebin', () => {
    const userId = 'test-user-id';
    const walletId = 'test-wallet-id';
    const amount = 100;

    const mockWallet = {
      id: walletId,
      userId,
      balance: 0,
    };

    const mockSystemWallet = {
      id: 'system-wallet-id',
      userId: 'SYSTEM',
      balance: 0,
    };

    const mockTransaction = {
      id: 'test-transaction-id',
      amount,
      type: 'IN',
    };

    it('should successfully process DEBIN when approved', async () => {
      // Mock successful DEBIN response
      mockExternalBankService.ExecuteDebin.mockResolvedValue({
        approved: true,
        debinId: 'test-debin-id',
      });

      // Mock database operations
      mockPrismaService.wallet.findUnique.mockResolvedValue(mockWallet);
      mockPrismaService.wallet.findFirst.mockResolvedValue(mockSystemWallet);
      mockPrismaService.transaction.create.mockResolvedValue(mockTransaction);
      mockPrismaService.wallet.update.mockResolvedValue({
        ...mockWallet,
        balance: amount,
      });

      const result = await service.requestDebin(userId, amount);

      expect(result.success).toBe(true);
      expect(result.balance).toBe(amount);
      expect(mockExternalBankService.ExecuteDebin).toHaveBeenCalledWith({
        amount,
        toWalletId: walletId,
      });
    });

    it('should throw BadRequestException when DEBIN is not approved', async () => {
      // Mock rejected DEBIN response
      mockExternalBankService.ExecuteDebin.mockResolvedValue({
        approved: false,
        error: 'DEBIN request not approved',
      });

      mockPrismaService.wallet.findUnique.mockResolvedValue(mockWallet);

      await expect(service.requestDebin(userId, amount)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when wallet is not found', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue(null);

      await expect(service.requestDebin(userId, amount)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
