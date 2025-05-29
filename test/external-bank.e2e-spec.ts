import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthService } from '../src/auth/auth.service';
import { TransactionType } from '../generated/prisma';
import * as cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';

describe('External Bank Integration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: AuthService;
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

    // Create test user and wallet
    const testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: 'hashedpassword123',
        alias: 'testuser_123',
      },
    });
    testUserId = testUser.id;

    const testWallet = await prisma.wallet.create({
      data: {
        userId: testUserId,
        balance: 5000, // Start with enough balance for tests
      },
    });
    testWalletId = testWallet.id;

    // Login to get the auth cookie
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'hashedpassword123',
      })
      .expect(200);

    // Extract the cookie from the response
    const setCookieHeader = loginResponse.headers['set-cookie'];
    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
    userCookie = cookies.find(cookie => cookie?.startsWith('access_token=')) || '';
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
        toWalletId: 'external-wallet-123',
        source: 'TRANSFER'
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
        // Missing toWalletId and source
      };

      await request(app.getHttpServer())
        .post('/bank/transfer')
        .send(transferData)
        .expect(400); // External service returns 400 for validation errors
    });
  });

  describe('DEBIN Request to External Bank', () => {
    it('should successfully call external bank debin endpoint', async () => {
      const debinData = {
        amount: 200,
        toWalletId: 'external-wallet-debin-123'
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
        .expect(400); // External service returns 400 for validation errors
    });
  });

  describe('Wallet Integration Tests (with Auth)', () => {
    it('should successfully process DEBIN request through wallet endpoint', async () => {
      const debinData = {
        amount: 200
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
          type: TransactionType.IN, // DEBIN creates IN transactions
        },
      });
      expect(transaction).toBeTruthy();
      expect(transaction?.description).toContain('DEBIN'); 
    });

    it('should fail DEBIN request without authentication', async () => {
      const debinData = {
        amount: 100
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

      const debinRequests = [
        { amount: 50 },
        { amount: 75 },
        { amount: 25 }
      ];

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
      expect(finalWallet?.balance).toBe((initialBalance?.balance || 0) + expectedIncrease);

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

  describe('External Bank Service Health Check', () => {
    it('should verify eva-bank service is reachable', async () => {
      // Test the external service directly through HTTP
      const evaResponse = await request('http://localhost:3002')
        .get('/health')
        .expect(200);

      expect(evaResponse.body).toMatchObject({
        status: 'ok',
      });
    });
  });
}); 