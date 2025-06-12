// Setup for E2E tests
process.env.DATABASE_URL =
  'postgresql://testuser:testpass@localhost:5433/walle_test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-e2e-testing';
// Mock the external bank API URL - this should never be called in e2e tests
process.env.BANK_API_URL = 'http://mock-bank-service';

// Mock axios globally for all e2e tests to prevent any real HTTP calls
jest.mock('axios', () => ({
  post: jest.fn(),
  get: jest.fn(),
  isAxiosError: jest.fn(),
  create: jest.fn(() => ({
    post: jest.fn(),
    get: jest.fn(),
  })),
}));
