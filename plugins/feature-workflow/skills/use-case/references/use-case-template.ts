/**
 * Use Case Template — Pattern B (Function-Based Interactor)
 *
 * This template demonstrates the function-based use case pattern where:
 * - A factory function receives dependencies (repositories, services)
 * - It returns an async executor function
 * - The executor validates input, applies business rules, and returns output
 *
 * Usage: Copy this template, rename types and functions, implement business logic.
 */

// ─── Types (shared /types directory) ──────────────────────────────

/** Input DTO — what the caller provides */
interface CreateOrderInput {
  userId: string;
  items: Array<{ productId: string; quantity: number }>;
  discountCode?: string;
}

/** Output DTO — what the use case returns */
interface CreateOrderOutput {
  orderId: string;
  totalAmount: number;
  status: "pending" | "confirmed";
  createdAt: Date;
}

// ─── Repository Interface (Port) ─────────────────────────────────

/** Define what data access this use case needs — not HOW it accesses it */
interface OrderRepository {
  save(order: Order): Promise<Order>;
  findActiveOrdersByUser(userId: string): Promise<Order[]>;
}

interface UserRepository {
  findById(userId: string): Promise<User | null>;
}

interface DiscountRepository {
  findByCode(code: string): Promise<Discount | null>;
  markAsUsed(code: string, userId: string): Promise<void>;
}

// ─── Error Types ──────────────────────────────────────────────────

class UseCaseError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "UseCaseError";
  }
}

class ValidationError extends UseCaseError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR");
  }
}

class BusinessRuleError extends UseCaseError {
  constructor(message: string) {
    super(message, "BUSINESS_RULE_VIOLATION");
  }
}

class NotFoundError extends UseCaseError {
  constructor(entity: string) {
    super(`${entity} not found`, "NOT_FOUND");
  }
}

// ─── Dependencies ─────────────────────────────────────────────────

interface CreateOrderDeps {
  orderRepo: OrderRepository;
  userRepo: UserRepository;
  discountRepo: DiscountRepository;
}

// ─── Use Case (Pattern B) ─────────────────────────────────────────

/**
 * Factory function that creates the use case executor.
 *
 * Pattern B: Dependencies are injected via the factory,
 * returning a focused async function.
 */
const createOrder =
  (deps: CreateOrderDeps) =>
  async (input: CreateOrderInput): Promise<CreateOrderOutput> => {
    const { orderRepo, userRepo, discountRepo } = deps;

    // ── Step 1: Validate Input ──
    if (!input.items.length) {
      throw new ValidationError("Order must contain at least one item");
    }

    // ── Step 2: Load Required Data ──
    const user = await userRepo.findById(input.userId);
    if (!user) {
      throw new NotFoundError("User");
    }

    // ── Step 3: Apply Business Rules ──

    // Rule: Users must have verified email before placing orders
    if (!user.emailVerified) {
      throw new BusinessRuleError(
        "Email must be verified before placing orders",
      );
    }

    // Rule: Calculate total and check limits
    const totalAmount = calculateTotal(input.items);

    // Rule: Orders cannot exceed $10,000 without manager approval
    if (totalAmount > 10000) {
      throw new BusinessRuleError(
        "Orders exceeding $10,000 require manager approval",
      );
    }

    // Rule: Discount codes can only be used once per user
    if (input.discountCode) {
      const discount = await discountRepo.findByCode(input.discountCode);
      if (!discount) {
        throw new NotFoundError("Discount code");
      }
      // Apply discount logic...
      await discountRepo.markAsUsed(input.discountCode, input.userId);
    }

    // ── Step 4: Execute & Return ──
    const order = await orderRepo.save({
      userId: input.userId,
      items: input.items,
      totalAmount,
      status: "pending",
      createdAt: new Date(),
    } as Order);

    return {
      orderId: order.id,
      totalAmount: order.totalAmount,
      status: order.status,
      createdAt: order.createdAt,
    };
  };

// ─── Wiring Example ───────────────────────────────────────────────

/**
 * How to wire the use case in the application layer:
 *
 * ```ts
 * import { createOrder } from '@/use-cases/create-order';
 * import { MongoOrderRepo } from '@/infra/repositories/mongo-order-repo';
 * import { MongoUserRepo } from '@/infra/repositories/mongo-user-repo';
 * import { MongoDiscountRepo } from '@/infra/repositories/mongo-discount-repo';
 *
 * const executeCreateOrder = createOrder({
 *   orderRepo: new MongoOrderRepo(),
 *   userRepo: new MongoUserRepo(),
 *   discountRepo: new MongoDiscountRepo(),
 * });
 *
 * // In Express route:
 * router.post('/orders', async (req, res) => {
 *   const result = await executeCreateOrder(req.body);
 *   res.status(201).json(result);
 * });
 * ```
 */

export { createOrder, CreateOrderInput, CreateOrderOutput, CreateOrderDeps };
