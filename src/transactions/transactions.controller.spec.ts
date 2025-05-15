import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionType } from '../../generated/prisma';

describe('TransactionsController', () => {
  let controller: TransactionsController;

  const mockTransactionsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    transferP2P: jest.fn(),
  };

  const mockTransaction = {
    id: 'transaction-id',
    amount: 100,
    type: TransactionType.IN,
    description: 'Test transaction',
    createdAt: new Date(),
    senderWalletId: 'source-wallet-id',
    receiverWalletId: 'wallet-id',
    effectedWalletId: 'wallet-id',
  };

  const mockUpdatedTransaction = {
    ...mockTransaction,
    description: 'Updated description',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        {
          provide: TransactionsService,
          useValue: mockTransactionsService,
        },
      ],
    }).compile();

    controller = module.get<TransactionsController>(TransactionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a transaction', async () => {
      const createTransactionDto: CreateTransactionDto = {
        amount: 100,
        type: TransactionType.IN,
        description: 'Test transaction',
        walletId: 'wallet-id',
      };

      mockTransactionsService.create.mockResolvedValue(mockTransaction);

      const result = await controller.create(createTransactionDto);

      expect(result).toEqual(mockTransaction);
      expect(mockTransactionsService.create).toHaveBeenCalledWith(createTransactionDto);
    });

    it('should handle errors from transactionService.create', async () => {
      const createTransactionDto: CreateTransactionDto = {
        amount: 100,
        type: TransactionType.IN,
        description: 'Test transaction',
        walletId: 'wallet-id',
      };

      mockTransactionsService.create.mockRejectedValue(new Error('Create failed'));

      await expect(controller.create(createTransactionDto)).rejects.toThrow('Create failed');
      expect(mockTransactionsService.create).toHaveBeenCalledWith(createTransactionDto);
    });
  });

  describe('findAll', () => {
    it('should return all transactions for a wallet', async () => {
      const mockTransactions = [mockTransaction, { ...mockTransaction, id: 'transaction-id-2' }];

      mockTransactionsService.findAll.mockResolvedValue(mockTransactions);

      const result = await controller.findAll();

      expect(result).toEqual(mockTransactions);
      expect(mockTransactionsService.findAll).toHaveBeenCalled();
    });

    it('should handle errors from transactionService.findAll', async () => {
      mockTransactionsService.findAll.mockRejectedValue(new Error('Find all failed'));

      await expect(controller.findAll()).rejects.toThrow('Find all failed');
      expect(mockTransactionsService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a transaction by id', async () => {
      const transactionId = '123';

      mockTransactionsService.findOne.mockResolvedValue(mockTransaction);

      const result = await controller.findOne(transactionId);

      expect(result).toEqual(mockTransaction);
      expect(mockTransactionsService.findOne).toHaveBeenCalledWith(transactionId);
    });

    it('should handle errors from transactionService.findOne', async () => {
      const transactionId = '123';

      mockTransactionsService.findOne.mockRejectedValue(new Error('Find one failed'));

      await expect(controller.findOne(transactionId)).rejects.toThrow('Find one failed');
      expect(mockTransactionsService.findOne).toHaveBeenCalledWith(transactionId);
    });
  });

  describe('update', () => {
    it('should update a transaction', async () => {
      const transactionId = '123';
      const updateTransactionDto: UpdateTransactionDto = {
        description: 'Updated description',
      };

      mockTransactionsService.update.mockResolvedValue(mockUpdatedTransaction);

      const result = await controller.update(transactionId, updateTransactionDto);

      expect(result).toEqual(mockUpdatedTransaction);
      expect(mockTransactionsService.update).toHaveBeenCalledWith(transactionId, updateTransactionDto);
    });

    it('should handle errors from transactionService.update', async () => {
      const transactionId = '123';
      const updateTransactionDto: UpdateTransactionDto = {
        description: 'Updated description',
      };

      mockTransactionsService.update.mockRejectedValue(new Error('Update failed'));

      await expect(controller.update(transactionId, updateTransactionDto)).rejects.toThrow(
        'Update failed',
      );
      expect(mockTransactionsService.update).toHaveBeenCalledWith(transactionId, updateTransactionDto);
    });
  });

  describe('remove', () => {
    it('should delete a transaction', async () => {
      const transactionId = '123';

      mockTransactionsService.remove.mockResolvedValue(mockTransaction);

      const result = await controller.remove(transactionId);

      expect(result).toEqual(mockTransaction);
      expect(mockTransactionsService.remove).toHaveBeenCalledWith(transactionId);
    });

    it('should handle errors from transactionService.remove', async () => {
      const transactionId = '123';

      mockTransactionsService.remove.mockRejectedValue(new Error('Delete failed'));

      await expect(controller.remove(transactionId)).rejects.toThrow('Delete failed');
      expect(mockTransactionsService.remove).toHaveBeenCalledWith(transactionId);
    });
  });
});
