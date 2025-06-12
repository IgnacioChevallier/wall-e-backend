import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { UsersService } from '../users/users.service';
import { WalletService } from '../wallet/wallet.service';
import { TransactionsRepository } from './transactions.repository';
import { TransactionType, Prisma } from '../../generated/prisma';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { P2PTransferDto } from './dto/p2p-transfer.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { PrismaService } from '../prisma/prisma.service';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let usersService: UsersService;
  let walletService: WalletService;
  let transactionsRepository: TransactionsRepository;
  let prismaService: PrismaService;

  const mockSender = {
    id: 'sender-id',
    email: 'sender@example.com',
    name: 'Sender User',
    alias: 'sender',
    password: 'hashedpassword',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRecipient = {
    id: 'recipient-id',
    email: 'recipient@example.com',
    name: 'Recipient User',
    alias: 'recipient',
    password: 'hashedpassword',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSenderWallet = {
    id: 'sender-wallet-id',
    userId: 'sender-id',
    balance: 1000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRecipientWallet = {
    id: 'recipient-wallet-id',
    userId: 'recipient-id',
    balance: 500,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSenderTransaction = {
    id: 'sender-transaction-id',
    amount: 100,
    type: TransactionType.OUT,
    description: 'Transfer to recipient@example.com',
    createdAt: new Date(),
    senderWalletId: 'sender-wallet-id',
    receiverWalletId: 'recipient-wallet-id',
    effectedWalletId: 'sender-wallet-id',
  };

  const mockRecipientTransaction = {
    id: 'recipient-transaction-id',
    amount: 100,
    type: TransactionType.IN,
    description: 'Transfer from sender@example.com',
    createdAt: new Date(),
    senderWalletId: 'sender-wallet-id',
    receiverWalletId: 'recipient-wallet-id',
    effectedWalletId: 'recipient-wallet-id',
  };

  const mockTransaction = {
    id: 'transaction-id',
    amount: 100,
    type: TransactionType.IN,
    description: 'Test transaction',
    createdAt: new Date(),
    walletId: 'wallet-id',
  };

  const mockPrismaService = {
    transaction: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $on: jest.fn(),
    $transaction: jest.fn(),
    $use: jest.fn(),
    $extends: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: UsersService,
          useValue: {
            findOne: jest.fn(),
            findByEmailOrAlias: jest.fn(),
          },
        },
        {
          provide: WalletService,
          useValue: {
            getWalletByUserId: jest.fn(),
          },
        },
        {
          provide: TransactionsRepository,
          useValue: {
            createP2PTransfer: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    usersService = module.get<UsersService>(UsersService);
    walletService = module.get<WalletService>(WalletService);
    transactionsRepository = module.get<TransactionsRepository>(
      TransactionsRepository,
    );
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createP2PTransfer', () => {
    const p2pTransferDto: P2PTransferDto = {
      recipientIdentifier: 'recipient@example.com',
      amount: 100,
    };

    it('should successfully transfer funds between users', async () => {
      jest.spyOn(usersService, 'findOne').mockResolvedValue(mockSender);
      jest
        .spyOn(usersService, 'findByEmailOrAlias')
        .mockResolvedValue(mockRecipient);
      jest
        .spyOn(walletService, 'getWalletByUserId')
        .mockResolvedValueOnce(mockSenderWallet)
        .mockResolvedValueOnce(mockRecipientWallet);
      jest
        .spyOn(transactionsRepository, 'createP2PTransfer')
        .mockResolvedValue({
          senderTransaction: mockSenderTransaction,
          recipientTransaction: mockRecipientTransaction,
        });

      const result = await service.createP2PTransfer(
        'sender-id',
        p2pTransferDto,
      );

      expect(result).toEqual({
        message: 'Transfer successful',
        senderTransaction: mockSenderTransaction,
        recipientTransaction: mockRecipientTransaction,
      });

      expect(usersService.findOne).toHaveBeenCalledWith('sender-id');
      expect(usersService.findByEmailOrAlias).toHaveBeenCalledWith(
        'recipient@example.com',
      );
      expect(walletService.getWalletByUserId).toHaveBeenNthCalledWith(
        1,
        'sender-id',
      );
      expect(walletService.getWalletByUserId).toHaveBeenNthCalledWith(
        2,
        'recipient-id',
      );
      expect(transactionsRepository.createP2PTransfer).toHaveBeenCalledWith({
        amount: 100,
        senderWallet: mockSenderWallet,
        recipientWallet: mockRecipientWallet,
        senderDescription: 'Transfer to recipient@example.com',
        recipientDescription: 'Transfer from sender@example.com',
      });
    });

    it('should throw NotFoundException when sender does not exist', async () => {
      jest.spyOn(usersService, 'findOne').mockResolvedValue(null as any);

      await expect(
        service.createP2PTransfer('non-existent-id', p2pTransferDto),
      ).rejects.toThrow(
        new NotFoundException('Sender with ID non-existent-id not found.'),
      );

      expect(usersService.findOne).toHaveBeenCalledWith('non-existent-id');
    });

    it('should throw NotFoundException when recipient does not exist', async () => {
      jest.spyOn(usersService, 'findOne').mockResolvedValue(mockSender);
      jest.spyOn(usersService, 'findByEmailOrAlias').mockImplementation(() => {
        throw new NotFoundException(
          'Recipient with email non-existent@example.com not found.',
        );
      });

      const dtoCopy = {
        ...p2pTransferDto,
        recipientIdentifier: 'non-existent@example.com',
      };
      await expect(
        service.createP2PTransfer('sender-id', dtoCopy),
      ).rejects.toThrow(
        new NotFoundException(
          'Recipient with email non-existent@example.com not found.',
        ),
      );

      expect(usersService.findOne).toHaveBeenCalledWith('sender-id');
      expect(usersService.findByEmailOrAlias).toHaveBeenCalledWith(
        'non-existent@example.com',
      );
    });

    it('should throw BadRequestException when transferring to self', async () => {
      jest.spyOn(usersService, 'findOne').mockResolvedValue(mockSender);
      jest
        .spyOn(usersService, 'findByEmailOrAlias')
        .mockResolvedValue(mockSender);

      await expect(
        service.createP2PTransfer('sender-id', p2pTransferDto),
      ).rejects.toThrow(
        new BadRequestException('Cannot transfer funds to yourself.'),
      );

      expect(usersService.findOne).toHaveBeenCalledWith('sender-id');
      expect(usersService.findByEmailOrAlias).toHaveBeenCalledWith(
        'recipient@example.com',
      );
    });

    it('should throw NotFoundException when sender wallet does not exist', async () => {
      jest.spyOn(usersService, 'findOne').mockResolvedValue(mockSender);
      jest
        .spyOn(usersService, 'findByEmailOrAlias')
        .mockResolvedValue(mockRecipient);
      jest
        .spyOn(walletService, 'getWalletByUserId')
        .mockResolvedValueOnce(null as any);

      await expect(
        service.createP2PTransfer('sender-id', p2pTransferDto),
      ).rejects.toThrow(
        new NotFoundException(
          'Wallet for sender sender-id not found. Please ensure the sender has a wallet.',
        ),
      );

      expect(usersService.findOne).toHaveBeenCalledWith('sender-id');
      expect(usersService.findByEmailOrAlias).toHaveBeenCalledWith(
        'recipient@example.com',
      );
      expect(walletService.getWalletByUserId).toHaveBeenCalledWith('sender-id');
    });

    it('should throw NotFoundException when recipient wallet does not exist', async () => {
      jest.spyOn(usersService, 'findOne').mockResolvedValue(mockSender);
      jest
        .spyOn(usersService, 'findByEmailOrAlias')
        .mockResolvedValue(mockRecipient);
      jest
        .spyOn(walletService, 'getWalletByUserId')
        .mockResolvedValueOnce(mockSenderWallet)
        .mockResolvedValueOnce(null as any);

      await expect(
        service.createP2PTransfer('sender-id', p2pTransferDto),
      ).rejects.toThrow(
        new NotFoundException(
          `Wallet for recipient ${mockRecipient.email} not found. Please ensure the recipient has a wallet.`,
        ),
      );

      expect(usersService.findOne).toHaveBeenCalledWith('sender-id');
      expect(usersService.findByEmailOrAlias).toHaveBeenCalledWith(
        'recipient@example.com',
      );
      expect(walletService.getWalletByUserId).toHaveBeenNthCalledWith(
        1,
        'sender-id',
      );
      expect(walletService.getWalletByUserId).toHaveBeenNthCalledWith(
        2,
        'recipient-id',
      );
    });

    it('should throw BadRequestException for insufficient funds', async () => {
      const mockSenderWalletWithInsufficientFunds = {
        ...mockSenderWallet,
        balance: 50,
      };

      jest.spyOn(usersService, 'findOne').mockResolvedValue(mockSender);
      jest
        .spyOn(usersService, 'findByEmailOrAlias')
        .mockResolvedValue(mockRecipient);
      jest
        .spyOn(walletService, 'getWalletByUserId')
        .mockResolvedValueOnce(mockSenderWalletWithInsufficientFunds)
        .mockResolvedValueOnce(mockRecipientWallet);

      await expect(
        service.createP2PTransfer('sender-id', p2pTransferDto),
      ).rejects.toThrow(new BadRequestException('Insufficient funds.'));

      expect(transactionsRepository.createP2PTransfer).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when repository throws an error', async () => {
      jest.spyOn(usersService, 'findOne').mockResolvedValue(mockSender);
      jest
        .spyOn(usersService, 'findByEmailOrAlias')
        .mockResolvedValue(mockRecipient);
      jest
        .spyOn(walletService, 'getWalletByUserId')
        .mockResolvedValueOnce(mockSenderWallet)
        .mockResolvedValueOnce(mockRecipientWallet);
      jest
        .spyOn(transactionsRepository, 'createP2PTransfer')
        .mockImplementation(() => {
          throw new Error('Database error');
        });

      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      await expect(
        service.createP2PTransfer('sender-id', p2pTransferDto),
      ).rejects.toThrow(
        new BadRequestException('P2P Transfer failed. Please try again later.'),
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'P2P Transfer failed:',
        expect.any(Error),
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe('create', () => {
    const createTransactionDto: CreateTransactionDto = {
      amount: 100,
      type: TransactionType.IN,
      description: 'Test transaction',
      walletId: 'wallet-id',
    };

    it('should create a transaction successfully', async () => {
      const updatedMockTransaction = {
        ...mockTransaction,
        senderWalletId: 'wallet-id',
        receiverWalletId: 'wallet-id',
        effectedWalletId: 'wallet-id',
      };
      mockPrismaService.transaction.create.mockResolvedValue(
        updatedMockTransaction,
      );

      const result = await service.create(createTransactionDto);

      expect(result).toEqual(updatedMockTransaction);
      expect(mockPrismaService.transaction.create).toHaveBeenCalledWith({
        data: {
          amount: 100,
          type: TransactionType.IN,
          description: 'Test transaction',
          senderWalletId: 'wallet-id',
          receiverWalletId: 'wallet-id',
          effectedWalletId: 'wallet-id',
        },
      });
    });

    it('should propagate errors from prisma', async () => {
      const error = new Error('Database error');
      mockPrismaService.transaction.create.mockRejectedValue(error);

      await expect(service.create(createTransactionDto)).rejects.toThrow(error);
    });
  });

  describe('findAll', () => {
    it('should return all transactions', async () => {
      const transactions = [
        mockTransaction,
        { ...mockTransaction, id: 'transaction-id-2' },
      ];
      mockPrismaService.transaction.findMany.mockResolvedValue(transactions);

      const result = await service.findAll();

      expect(result).toEqual(transactions);
      expect(mockPrismaService.transaction.findMany).toHaveBeenCalled();
    });

    it('should propagate errors from prisma', async () => {
      const error = new Error('Database error');
      mockPrismaService.transaction.findMany.mockRejectedValue(error);

      await expect(service.findAll()).rejects.toThrow(error);
    });
  });

  describe('findOne', () => {
    it('should return a transaction when it exists', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(
        mockTransaction,
      );

      const result = await service.findOne('transaction-id');

      expect(result).toEqual(mockTransaction);
      expect(mockPrismaService.transaction.findUnique).toHaveBeenCalledWith({
        where: { id: 'transaction-id' },
      });
    });

    it('should throw NotFoundException when transaction does not exist', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        new NotFoundException('Transaction with ID #non-existent-id not found'),
      );
    });

    it('should propagate other errors from prisma', async () => {
      const error = new Error('Database error');
      mockPrismaService.transaction.findUnique.mockRejectedValue(error);

      await expect(service.findOne('transaction-id')).rejects.toThrow(error);
    });
  });

  describe('update', () => {
    const updateTransactionDto: UpdateTransactionDto = {
      description: 'Updated description',
    };

    it('should update a transaction when it exists', async () => {
      const updatedTransaction = {
        ...mockTransaction,
        description: 'Updated description',
      };
      mockPrismaService.transaction.update.mockResolvedValue(
        updatedTransaction,
      );

      const result = await service.update(
        'transaction-id',
        updateTransactionDto,
      );

      expect(result).toEqual(updatedTransaction);
      expect(mockPrismaService.transaction.update).toHaveBeenCalledWith({
        where: { id: 'transaction-id' },
        data: updateTransactionDto,
      });
    });

    it('should throw NotFoundException when transaction does not exist', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError('', {
        clientVersion: '4.7.0',
        code: 'P2025',
      });
      mockPrismaService.transaction.update.mockRejectedValue(prismaError);

      await expect(
        service.update('non-existent-id', updateTransactionDto),
      ).rejects.toThrow(
        new NotFoundException(
          'Transaction with ID #non-existent-id not found for update',
        ),
      );
    });

    it('should propagate other errors from prisma', async () => {
      const error = new Error('Database error');
      mockPrismaService.transaction.update.mockRejectedValue(error);

      await expect(
        service.update('transaction-id', updateTransactionDto),
      ).rejects.toThrow(error);
    });
  });

  describe('remove', () => {
    it('should delete a transaction when it exists', async () => {
      mockPrismaService.transaction.delete.mockResolvedValue(mockTransaction);

      const result = await service.remove('transaction-id');

      expect(result).toEqual(mockTransaction);
      expect(mockPrismaService.transaction.delete).toHaveBeenCalledWith({
        where: { id: 'transaction-id' },
      });
    });

    it('should throw NotFoundException when transaction does not exist', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError('', {
        clientVersion: '4.7.0',
        code: 'P2025',
      });
      mockPrismaService.transaction.delete.mockRejectedValue(prismaError);

      await expect(service.remove('non-existent-id')).rejects.toThrow(
        new NotFoundException(
          'Transaction with ID #non-existent-id not found for deletion',
        ),
      );
    });

    it('should propagate other errors from prisma', async () => {
      const error = new Error('Database error');
      mockPrismaService.transaction.delete.mockRejectedValue(error);

      await expect(service.remove('transaction-id')).rejects.toThrow(error);
    });
  });
});
