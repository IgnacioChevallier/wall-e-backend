import { Test, TestingModule } from '@nestjs/testing';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

describe('WalletController', () => {
  let controller: WalletController;

  const mockWalletService = {
    getWalletBalance: jest.fn(),
    getWalletDetails: jest.fn(),
  };

  beforeEach(async () => {
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getBalance', () => {
    const mockRequest = {
      user: {
        sub: 'test-user-id',
      },
    };

    it('should return wallet balance', async () => {
      const mockBalance = 100;
      mockWalletService.getWalletBalance.mockResolvedValue(mockBalance);

      const result = await controller.getBalance(mockRequest);

      expect(result).toEqual({ balance: mockBalance });
      expect(mockWalletService.getWalletBalance).toHaveBeenCalledWith(
        mockRequest.user.sub,
      );
    });
  });

  describe('getWalletDetails', () => {
    const mockRequest = {
      user: {
        sub: 'test-user-id',
      },
    };

    const mockWalletDetails = {
      id: 'wallet-id',
      balance: 100,
      userId: 'test-user-id',
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

    it('should return wallet details', async () => {
      mockWalletService.getWalletDetails.mockResolvedValue(mockWalletDetails);

      const result = await controller.getWalletDetails(mockRequest);

      expect(result).toEqual(mockWalletDetails);
      expect(mockWalletService.getWalletDetails).toHaveBeenCalledWith(
        mockRequest.user.sub,
      );
    });
  });
});
