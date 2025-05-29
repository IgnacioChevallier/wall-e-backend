// Setup for E2E tests
process.env.DATABASE_URL = 'postgresql://testuser:testpass@localhost:5433/walle_test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-e2e-testing';
process.env.BANK_API_URL = 'http://localhost:3002'; 