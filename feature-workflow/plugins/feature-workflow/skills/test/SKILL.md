---
name: test
description: This skill should be used when the user asks to "write tests", "add tests", "test this", "test coverage", "need tests for", "testing", "unit tests", "integration tests", "e2e tests", or wants to verify a feature works correctly. It enforces a strict test pyramid strategy using Vitest for unit/integration tests and Playwright for E2E tests.
version: 0.2.0
---

# Testing — Test Pyramid Strategy

Write comprehensive tests at every layer following the test pyramid. This skill enforces a strict checklist to ensure complete coverage of business rules and user flows.

## Legacy Project Test Awareness

When adding tests to an **existing codebase**:

### Detect Existing Test Infrastructure

Before writing any tests, check what already exists:

```bash
# What test framework is configured?
grep -E "vitest|jest|mocha|ava|tap" package.json | head -5

# What test runner config exists?
ls vitest.config.* jest.config.* .mocharc.* playwright.config.* cypress.config.* 2>/dev/null

# How many tests exist?
find src/ -name "*.test.*" -o -name "*.spec.*" | wc -l
find e2e/ tests/ __tests__/ -name "*.test.*" -o -name "*.spec.*" 2>/dev/null | wc -l

# What test utilities/helpers exist?
find src/ tests/ -name "test-utils*" -o -name "test-helper*" -o -name "factory*" -o -name "fixture*" -o -name "mock*" 2>/dev/null | head -10

# Do tests currently pass?
npx vitest run --reporter=verbose 2>&1 | tail -5
```

### Match Existing Test Patterns

**DO NOT introduce a different test framework or style.** If the project uses Jest, write Jest tests. If it uses specific mock patterns, follow them.

```bash
# Read one existing test to understand the pattern (pick the newest one)
git log --diff-filter=A --name-only --pretty="" -- "*.test.*" "*.spec.*" | head -1
```

Read that ONE test file to understand:
- Import style (named vs default, relative vs alias paths)
- Describe/it nesting structure
- Mock setup approach (vi.mock, jest.mock, manual mocks)
- Test data creation (factories, fixtures, inline)
- Assertion style (expect, assert, should)

**Then follow that exact pattern for new tests.**

### Incremental Coverage Strategy

On legacy projects, **don't try to achieve full coverage immediately.** Instead:

1. **Only test what you're changing** — new features and modified modules
2. **Use `.product/technical-debt.md`** to see which files lack tests
3. **Prioritize untested critical paths** over utility function tests
4. **Never modify existing passing tests** unless they test code you changed

## Flutter Test Awareness

When adding tests to a **Flutter/Dart project** (detected by `pubspec.yaml`):

### Detect Flutter Test Infrastructure

```bash
# What test packages are installed?
grep -E "flutter_test|bloc_test|mocktail|mockito|integration_test" pubspec.yaml | head -10

# How many tests exist?
find test/ -name "*_test.dart" 2>/dev/null | wc -l
find integration_test/ -name "*_test.dart" 2>/dev/null | wc -l

# What test helpers exist?
find test/ -name "helpers*" -o -name "fixtures*" -o -name "mocks*" -o -name "fakes*" 2>/dev/null | head -10

# Do tests currently pass?
flutter test 2>&1 | tail -10
```

### Match Existing Flutter Test Patterns

**DO NOT introduce a different test approach.** If the project uses `mocktail`, don't introduce `mockito`. If it uses BLoC test patterns, follow them.

```bash
# Read one existing test to understand the pattern
find test/ -name "*_test.dart" -newer pubspec.yaml 2>/dev/null | head -1
```

Read that ONE test file to understand:
- Import style (`package:` vs relative)
- Test organization (`group` vs `test` nesting)
- Mock approach (mocktail, mockito, or manual fakes)
- State management test pattern (bloc_test `blocTest()` or manual)
- Assertion style

### Flutter Test Pyramid

```
        ╱ Integration ╲           integration_test/ — full app flows on device
       ╱───────────────╲
      ╱   Widget Tests  ╲        test/ — component rendering, user interaction
     ╱───────────────────╲
    ╱     Unit Tests      ╲      test/ — business logic, BLoCs, use cases
   ╱───────────────────────╲
```

### Flutter Test Tools

| Layer | Tool | Location |
|-------|------|----------|
| Unit | `flutter_test` | `test/` (mirrors `lib/` structure) |
| Unit (BLoC) | `bloc_test` | `test/` — `blocTest()` helper |
| Widget | `flutter_test` | `test/` — `testWidgets()`, `pumpWidget()` |
| Integration | `integration_test` | `integration_test/` — runs on real device/emulator |
| Mocking | `mocktail` (recommended) / `mockito` | Used in unit and widget tests |

### Flutter Test Steps

#### Step F1: Unit Tests for Use Cases (flutter_test)

