# Conventional Commits Reference

## Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

## Types

| Type | Purpose | Example |
|------|---------|---------|
| `feat` | New feature | `feat(orders): add discount code validation` |
| `fix` | Bug fix | `fix(auth): resolve token expiry race condition` |
| `refactor` | Restructure without behavior change | `refactor(api): extract order validation middleware` |
| `test` | Add or fix tests | `test(orders): add unit tests for createOrder use case` |
| `docs` | Documentation | `docs(readme): update deployment instructions` |
| `chore` | Build, tooling, deps | `chore(deps): upgrade vitest to v2.0` |
| `style` | Formatting only | `style: fix eslint warnings in api layer` |
| `perf` | Performance | `perf(queries): add index for user orders lookup` |
| `ci` | CI/CD changes | `ci: add playwright to github actions` |

## Scopes (Project-Specific)

Use these scopes to indicate which layer is affected:

| Scope | Layer |
|-------|-------|
| `ui` | React frontend |
| `api` | Express routes/controllers |
| `domain` | Use cases, entities, business logic |
| `infra` | Repositories, external services |
| `orders` | Order feature (cross-cutting) |
| `auth` | Authentication (cross-cutting) |
| `deps` | Dependencies |
| `config` | Configuration files |

## Breaking Changes

Add `!` after type/scope or `BREAKING CHANGE:` in footer:

```
feat(api)!: change order response format

BREAKING CHANGE: Order response now includes nested customer object instead of flat customerId field.
```

## Examples

### Feature commit
```
feat(orders): add order creation with discount codes

Implement createOrder use case with:
- Input validation for order items
- Discount code single-use enforcement
- Order total limit check ($10,000)
```

### Bug fix
```
fix(auth): prevent expired sessions from accessing protected routes

Session middleware now checks token expiry before allowing request through.
Closes #42
```

### Multi-scope change
```
feat(orders): add order listing with pagination

- Add getUserOrders use case
- Add GET /api/orders endpoint with pagination
- Add OrdersPage with infinite scroll
```

## Rules

1. **Imperative mood**: "add feature" not "added feature" or "adds feature"
2. **Lowercase**: Start description with lowercase
3. **No period**: Don't end description with a period
4. **Under 72 chars**: Keep the first line short
5. **Body for context**: Use body to explain WHY, not WHAT (the diff shows what)
