// Setup for E2E tests
process.env.DATABASE_URL =
  'postgresql://testuser:testpass@localhost:5433/walle_test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-e2e-testing';
process.env.BANK_API_URL = 'http://localhost:3002';

// Global setup to ensure test isolation
beforeEach(async () => {
  // Add small delay between tests to prevent race conditions
  await new Promise(resolve => setTimeout(resolve, 10));
});

// Add unique test identifier to prevent conflicts
global.TEST_SUITE_ID = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
