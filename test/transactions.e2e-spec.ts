import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

describe('TransactionsController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let authCookie: string;
  let testUserId: string;
  let testWalletId: string;
  let testTransactionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);

    // Apply the same global configuration as in main.ts
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.transaction.deleteMany();
    await prisma.wallet.deleteMany();
    await prisma.user.deleteMany();

    // Generate unique test data for each test
    const timestamp = Date.now();
    const testEmail = `test${timestamp}@example.com`;
    const testAlias = `testuser${timestamp}`;

    // Create a test user and get auth cookie
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: testEmail,
        password: 'password123',
        alias: testAlias
      })
      .expect(201);

    // Extract the cookie from the response
    const cookies = registerResponse.headers['set-cookie'];
    if (Array.isArray(cookies)) {
      authCookie = cookies.find((cookie: string) => cookie.startsWith('access_token=')) || '';
    } else if (typeof cookies === 'string' && cookies.startsWith('access_token=')) {
      authCookie = cookies;
    } else {
      authCookie = '';
    }

    // Get user data by querying the database directly since registration doesn't return user data
    const user = await prisma.user.findUnique({
      where: { email: testEmail },
      include: { wallet: true }
    });

    if (!user) {
      throw new Error('Test user not found after registration');
    }

    testUserId = user.id;
    testWalletId = user.wallet?.id || '';

    // Only create test transaction if we have a valid wallet ID
    if (testWalletId) {
      const transactionResponse = await request(app.getHttpServer())
        .post('/transactions')
        .send({
          amount: 100.50,
          type: 'IN', // Use correct transaction type from schema
          walletId: testWalletId,
          description: 'Test transaction'
        })
        .expect(201);

      testTransactionId = transactionResponse.body.id;
    }
  });

  afterAll(async () => {
    // Clean up after all tests
    await prisma.transaction.deleteMany();
    await prisma.wallet.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  describe('/transactions (GET)', () => {
    it('should return all transactions', () => {
      return request(app.getHttpServer())
        .get('/transactions')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('/transactions/:id (GET)', () => {
    it('should return a specific transaction', () => {
      return request(app.getHttpServer())
        .get(`/transactions/${testTransactionId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.id).toBe(testTransactionId);
        });
    });

    it('should return 404 for non-existent transaction', () => {
      const nonExistentId = 'non-existent-id';
      return request(app.getHttpServer())
        .get(`/transactions/${nonExistentId}`)
        .expect(404);
    });
  });

  describe('/transactions (POST)', () => {
    it('should create a new transaction', () => {
      const newTransaction = {
        amount: 100.50,
        type: 'IN', // Use correct transaction type from schema
        walletId: testWalletId, // Use the actual test wallet ID
        description: 'Test transaction'
      };

      return request(app.getHttpServer())
        .post('/transactions')
        .send(newTransaction)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.amount).toBe(newTransaction.amount);
          expect(res.body.type).toBe(newTransaction.type);
          expect(res.body.senderWalletId).toBe(newTransaction.walletId);
        });
    });

    it('should return 400 for invalid transaction data', () => {
      const invalidTransaction = {
        amount: 'invalid-amount',
        type: 'INVALID_TYPE',
        walletId: testWalletId
      };

      return request(app.getHttpServer())
        .post('/transactions')
        .send(invalidTransaction)
        .expect(400);
    });

    it('should return 400 for missing required fields', () => {
      const incompleteTransaction = {
        amount: 100.50,
        // Missing type and walletId
      };

      return request(app.getHttpServer())
        .post('/transactions')
        .send(incompleteTransaction)
        .expect(400);
    });
  });

  describe('/transactions/p2p (POST)', () => {
    let recipientEmail: string;
    let recipientUserId: string;

    beforeEach(async () => {
      // Create a recipient user for P2P transfers
      const recipientTimestamp = Date.now() + 1; // Ensure different timestamp
      recipientEmail = `recipient${recipientTimestamp}@example.com`;
      const recipientAlias = `recipient${recipientTimestamp}`;

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: recipientEmail,
          password: 'password123',
          alias: recipientAlias
        })
        .expect(201);

      // Get recipient user data
      const recipientUser = await prisma.user.findUnique({
        where: { email: recipientEmail },
        include: { wallet: true }
      });

      if (!recipientUser) {
        throw new Error('Recipient user not found after registration');
      }

      recipientUserId = recipientUser.id;

      // Add balance to sender's wallet for P2P transfers
      if (testWalletId) {
        await prisma.wallet.update({
          where: { id: testWalletId },
          data: { balance: 1000.0 } // Add sufficient balance for transfers
        });
      }
    });

    it('should create a P2P transfer with valid auth cookie', () => {
      const p2pTransfer = {
        recipientIdentifier: recipientEmail, // Use the actual recipient email
        amount: 50.25
      };

      return request(app.getHttpServer())
        .post('/transactions/p2p')
        .set('Cookie', authCookie)
        .send(p2pTransfer)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toBe('Transfer successful');
          expect(res.body).toHaveProperty('senderTransaction');
          expect(res.body).toHaveProperty('recipientTransaction');
        });
    });

    it('should return 401 for P2P transfer without auth cookie', () => {
      const p2pTransfer = {
        recipientIdentifier: recipientEmail,
        amount: 50.25
      };

      return request(app.getHttpServer())
        .post('/transactions/p2p')
        .send(p2pTransfer)
        .expect(401);
    });

    it('should return 400 for invalid P2P transfer data', () => {
      const invalidP2pTransfer = {
        recipientIdentifier: '',
        amount: -10 // Negative amount should be invalid
      };

      return request(app.getHttpServer())
        .post('/transactions/p2p')
        .set('Cookie', authCookie)
        .send(invalidP2pTransfer)
        .expect(400);
    });
  });

  describe('/transactions/:id (PATCH)', () => {
    it('should update an existing transaction', () => {
      const updateData = {
        amount: 150.75,
        description: 'Updated transaction description'
      };

      return request(app.getHttpServer())
        .patch(`/transactions/${testTransactionId}`)
        .send(updateData)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(testTransactionId);
          expect(res.body.amount).toBe(updateData.amount);
          expect(res.body.description).toBe(updateData.description);
        });
    });

    it('should return 404 for updating non-existent transaction', () => {
      const nonExistentId = 'non-existent-id';
      const updateData = {
        amount: 150.75,
        description: 'Updated transaction'
      };

      return request(app.getHttpServer())
        .patch(`/transactions/${nonExistentId}`)
        .send(updateData)
        .expect(404);
    });

    it('should return 400 for invalid update data', () => {
      const invalidUpdateData = {
        amount: 'invalid-amount'
      };

      return request(app.getHttpServer())
        .patch(`/transactions/${testTransactionId}`)
        .send(invalidUpdateData)
        .expect(400);
    });
  });

  describe('/transactions/:id (DELETE)', () => {
    it('should delete an existing transaction', () => {
      return request(app.getHttpServer())
        .delete(`/transactions/${testTransactionId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(testTransactionId);
        });
    });

    it('should return 404 for deleting non-existent transaction', () => {
      const nonExistentId = 'non-existent-id';

      return request(app.getHttpServer())
        .delete(`/transactions/${nonExistentId}`)
        .expect(404);
    });
  });
});