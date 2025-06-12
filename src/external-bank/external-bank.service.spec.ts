import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { ExternalBankService } from './external-bank.service';
import { HttpException } from '@nestjs/common';
import { BANK_API_ENDPOINTS } from './bank-api.interface';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ExternalBankService', () => {
  let service: ExternalBankService;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://bank-service:3001'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExternalBankService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ExternalBankService>(ExternalBankService);
    jest.clearAllMocks();
  });

  describe('Transfer', () => {
    const transferRequest = {
      amount: 100,
      alias: 'test-wallet',
      source: 'test-bank',
    };

    it('should successfully process a transfer', async () => {
      const mockResponse = {
        data: {
          success: true,
          transactionId: 'test-tx-id',
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await service.Transfer(transferRequest);

      expect(result).toEqual(mockResponse.data);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `http://bank-service:3001${BANK_API_ENDPOINTS.transfer}`,
        transferRequest,
      );
    });

    it('should handle transfer failure', async () => {
      const errorResponse = {
        response: {
          data: {
            success: false,
            error: 'Transaction declined',
          },
          status: 400,
        },
      };

      mockedAxios.post.mockRejectedValue(errorResponse);
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(() => service.Transfer(transferRequest)).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('ExecuteDebin', () => {
    const debinRequest = {
      amount: 100,
      toWalletId: 'test-wallet',
    };

    it('should successfully process a DEBIN request', async () => {
      const mockResponse = {
        data: {
          approved: true,
          debinId: 'test-debin-id',
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await service.ExecuteDebin(debinRequest);

      expect(result).toEqual(mockResponse.data);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `http://bank-service:3001${BANK_API_ENDPOINTS.debin}`,
        debinRequest,
      );
    });

    it('should handle DEBIN failure', async () => {
      const errorResponse = {
        response: {
          data: {
            approved: false,
            error: 'DEBIN request rejected',
          },
          status: 400,
        },
      };

      mockedAxios.post.mockRejectedValue(errorResponse);
      mockedAxios.isAxiosError.mockReturnValue(true);

      const debinPromise = () => service.ExecuteDebin(debinRequest);
      await expect(debinPromise()).rejects.toThrow(HttpException);
    });
  });
});
