# Layer Structure — Clean Architecture for React + Node/Express

## Full Directory Layout

```
src/
├── domain/                          ← Pure business logic (no framework deps)
│   ├── entities/
│   │   ├── user.ts                  ← Entity definition + factory
│   │   ├── order.ts
│   │   └── product.ts
│   ├── use-cases/
│   │   ├── create-order.ts          ← Function-based interactor
│   │   ├── cancel-order.ts
│   │   └── get-user-orders.ts
│   ├── ports/                       ← Repository interfaces
│   │   ├── order-repository.ts
│   │   ├── user-repository.ts
│   │   └── product-repository.ts
│   └── errors/                      ← Domain-level errors
│       ├── use-case-error.ts
│       ├── validation-error.ts
│       └── not-found-error.ts
│
├── infra/                           ← Concrete implementations
│   ├── repositories/
│   │   ├── mongo-order-repo.ts      ← Implements OrderRepository port
│   │   ├── mongo-user-repo.ts
│   │   └── mongo-product-repo.ts
│   ├── services/
│   │   ├── email-service.ts         ← External service clients
│   │   └── payment-gateway.ts
│   ├── config/
│   │   ├── database.ts              ← MongoDB connection
│   │   └── environment.ts           ← Env var loading
│   └── mappers/
│       ├── order-mapper.ts          ← DB document ↔ Domain entity
│       └── user-mapper.ts
│
├── api/                             ← Express HTTP layer
│   ├── routes/
│   │   ├── index.ts                 ← Route aggregator
│   │   ├── order-routes.ts
│   │   └── user-routes.ts
│   ├── controllers/
│   │   ├── order-controller.ts      ← Wires use case, handles HTTP
│   │   └── user-controller.ts
│   ├── middleware/
│   │   ├── auth.ts                  ← Authentication middleware
│   │   ├── error-handler.ts         ← Global error handler
│   │   └── validate.ts              ← Input validation middleware
│   └── validators/
│       ├── order-validators.ts      ← Request body schemas
│       └── user-validators.ts
│
├── ui/                              ← React frontend
│   ├── pages/
│   │   ├── OrdersPage.tsx
│   │   ├── OrderDetailPage.tsx
│   │   └── DashboardPage.tsx
│   ├── components/
│   │   ├── OrderList.tsx
│   │   ├── OrderForm.tsx
│   │   └── common/
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       └── LoadingSpinner.tsx
│   ├── hooks/
│   │   ├── useOrders.ts             ← Data fetching + state
│   │   ├── useCreateOrder.ts
│   │   └── useAuth.ts
│   └── services/
│       ├── api-client.ts            ← Base HTTP client (axios/fetch)
│       ├── order-service.ts         ← API calls for orders
│       └── user-service.ts
│
├── types/                           ← SHARED: Accessible by all layers
│   ├── order.types.ts               ← DTOs, enums, shared interfaces
│   ├── user.types.ts
│   ├── api.types.ts                 ← Request/response shapes
│   └── common.types.ts              ← Pagination, error types
│
└── utils/                           ← SHARED: Accessible by all layers
    ├── date.ts                      ← Date formatting utilities
    ├── validation.ts                ← Common validators
    ├── money.ts                     ← Currency calculations
    └── logger.ts                    ← Logging utility
```

## File Naming Conventions

| Layer | Convention | Example |
|-------|-----------|---------|
| Domain entities | `kebab-case.ts` | `order-item.ts` |
| Use cases | `verb-noun.ts` | `create-order.ts`, `get-user-orders.ts` |
| Ports | `noun-repository.ts` | `order-repository.ts` |
| Infra repos | `mongo-noun-repo.ts` | `mongo-order-repo.ts` |
| API routes | `noun-routes.ts` | `order-routes.ts` |
| Controllers | `noun-controller.ts` | `order-controller.ts` |
| React pages | `PascalCase.tsx` | `OrdersPage.tsx` |
| React components | `PascalCase.tsx` | `OrderList.tsx` |
| React hooks | `camelCase.ts` | `useOrders.ts` |
| Shared types | `noun.types.ts` | `order.types.ts` |

## Import Rules (Pragmatic Boundaries)

```
✅ Allowed imports:
  UI        → types/, utils/
  UI        → ui/services/ (API client)
  API       → domain/use-cases/, domain/errors/, types/, utils/
  Domain    → types/, utils/
  Infra     → domain/ports/, domain/entities/, types/, utils/

❌ Forbidden imports:
  Domain    → infra/ (domain must not know about MongoDB)
  Domain    → api/  (domain must not know about Express)
  Domain    → ui/   (domain must not know about React)
  API       → infra/ (controllers don't directly use repos)
  UI        → domain/ (UI calls API, not domain directly)
  UI        → api/   (UI communicates via HTTP, not imports)
```

## Adding a New Feature Checklist

When adding a new feature, create files in this order:

1. `src/types/feature.types.ts` — Shared DTOs
2. `src/domain/ports/feature-repository.ts` — Repository interface
3. `src/domain/use-cases/action-feature.ts` — Use case function
4. `src/infra/repositories/mongo-feature-repo.ts` — MongoDB adapter
5. `src/api/validators/feature-validators.ts` — Input validation
6. `src/api/controllers/feature-controller.ts` — HTTP controller
7. `src/api/routes/feature-routes.ts` — Express routes
8. `src/ui/services/feature-service.ts` — API client
9. `src/ui/hooks/useFeature.ts` — React hook
10. `src/ui/pages/FeaturePage.tsx` — Page component
11. `src/ui/components/FeatureList.tsx` — UI components