```dart
// test/features/auth/domain/usecases/login_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class MockAuthRepository extends Mock implements AuthRepository {}

void main() {
  late Login login;
  late MockAuthRepository mockRepository;

  setUp(() {
    mockRepository = MockAuthRepository();
    login = Login(mockRepository);
  });

  test('should return User on successful login', () async {
    when(() => mockRepository.login(any()))
        .thenAnswer((_) async => Right(testUser));

    final result = await login(LoginParams(email: 'a@b.com', password: '123'));

    expect(result, Right(testUser));
    verify(() => mockRepository.login(any())).called(1);
  });

  test('should return Failure on server error', () async {
    when(() => mockRepository.login(any()))
        .thenAnswer((_) async => Left(ServerFailure('error')));

    final result = await login(LoginParams(email: 'a@b.com', password: '123'));

    expect(result, Left(ServerFailure('error')));
  });
}
```

#### Step F2: BLoC Tests (bloc_test)

```dart
// test/features/auth/presentation/bloc/auth_bloc_test.dart
import 'package:bloc_test/bloc_test.dart';

void main() {
  late AuthBloc bloc;
  late MockLogin mockLogin;

  setUp(() {
    mockLogin = MockLogin();
    bloc = AuthBloc(login: mockLogin);
  });

  blocTest<AuthBloc, AuthState>(
    'emits [Loading, Authenticated] on successful login',
    build: () {
      when(() => mockLogin(any())).thenAnswer((_) async => Right(testUser));
      return bloc;
    },
    act: (bloc) => bloc.add(LoginRequested(email: 'a@b.com', password: '123')),
    expect: () => [AuthLoading(), AuthAuthenticated(testUser)],
  );

  blocTest<AuthBloc, AuthState>(
    'emits [Loading, Error] on failed login',
    build: () {
      when(() => mockLogin(any()))
          .thenAnswer((_) async => Left(ServerFailure('Invalid credentials')));
      return bloc;
    },
    act: (bloc) => bloc.add(LoginRequested(email: 'a@b.com', password: '123')),
    expect: () => [AuthLoading(), AuthError('Invalid credentials')],
  );
}
```

#### Step F3: Widget Tests (flutter_test)

```dart
// test/features/auth/presentation/pages/login_page_test.dart
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('shows login form', (tester) async {
    await tester.pumpWidget(MaterialApp(home: LoginPage()));

    expect(find.byType(TextFormField), findsNWidgets(2));
    expect(find.text('Login'), findsOneWidget);
  });

  testWidgets('shows error on failed login', (tester) async {
    // ... pump widget with error state BLoC
    expect(find.text('Invalid credentials'), findsOneWidget);
  });
}
```

#### Step F4: Integration Tests

```dart
// integration_test/auth_test.dart
import 'package:integration_test/integration_test.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('full login flow', (tester) async {
    await tester.pumpWidget(const MyApp());
    await tester.pumpAndSettle();

    await tester.enterText(find.byKey(Key('email')), 'test@example.com');
    await tester.enterText(find.byKey(Key('password')), 'password');
    await tester.tap(find.text('Login'));
    await tester.pumpAndSettle();

    expect(find.text('Welcome'), findsOneWidget);
  });
}
```

#### Step F5: Run Flutter Tests

```bash
# Unit + Widget tests
flutter test

# With coverage
flutter test --coverage

# Integration tests (requires device/emulator)
flutter test integration_test/

# Specific test file
flutter test test/features/auth/domain/usecases/login_test.dart
```

---

## Test Pyramid (Strategy A)

```
        ╱  E2E  ╲               Playwright — 1 per page/feature
       ╱─────────╲
      ╱ Component  ╲            Vitest + RTL — key interactions
     ╱─────────────╲
    ╱  Integration   ╲          Vitest + supertest — 1 per route
   ╱───────────────────╲
  ╱     Unit Tests      ╲       Vitest — 1 per business rule
 ╱───────────────────────╲
```

**Coverage rules:**
- Every use case → at least 1 unit test per business rule
- Every value object → edge case tests for validation logic
- Every API route → at least 1 integration test (happy path + main error)
- Every React page → at least 1 Playwright E2E test

## Tools

| Layer | Tool | Config |
|-------|------|--------|
| Unit | Vitest | `vitest.config.ts` |
| Integration | Vitest + supertest | Same config, `src/api/**/*.test.ts` |
| Component | Vitest + React Testing Library | Same config, `src/ui/**/*.test.tsx` |
| E2E | Playwright | `playwright.config.ts` |

## Strict Checklist

Follow these steps in order. Do not skip steps.

### Step 1: Collect Business Rules

Before writing any tests, gather the business rules to cover:

