/**
 * DTO Patterns — Common Input/Output shapes for Clean Architecture
 *
 * These patterns cover the most frequent DTO designs:
 * - Simple CRUD DTOs
 * - Paginated queries
 * - Validation patterns
 * - Error response shapes
 * - Composed DTOs (nested entities)
 */

// ═══════════════════════════════════════════════════════════════════
// 1. SIMPLE INPUT/OUTPUT DTOs
// ═══════════════════════════════════════════════════════════════════

/** Input: Flat structure with required and optional fields */
interface CreateUserInput {
  email: string;
  name: string;
  role?: "admin" | "user" | "viewer"; // Optional with union type
}

/** Output: What the caller receives — never expose internal IDs or sensitive data */
interface CreateUserOutput {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: Date;
}

// ═══════════════════════════════════════════════════════════════════
// 2. PAGINATED QUERY DTOs
// ═══════════════════════════════════════════════════════════════════

/** Generic pagination input — reuse across all list queries */
interface PaginationInput {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/** Generic paginated output wrapper */
interface PaginatedOutput<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/** Example: List users with filtering and pagination */
interface ListUsersInput extends PaginationInput {
  filterByRole?: string;
  searchQuery?: string;
}

type ListUsersOutput = PaginatedOutput<CreateUserOutput>;

// ═══════════════════════════════════════════════════════════════════
// 3. INPUT VALIDATION PATTERNS
// ═══════════════════════════════════════════════════════════════════

/**
 * Validation at the DTO level — keep use cases clean.
 *
 * Pattern: Validate function returns either the validated input or throws.
 * Place in shared /utils or alongside the DTO.
 */

interface ValidationResult<T> {
  success: true;
  data: T;
}

interface ValidationFailure {
  success: false;
  errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

type Validated<T> = ValidationResult<T> | ValidationFailure;

/** Example validator function */
const validateCreateUserInput = (
  raw: unknown,
): Validated<CreateUserInput> => {
  const errors: ValidationFailure["errors"] = [];

  if (typeof raw !== "object" || raw === null) {
    return {
      success: false,
      errors: [{ field: "body", message: "Invalid request body", code: "INVALID_BODY" }],
    };
  }

  const data = raw as Record<string, unknown>;

  if (!data.email || typeof data.email !== "string") {
    errors.push({ field: "email", message: "Email is required", code: "REQUIRED" });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push({ field: "email", message: "Invalid email format", code: "INVALID_FORMAT" });
  }

  if (!data.name || typeof data.name !== "string") {
    errors.push({ field: "name", message: "Name is required", code: "REQUIRED" });
  }

  if (data.role && !["admin", "user", "viewer"].includes(data.role as string)) {
    errors.push({ field: "role", message: "Invalid role", code: "INVALID_VALUE" });
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      email: data.email as string,
      name: data.name as string,
      role: data.role as CreateUserInput["role"],
    },
  };
};

// ═══════════════════════════════════════════════════════════════════
// 4. ERROR RESPONSE SHAPES
// ═══════════════════════════════════════════════════════════════════

/** Standard error response for API layer */
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/** Map use case errors to HTTP responses (in controller layer) */
const useCaseErrorToHttp = (error: Error): { status: number; body: ErrorResponse } => {
  // Example mapping — customize per project
  const errorMap: Record<string, number> = {
    VALIDATION_ERROR: 400,
    NOT_FOUND: 404,
    BUSINESS_RULE_VIOLATION: 422,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
  };

  const code = (error as any).code || "INTERNAL_ERROR";
  const status = errorMap[code] || 500;

  return {
    status,
    body: {
      error: {
        code,
        message: error.message,
      },
    },
  };
};

// ═══════════════════════════════════════════════════════════════════
// 5. COMPOSED DTOs (Nested Entities)
// ═══════════════════════════════════════════════════════════════════

/** When a use case output includes related entities */
interface OrderDetailOutput {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: Date;
  // Nested entity — flattened for the caller
  customer: {
    id: string;
    name: string;
    email: string;
  };
  // Array of nested entities
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
}

/**
 * Mapper function: Transform domain entities to output DTOs.
 * Keep mapping logic close to the DTO definition.
 */
const toOrderDetailOutput = (
  order: any, // Domain Order entity
  customer: any, // Domain User entity
  items: any[], // Domain OrderItem entities with product info
): OrderDetailOutput => ({
  id: order.id,
  status: order.status,
  totalAmount: order.totalAmount,
  createdAt: order.createdAt,
  customer: {
    id: customer.id,
    name: customer.name,
    email: customer.email,
  },
  items: items.map((item) => ({
    productId: item.productId,
    productName: item.product.name,
    quantity: item.quantity,
    unitPrice: item.product.price,
    lineTotal: item.quantity * item.product.price,
  })),
});

export {
  CreateUserInput,
  CreateUserOutput,
  PaginationInput,
  PaginatedOutput,
  ListUsersInput,
  Validated,
  ErrorResponse,
  OrderDetailOutput,
  validateCreateUserInput,
  useCaseErrorToHttp,
  toOrderDetailOutput,
};
