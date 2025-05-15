import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { WalletService } from '../wallet/wallet.service';
import { TransactionsRepository } from './transactions.repository';
import { UsersService } from '../users/users.service';
import { UsersModule } from '../users/users.module';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let mockUsersService: Partial<UsersService>;

  beforeEach(async () => {
    mockUsersService = {
      findByEmail: jest.fn(),
      findByEmailOrAlias: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [UsersModule],
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

    service = module.get<TransactionsService>(TransactionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
