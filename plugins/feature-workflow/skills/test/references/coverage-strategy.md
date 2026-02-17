# Coverage Strategy — Test Pyramid Details

## Test Naming Convention

Use descriptive names that read as specifications:

```
✅ Good:
  "should reject orders exceeding $10,000 without manager approval"
  "should return 404 when user is not found"
  "should display loading spinner while fetching orders"

❌ Bad:
  "test createOrder"
  "error case"
  "renders correctly"
```

Pattern: `should [expected behavior] when [condition]`

## Mock Patterns for Function-Based Use Cases

### Mocking Repository Dependencies

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create mock repository
const mockOrderRepo = {
  save: vi.fn(),
  findById: vi.fn(),
  findActiveOrdersByUser: vi.fn(),
};

const mockUserRepo = {
  findById: vi.fn(),
};

// Wire use case with mocks
const execute = createOrder({
  orderRepo: mockOrderRepo,
  userRepo: mockUserRepo,
  discountRepo: mockDiscountRepo,
});

beforeEach(() => {
  vi.clearAllMocks();
});
```

### Mocking External Services

```typescript
// For services like email, payment, etc.
const mockEmailService = {
  sendConfirmation: vi.fn().mockResolvedValue(undefined),
};

// Verify service was called correctly
expect(mockEmailService.sendConfirmation).toHaveBeenCalledWith(
  expect.objectContaining({ to: 'user@example.com' })
);
```

## Test Data Factories

Create reusable test data builders to avoid repetition:

```typescript
// src/test-utils/factories.ts

const createTestUser = (overrides = {}) => ({
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  emailVerified: true,
  role: 'user',
  createdAt: new Date('2024-01-01'),
  ...overrides,
});

const createTestOrder = (overrides = {}) => ({
  id: 'order-1',
  userId: 'user-1',
  items: [{ productId: 'prod-1', quantity: 2 }],
  totalAmount: 100,
  status: 'pending',
  createdAt: new Date('2024-01-01'),
  ...overrides,
});

// Usage in tests:
const user = createTestUser({ emailVerified: false });
const order = createTestOrder({ totalAmount: 15000 });
```

## Coverage Rules Per Layer

### Domain Layer (Unit Tests)

| What to Test | Minimum Coverage |
|-------------|-----------------|
| Each business rule | 1 test per rule |
| Happy path | 1 test showing successful execution |
| Input validation | 1 test per validation constraint |
| Edge cases | Boundary values, null/undefined |
| Error paths | 1 test per error type thrown |

### API Layer (Integration Tests)

| What to Test | Minimum Coverage |
|-------------|-----------------|
| Each endpoint | Happy path (correct status + response shape) |
| Auth protection | 401 for unauthenticated requests |
| Validation | 400 for invalid request body |
| Business errors | 422 for domain rule violations |
| Not found | 404 for missing resources |

### UI Layer (Component Tests)

| What to Test | Minimum Coverage |
|-------------|-----------------|
| Form submission | Happy path with valid data |
| Validation feedback | Error messages for invalid input |
| Loading states | Spinner/skeleton while loading |
| Error states | Error message display |
| Empty states | Message when no data |

### E2E Layer (Playwright)

| What to Test | Minimum Coverage |
|-------------|-----------------|
| Each page | 1 full user flow |
| Critical paths | Login → Action → Verification |
| Form flows | Fill → Submit → Confirmation |

## Common Testing Pitfalls

### 1. Testing Implementation Details

```typescript
// ❌ Bad: Testing internal state
expect(component.state.isLoading).toBe(true);

// ✅ Good: Testing user-visible behavior
expect(screen.getByRole('progressbar')).toBeInTheDocument();
```

### 2. Brittle Selectors in E2E

```typescript
// ❌ Bad: Fragile CSS selector
await page.click('.btn-primary.mt-4.submit-btn');

// ✅ Good: Semantic selector
await page.click('button[type="submit"]');
await page.getByRole('button', { name: 'Submit Order' }).click();
```

### 3. Not Resetting Mocks

```typescript
// ❌ Bad: Shared mock state leaks between tests
const mockRepo = { save: vi.fn().mockResolvedValue({ id: '1' }) };

// ✅ Good: Reset in beforeEach
beforeEach(() => {
  vi.clearAllMocks();
  mockRepo.save.mockResolvedValue({ id: '1' });
});
```

### 4. Testing Too Many Things in One Test

```typescript
// ❌ Bad: Multiple assertions testing different behaviors
it('should handle orders', async () => {
  // tests creation, validation, AND deletion
});

// ✅ Good: One behavior per test
it('should create order with valid input', async () => { ... });
it('should reject invalid input', async () => { ... });
it('should delete existing order', async () => { ... });
```

### 5. Ignoring Async Behavior

```typescript
// ❌ Bad: Not waiting for async operations
fireEvent.click(submitButton);
expect(screen.getByText('Success')).toBeInTheDocument(); // May fail!

// ✅ Good: Wait for async result
fireEvent.click(submitButton);
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument();
});
```

## Vitest Configuration Reference

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom', // for React component tests
    setupFiles: ['./src/test-utils/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.*', 'src/test-utils/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

## Playwright Configuration Reference

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: true,
  },
});
```
