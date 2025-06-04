import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('TransactionsController (e2e)', () => {
  let app: INestApplication<App>;
  let authCookie: string;
  let testUserId: string;
  let testWalletId: string;
  let testTransactionId: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Create a test user and get auth cookie
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        alias: 'testuser'
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

    // Get user info by decoding the JWT (for testing purposes, we'll get it from login)
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      })
      .expect(200);

    // For the test, we'll need to get the user ID somehow. 
    // Let's create a test transaction first to get IDs
    const transactionResponse = await request(app.getHttpServer())
      .post('/transactions')
      .send({
        amount: 100.50,
        type: 'DEPOSIT',
        walletId: 'test-wallet-id',
        description: 'Test transaction'
      })
      .expect(201);

    testTransactionId = transactionResponse.body.id;
  });

  afterEach(async () => {
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
        type: 'DEPOSIT',
        walletId: 'test-wallet-id',
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
          expect(res.body.walletId).toBe(newTransaction.walletId);
        });
    });

    it('should return 400 for invalid transaction data', () => {
      const invalidTransaction = {
        amount: 'invalid-amount',
        type: 'INVALID_TYPE',
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
    it('should create a P2P transfer with valid auth cookie', () => {
      const p2pTransfer = {
        recipientIdentifier: 'test-recipient-id',
        amount: 50.25
      };

      return request(app.getHttpServer())
        .post('/transactions/p2p')
        .set('Cookie', authCookie)
        .send(p2pTransfer)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.amount).toBe(p2pTransfer.amount);
        });
    });

    it('should return 401 for P2P transfer without auth cookie', () => {
      const p2pTransfer = {
        recipientIdentifier: 'test-recipient-id',
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