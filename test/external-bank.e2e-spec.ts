import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthService } from '../src/auth/auth.service';
import { TransactionType } from '../generated/prisma';
import * as cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { ExternalBankService } from '../src/external-bank/external-bank.service';

describe('External Bank Integration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: AuthService;
  let externalBankService: ExternalBankService;
  let userCookie: string;
  let testUserId: string;
  let testWalletId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Configure the app like in main.ts
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    authService = moduleFixture.get<AuthService>(AuthService);
    externalBankService =
      moduleFixture.get<ExternalBankService>(ExternalBankService);

    // Mock ALL external bank service HTTP calls - no real network calls
    jest.spyOn(externalBankService, 'Transfer').mockImplementation((data) => {
      // Validate required fields for transfer
      if (!data.amount || !data.alias || !data.source) {
        throw new Error('Missing required fields for transfer');
      }
      return Promise.resolve({
        success: true,
        transactionId: `TR${Math.floor(Math.random() * 10000)}`,
      });
    });

    jest
      .spyOn(externalBankService, 'ExecuteDebin')
      .mockImplementation((data) => {
        // Validate required fields for debin
        if (!data.amount || !data.toWalletId) {
          throw new Error('Missing required fields for debin');
        }
        return Promise.resolve({
          approved: true,
          debinId: `DB${Math.floor(Math.random() * 10000)}`,
        });
      });

    await app.init();

    // Clean database before tests
    await prisma.transaction.deleteMany();
    await prisma.wallet.deleteMany();
    await prisma.user.deleteMany();

    // Create SYSTEM user first (required for wallet service transactions)
    await prisma.user.create({
      data: {
        id: 'SYSTEM',
        email: 'system@walle.internal',
        password: 'system-password-not-used',
        alias: 'SYSTEM',
      },
    });

    // Create test user and wallet using the auth service
    const timestamp = Date.now();
    const testEmail = `test${timestamp}@example.com`;
    const testAlias = `testuser${timestamp}`;

    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: testEmail,
        password: 'password123',
        alias: testAlias,
      })
      .expect(201);

    // Get user data
    const user = await prisma.user.findUnique({
      where: { email: testEmail },
      include: { wallet: true },
    });

    if (!user) {
      throw new Error('Test user not found after registration');
    }

    testUserId = user.id;
    testWalletId = user.wallet?.id || '';

    // Update wallet with sufficient balance for tests
    if (testWalletId) {
      await prisma.wallet.update({
        where: { id: testWalletId },
        data: { balance: 5000 },
      });
    }

    // Login to get the auth cookie
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: testEmail,
        password: 'password123',
      })
      .expect(200);

    // Extract the cookie from the response
    const setCookieHeader = loginResponse.headers['set-cookie'];
    const cookies = Array.isArray(setCookieHeader)
      ? setCookieHeader
      : [setCookieHeader];
    userCookie =
      cookies.find((cookie) => cookie?.startsWith('access_token=')) || '';
  });

  afterAll(async () => {
    // Clean up after tests
    await prisma.transaction.deleteMany();
    await prisma.wallet.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  describe('Transfer to External Bank', () => {
    it('should successfully call external bank transfer endpoint', async () => {
      const transferData = {
        amount: 100,
        alias: 'external-wallet-123',
        source: 'TRANSFER',
      };

      const response = await request(app.getHttpServer())
        .post('/bank/transfer')
        .send(transferData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        transactionId: expect.stringMatching(/^TR\d+$/),
      });
    });

    it('should fail transfer with missing required fields', async () => {
      const transferData = {
        amount: 50,
        // Missing alias and source
      };

      await request(app.getHttpServer())
        .post('/bank/transfer')
        .send(transferData)
        .expect(500); // External service mock throws error which becomes 500
    });
  });

  describe('DEBIN Request to External Bank', () => {
    it('should successfully call external bank debin endpoint', async () => {
      const debinData = {
        amount: 200,
        toWalletId: 'external-wallet-debin-123',
      };

      const response = await request(app.getHttpServer())
        .post('/bank/debin-request')
        .send(debinData)
        .expect(201);

      expect(response.body).toMatchObject({
        approved: true,
        debinId: expect.stringMatching(/^DB\d+$/),
      });
    });

    it('should fail DEBIN request with missing required fields', async () => {
      const debinData = {
        amount: 100,
        // Missing toWalletId
      };

      await request(app.getHttpServer())
        .post('/bank/debin-request')
        .send(debinData)
        .expect(500); // External service mock throws error which becomes 500
    });
  });

  describe('Wallet Integration Tests (with Auth)', () => {
    it('should successfully process DEBIN request through wallet endpoint', async () => {
      const debinData = {
        amount: 200,
      };

      const response = await request(app.getHttpServer())
        .post('/wallet/topup/debin')
        .set('Cookie', userCookie)
        .send(debinData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
      });

      // Verify wallet balance was updated (money added)
      const updatedWallet = await prisma.wallet.findUnique({
        where: { id: testWalletId },
      });
      expect(updatedWallet?.balance).toBe(5200); // 5000 + 200

      // Verify transaction record was created
      const transaction = await prisma.transaction.findFirst({
        where: {
          effectedWalletId: testWalletId,
          amount: 200,
          type: TransactionType.IN,
        },
      });
      expect(transaction).toBeTruthy();
      expect(transaction?.description).toContain('DEBIN');
    });

    it('should fail DEBIN request without authentication', async () => {
      const debinData = {
        amount: 100,
      };

      await request(app.getHttpServer())
        .post('/wallet/topup/debin')
        .send(debinData)
        .expect(401);
    });

    it('should handle multiple DEBIN requests correctly', async () => {
      const initialBalance = await prisma.wallet.findUnique({
        where: { id: testWalletId },
      });

      const debinRequests = [{ amount: 50 }, { amount: 75 }, { amount: 25 }];

      for (const debinData of debinRequests) {
        const response = await request(app.getHttpServer())
          .post('/wallet/topup/debin')
          .set('Cookie', userCookie)
          .send(debinData)
          .expect(201);

        expect(response.body.success).toBe(true);
      }

      // Verify total balance increase
      const finalWallet = await prisma.wallet.findUnique({
        where: { id: testWalletId },
      });
      const expectedIncrease = 50 + 75 + 25; // 150
      expect(finalWallet?.balance).toBe(
        (initialBalance?.balance || 0) + expectedIncrease,
      );

      // Verify all transactions were recorded
      const transactions = await prisma.transaction.findMany({
        where: {
          effectedWalletId: testWalletId,
          type: TransactionType.IN,
        },
      });
      expect(transactions.length).toBeGreaterThanOrEqual(4); // At least 4 IN transactions (including first test)
    });
  });

  describe('External Bank Service Mocking Tests', () => {
    it('should verify external bank service methods are properly mocked', async () => {
      // Test that Transfer method is mocked and working
      const transferResult = await externalBankService.Transfer({
        amount: 100,
        alias: 'test-alias',
        source: 'TRANSFER',
      });

      expect(transferResult).toMatchObject({
        success: true,
        transactionId: expect.stringMatching(/^TR\d+$/),
      });

      // Test that ExecuteDebin method is mocked and working
      const debinResult = await externalBankService.ExecuteDebin({
        amount: 200,
        toWalletId: 'test-wallet-id',
      });

      expect(debinResult).toMatchObject({
        approved: true,
        debinId: expect.stringMatching(/^DB\d+$/),
      });
    });

    it('should verify mocked validation works correctly', async () => {
      // Test Transfer validation - expect the error to be thrown
      try {
        await externalBankService.Transfer({
          amount: 100,
          // Missing alias and source
        } as any);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.message).toBe('Missing required fields for transfer');
      }

      // Test ExecuteDebin validation - expect the error to be thrown
      try {
        await externalBankService.ExecuteDebin({
          amount: 200,
          // Missing toWalletId
        } as any);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.message).toBe('Missing required fields for debin');
      }
    });
  });
});