- Pull rules from the use case specification (Step 7 of the `use-case` skill)
- If no spec exists, read the use case source code and extract rules
- List every rule as a testable statement

```
Example rules to test:
- [ ] Orders cannot exceed $10,000 without manager approval
- [ ] Users must have verified email before placing orders
- [ ] Empty order items array should be rejected
```

Each rule becomes at least one test case.

### Step 2: Unit Tests for Use Cases (Vitest)

Write unit tests for every business rule in the use case:

**File location:** `src/domain/use-cases/__tests__/[use-case-name].test.ts`

**Pattern:**
```typescript
import { describe, it, expect, vi } from 'vitest';

describe('createOrder', () => {
  // Test each business rule
  it('should reject orders exceeding $10,000', async () => { ... });
  it('should require verified email', async () => { ... });
  it('should reject empty items', async () => { ... });

  // Test happy path
  it('should create order with valid input', async () => { ... });
});
```

**Key practices:**
- Mock repository dependencies using `vi.fn()`
- Test each business rule independently
- Test both success and failure paths
- Use descriptive test names that read as specifications

### Step 3: Unit Tests for Value Objects (Vitest)

If the feature includes value objects or entities with validation:

**File location:** `src/domain/entities/__tests__/[entity-name].test.ts`

Test edge cases:
- Boundary values (min/max limits)
- Invalid inputs (null, undefined, wrong types)
- Format validation (email, phone, etc.)

### Step 4: Integration Tests for API Routes (Vitest + supertest)

Test each API endpoint end-to-end through the HTTP layer:

**File location:** `src/api/routes/__tests__/[route-name].test.ts`

**Pattern:**
```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '@/app';

describe('POST /api/orders', () => {
  it('should return 201 with valid order', async () => {
    const app = await createApp();
    const res = await request(app)
      .post('/api/orders')
      .send({ items: [{ productId: '1', quantity: 2 }] });
    expect(res.status).toBe(201);
  });

  it('should return 422 when order exceeds limit', async () => { ... });
  it('should return 401 when unauthenticated', async () => { ... });
});
```

**Coverage per route:**
- 1 happy path test (correct status code + response shape)
- 1 main error path test (most likely failure case)
- 1 auth test if route is protected

### Step 5: Component Tests for React (Vitest + RTL)

Test key interactions and state changes in React components:

**File location:** `src/ui/components/__tests__/[ComponentName].test.tsx` or co-located as `[ComponentName].test.tsx`

**Pattern:**
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

describe('OrderForm', () => {
  it('should submit order with valid data', async () => { ... });
  it('should show validation errors for invalid input', async () => { ... });
  it('should display loading state while submitting', async () => { ... });
});
```

**Focus on:**
- User interactions (click, type, submit)
- State changes (loading → loaded, error display)
- Conditional rendering (empty states, error states)
- Do NOT test implementation details (internal state, method calls)

### Step 6: E2E Tests (Playwright)

Write end-to-end tests for complete user flows:

**File location:** `e2e/[feature-name].spec.ts`

**Pattern:**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Order Creation Flow', () => {
  test('user can create a new order', async ({ page }) => {
    await page.goto('/orders/new');
    await page.fill('[name="product"]', 'Widget');
    await page.fill('[name="quantity"]', '5');
    await page.click('button[type="submit"]');
    await expect(page.locator('.success-message')).toBeVisible();
  });
});
```

**Coverage rule:** 1 E2E test per page or major feature flow.

Invoke the `webapp-testing` skill for complex Playwright scenarios.

### Step 7: Run Full Suite & Verify

Run all tests and verify everything passes:

```bash
# Unit + Integration + Component tests
npx vitest run

# E2E tests
npx playwright test
```

All tests must pass before marking this step complete. If tests fail, fix them — do not skip.

## Ralph Loop Integration (Optional)

If the `ralph-loop` skill is available, testing is the **best fit** for Ralph Loop. Use this template:

```
/ralph-loop "Write tests for [FEATURE_NAME] following the test pyramid:
1. Unit tests for each business rule in src/domain/use-cases/__tests__/
2. Integration tests for API routes in src/api/routes/__tests__/
3. Component tests for React in src/ui/components/__tests__/
4. E2E tests in e2e/
Run 'npx vitest run' and 'npx playwright test' after each iteration.
Output <promise>TESTS COMPLETE</promise> when ALL tests pass." --max-iterations 20 --completion-promise "TESTS COMPLETE"
```

## Composing with Other Skills

| Skill | When to Invoke |
|-------|----------------|
| `test-driven-development` | For strict TDD discipline (write test first, then implement) |
| `webapp-testing` | For complex Playwright E2E test scenarios |

## Additional Resources

### Reference Files

- **`references/coverage-strategy.md`** — Detailed test pyramid rules, naming conventions, mock patterns, test data factories, and common testing pitfalls to avoid
