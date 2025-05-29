import { Test, TestingModule } from '@nestjs/testing';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { NotFoundException } from '@nestjs/common';

// Import the RequestWithUser interface or define it locally
interface RequestWithUser {
  user: {
    id: string;
    email: string;
    alias: string;
  };
}

describe('WalletController', () => {
  let controller: WalletController;
  let service: WalletService;

  const mockWalletService = {
    getWalletBalance: jest.fn(),
    getWalletDetails: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockWallet = {
    id: 'wallet-id',
    userId: 'user-id',
    balance: 100,
    transactions: [
      {
        id: 'transaction-id',
        amount: 50,
        type: 'IN',
        description: 'Test deposit',
        createdAt: new Date(),
        walletId: 'wallet-id',
      },
    ],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletController],
      providers: [
        {
          provide: WalletService,
          useValue: mockWalletService,
        },
      ],
    }).compile();

    controller = module.get<WalletController>(WalletController);
    service = module.get<WalletService>(WalletService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getBalance', () => {
    it('should return the wallet balance for authenticated user', async () => {
      const mockReq: RequestWithUser = { 
        user: { 
          id: 'user-id', 
          email: 'test@example.com', 
          alias: 'testuser' 
        } 
      };
      mockWalletService.getWalletBalance.mockResolvedValue(100);

      const result = await controller.getBalance(mockReq);

      expect(result).toEqual({ balance: 100 });
      expect(mockWalletService.getWalletBalance).toHaveBeenCalledWith(
        'user-id',
      );
    });

    it('should handle errors from walletService.getWalletBalance', async () => {
      const mockReq: RequestWithUser = { 
        user: { 
          id: 'user-id', 
          email: 'test@example.com', 
          alias: 'testuser' 
        } 
      };
      mockWalletService.getWalletBalance.mockRejectedValue(
        new NotFoundException('Wallet not found'),
      );

      await expect(controller.getBalance(mockReq)).rejects.toThrow(
        new NotFoundException('Wallet not found'),
      );
      expect(mockWalletService.getWalletBalance).toHaveBeenCalledWith(
        'user-id',
      );
    });
  });

  describe('getWalletDetails', () => {
    it('should return wallet details for authenticated user', async () => {
      const mockReq: RequestWithUser = { 
        user: { 
          id: 'user-id', 
          email: 'test@example.com', 
          alias: 'testuser' 
        } 
      };
      mockWalletService.getWalletDetails.mockResolvedValue(mockWallet);

      const result = await controller.getWalletDetails(mockReq);

      expect(result).toEqual(mockWallet);
      expect(mockWalletService.getWalletDetails).toHaveBeenCalledWith(
        'user-id',
      );
    });

    it('should handle errors from walletService.getWalletDetails', async () => {
      const mockReq: RequestWithUser = { 
        user: { 
          id: 'user-id', 
          email: 'test@example.com', 
          alias: 'testuser' 
        } 
      };
      mockWalletService.getWalletDetails.mockRejectedValue(
        new NotFoundException('Wallet not found'),
      );

      await expect(controller.getWalletDetails(mockReq)).rejects.toThrow(
        new NotFoundException('Wallet not found'),
      );
      expect(mockWalletService.getWalletDetails).toHaveBeenCalledWith(
        'user-id',
      );
    });
  });

  describe('findOne', () => {
    it('should return wallet by id', async () => {
      const walletId = 'wallet-id';
      mockWalletService.findOne.mockResolvedValue(mockWallet);

      const result = await controller.findOne(walletId);

      expect(result).toEqual(mockWallet);
      expect(mockWalletService.findOne).toHaveBeenCalledWith(walletId);
    });

    it('should return null when wallet not found', async () => {
      const walletId = 'non-existent-id';
      mockWalletService.findOne.mockResolvedValue(null);

      const result = await controller.findOne(walletId);

      expect(result).toBeNull();
      expect(mockWalletService.findOne).toHaveBeenCalledWith(walletId);
    });

    it('should handle errors from walletService.findOne', async () => {
      const walletId = 'wallet-id';
      mockWalletService.findOne.mockRejectedValue(new Error('Database error'));

      await expect(controller.findOne(walletId)).rejects.toThrow(
        'Database error',
      );
      expect(mockWalletService.findOne).toHaveBeenCalledWith(walletId);
    });
  });

  describe('update', () => {
    it('should update wallet', async () => {
      const walletId = 'wallet-id';
      const updateDto: UpdateWalletDto = { balance: 150 };
      const updatedWallet = { ...mockWallet, balance: 150 };

      mockWalletService.update.mockResolvedValue(updatedWallet);

      const result = await controller.update(walletId, updateDto);

      expect(result).toEqual(updatedWallet);
      expect(mockWalletService.update).toHaveBeenCalledWith(
        walletId,
        updateDto,
      );
    });

    it('should handle errors from walletService.update', async () => {
      const walletId = 'wallet-id';
      const updateDto: UpdateWalletDto = { balance: 150 };

      mockWalletService.update.mockRejectedValue(new Error('Database error'));

      await expect(controller.update(walletId, updateDto)).rejects.toThrow(
        'Database error',
      );
      expect(mockWalletService.update).toHaveBeenCalledWith(
        walletId,
        updateDto,
      );
    });
  });

  describe('remove', () => {
    it('should delete wallet', async () => {
      const walletId = 'wallet-id';
      mockWalletService.remove.mockResolvedValue(mockWallet);

      const result = await controller.remove(walletId);

      expect(result).toEqual(mockWallet);
      expect(mockWalletService.remove).toHaveBeenCalledWith(walletId);
    });

    it('should handle errors from walletService.remove', async () => {
      const walletId = 'wallet-id';
      mockWalletService.remove.mockRejectedValue(new Error('Database error'));

      await expect(controller.remove(walletId)).rejects.toThrow(
        'Database error',
      );
      expect(mockWalletService.remove).toHaveBeenCalledWith(walletId);
    });
  });
});
