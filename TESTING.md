# Wall-E Backend E2E Testing Guide

## Overview

This document describes the comprehensive end-to-end testing infrastructure for the Wall-E backend, specifically focusing on external bank service integration testing.

## Test Infrastructure

### Components

1. **Test Database**: Separate PostgreSQL instance on port 5433
2. **Eva-Bank Test Service**: Containerized external bank simulator on port 3002  
3. **Wall-E Backend**: NestJS application under test
4. **Test Suite**: Jest-based E2E tests with authentication

### Docker Setup

#### Test Containers (`docker-compose.test.yml`)

```yaml
services:
  test-db:
    image: postgres:15-alpine
    ports: ["5433:5432"]
    environment:
      POSTGRES_USER: testuser
      POSTGRES_PASSWORD: testpass
      POSTGRES_DB: walle_test

  eva-bank-test:
    build: ../eva-bank
    ports: ["3002:3001"]
```

### Eva-Bank Service Configuration

The eva-bank service has been configured for 100% success rates during testing:

- `TRANSFER_SUCCESS_RATE = 1.0` (100% success)
- `DEBIN_APPROVAL_RATE = 1.0` (100% approval)

## Test Environment Setup

### Environment Variables (`test/setup-e2e.ts`)

```typescript
process.env.DATABASE_URL = 'postgresql://testuser:testpass@localhost:5433/walle_test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-e2e-testing';
process.env.BANK_API_URL = 'http://localhost:3002';
```

### Database Schema

The test database uses the same Prisma schema with additional transaction types:

```prisma
enum TransactionType {
  IN
  OUT
  TRANSFER  // ← Added for external bank transfers
  DEBIN     // ← Added for DEBIN operations
}
```

## Running Tests

### Available Scripts

```bash
# Start test infrastructure
npm run test:setup

# Apply database migrations to test DB
npm run test:db:setup

# Run external bank integration tests
npm run test:e2e:external

# Stop and clean up test infrastructure
npm run test:teardown

# Complete test cycle (setup → migrate → test → cleanup)
npm run test:full
```

### Manual Testing Steps

```bash
# 1. Start test containers
npm run test:setup

# 2. Wait for services to be ready (5 seconds)
sleep 5

# 3. Apply database migrations
npm run test:db:setup

# 4. Run specific test suite
npm run test:e2e:external

# 5. Clean up
npm run test:teardown
```

## Test Coverage

### External Bank Direct API Tests

- ✅ **Transfer Endpoint**: `POST /bank/transfer`
  - Success case with valid data
  - Validation error with missing fields

- ✅ **DEBIN Endpoint**: `POST /bank/debin-request`  
  - Success case with valid data
  - Validation error with missing fields

### Wallet Integration Tests (with Authentication)

- ✅ **DEBIN Processing**: `POST /wallet/topup/debin`
  - Successful DEBIN request with balance update
  - Transaction record creation verification
  - Multiple sequential DEBIN requests
  - Authentication failure scenarios

### Service Health Checks

- ✅ **Eva-Bank Service**: Direct HTTP health check
  - Verifies service is reachable on port 3002
  - Validates service response format

## Test Data Management

### User & Wallet Setup

```typescript
// SYSTEM user (required for wallet transactions)
await prisma.user.create({
  data: {
    id: 'SYSTEM',
    email: 'system@walle.internal',
    password: 'system-password-not-used',
    alias: 'SYSTEM',
  },
});

// Test user with wallet
const testUser = await prisma.user.create({
  data: {
    email: 'test@example.com',
    password: 'hashedpassword123',
    alias: 'testuser_123',
  },
});

const testWallet = await prisma.wallet.create({
  data: {
    userId: testUserId,
    balance: 5000, // Initial test balance
  },
});
```

### Authentication

Tests use cookie-based authentication matching the production setup:

```typescript
// Login and extract auth cookie
const loginResponse = await request(app.getHttpServer())
  .post('/auth/login')
  .send({ email: 'test@example.com', password: 'hashedpassword123' });

const userCookie = loginResponse.headers['set-cookie']
  .find(cookie => cookie?.startsWith('access_token='));

// Use cookie in authenticated requests
await request(app.getHttpServer())
  .post('/wallet/topup/debin')
  .set('Cookie', userCookie)
  .send({ amount: 200 });
```

## Database Transactions & Verification

### DEBIN Transaction Flow

1. **External Bank Request**: Call eva-bank `/api/debin-request`
2. **Approval Verification**: Check response for `approved: true`
3. **Database Transaction**: Create transaction records
4. **Balance Update**: Increment wallet balance
5. **Verification**: Assert balance and transaction records

### Transaction Record Structure

```typescript
const transaction = await prisma.transaction.findFirst({
  where: {
    effectedWalletId: testWalletId,
    amount: 200,
    type: TransactionType.IN,
  },
});
expect(transaction?.description).toContain('DEBIN');
```

## Error Handling & Edge Cases

### Validation Errors

- External bank service returns 400 for missing required fields
- Wall-E backend propagates validation errors correctly
- Tests verify appropriate HTTP status codes

### Authentication Failures

- Requests without auth cookies return 401 Unauthorized
- Invalid authentication tokens are rejected
- Protected endpoints enforce JWT validation

### System User Requirements

- SYSTEM user must exist for wallet transactions
- Foreign key constraints enforced in test database
- Proper cleanup prevents constraint violations

## Troubleshooting

### Common Issues

1. **Port Conflicts**: Ensure ports 3002 and 5433 are available
2. **Database Constraints**: SYSTEM user must exist before wallet operations
3. **Service Timing**: Allow 5+ seconds for containers to be ready
4. **Migration State**: Apply migrations after DB container starts

### Debug Commands

```bash
# Check container status
docker ps | grep -E "(eva-bank-test|walle-test-db)"

# View container logs
docker logs eva-bank-test
docker logs walle-test-db

# Test service connectivity
curl http://localhost:3002/health
curl http://localhost:3002/api/debin-request -X POST -d '{"amount":100,"toWalletId":"test"}' -H "Content-Type: application/json"

# Check database connectivity
psql postgresql://testuser:testpass@localhost:5433/walle_test -c "SELECT COUNT(*) FROM \"User\";"
```

## Architecture Decisions

### Why Separate Test Database?

- **Isolation**: Tests don't interfere with development data
- **Speed**: Test DB uses tmpfs for faster I/O
- **Safety**: No risk of corrupting development database
- **Parallel Execution**: Multiple test suites can run independently

### Why Containerized Eva-Bank?

- **Consistency**: Same service version across environments
- **Control**: 100% success rates for predictable testing
- **Isolation**: No external dependencies or network issues
- **Local Development**: No need for external service setup

### Why Cookie Authentication?

- **Production Parity**: Matches real application authentication
- **Security**: HttpOnly cookies prevent XSS
- **Simplicity**: No need to manage Bearer tokens in tests
- **Browser Compatibility**: Works with frontend applications

## Future Enhancements

### Potential Improvements

1. **Test Data Fixtures**: Predefined test data sets
2. **Parallel Test Execution**: Multiple isolated test environments
3. **Performance Testing**: Load testing for external service integration
4. **Error Simulation**: Configurable failure rates in eva-bank
5. **Transaction Verification**: More comprehensive audit trails
6. **API Contract Testing**: Schema validation for external services

### Monitoring & Observability

- Add test execution metrics
- Log external service response times
- Track test database performance
- Monitor container resource usage

---

## Summary

This E2E testing infrastructure provides comprehensive coverage of external bank integration functionality while maintaining isolation from development environments. The setup enables confident testing of critical financial operations with proper authentication, transaction integrity, and error handling verification. 