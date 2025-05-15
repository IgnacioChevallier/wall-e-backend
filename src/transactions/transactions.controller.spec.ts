import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { WalletService } from '../wallet/wallet.service';
import { TransactionsRepository } from './transactions.repository';
import { UsersService } from '../users/users.service';
import { UsersModule } from '../users/users.module';

describe('TransactionsController', () => {
  let controller: TransactionsController;
  let mockUsersService: Partial<UsersService>;

  beforeEach(async () => {
    mockUsersService = {
      findByEmail: jest.fn(),
      findByEmailOrAlias: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [UsersModule],
      controllers: [TransactionsController],
      providers: [
        TransactionsService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: WalletService,
          useValue: {
            getWalletByUserId: jest.fn(),
            updateWalletBalance: jest.fn(),
          },
        },
        {
          provide: TransactionsRepository,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TransactionsController>(TransactionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
