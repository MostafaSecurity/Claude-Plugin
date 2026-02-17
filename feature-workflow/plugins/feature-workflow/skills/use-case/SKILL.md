---
name: use-case
description: This skill should be used when the user asks to "define a use case", "design a feature", "new use case", "create business logic", "specify requirements", "new interactor", or discusses business requirements before implementation. It guides through clarifying questions, domain modeling, and function-based interactor definition following Clean Architecture with Pattern B (function-based use cases with injected dependencies).
version: 0.2.0
---

# Use Case Definition — Clean Architecture

Define business logic as function-based interactors with clear boundaries, following Clean Architecture principles. This skill enforces a strict checklist to ensure every use case is well-specified before implementation begins.

## Core Principles

- **Function-based interactors (Pattern B)**: Use cases are factory functions that receive dependencies and return an async executor
- **Pragmatic layer boundaries**: Shared `/types` and `/utils` accessible across layers
- **Ports over implementations**: Define repository interfaces, not concrete data access
- **Business rules as testable statements**: Every rule becomes a unit test in the `test` skill

## Legacy Project Awareness

When defining use cases on an **existing codebase**:

### Before Step 1: Load Existing Context

1. Read `.product/current-features.md` — understand what features already exist
2. Read `.product/architecture.md` — understand patterns and conventions
3. Search for related existing use cases, services, or modules in the codebase

**Token-efficient search (DO NOT read full files):**
```bash
# Find related existing code by keyword
grep -rn "order\|discount\|payment" src/domain/ src/api/ --include="*.ts" -l | head -10

# Check existing repository interfaces
grep -rn "interface.*Repository\|interface.*Port\|interface.*Service" src/ --include="*.ts" | head -15
```

### Reuse Over Reinvention

- **If a similar entity exists** → extend it, don't create a parallel one
- **If a repository port exists** → add methods to it, don't create a duplicate interface
- **If there's an existing validation library** → use it, don't introduce a new one
- **If there's an existing error handling pattern** → follow it exactly

### Impact Estimate

After defining the use case (Step 7), add an impact summary:

```
Impact Estimate:
  New types/files: 3
  Modified existing files: 2
  Schema changes: YES (1 new model, 1 modified model)
  Risk level: MEDIUM (modifies existing Order model)
  Backward compatible: YES (additive changes only)
```

## Strict Checklist

Follow these steps in order. Do not skip steps.

### Step 1: Clarifying Questions (MANDATORY)

Before any design work, gather requirements by asking the user these essential questions:

1. **Goal**: "What should this feature accomplish? What problem does it solve?"
2. **Actor**: "Who triggers this action? (user, system, external service, scheduled job)"
3. **Inputs/Outputs**: "What data goes in and what comes out?"
4. **Failure cases**: "What can go wrong? What errors should be handled?"
5. **Existing context**: "Are there existing entities, services, or use cases this relates to?"

Wait for answers before proceeding. If answers reveal complexity, ask 1-2 follow-up questions. Do not proceed to Step 2 until requirements are clear.

### Step 2: Explore Trade-offs

Invoke the `brainstorming` skill to explore:

- Alternative approaches to the business logic
- Edge cases and boundary conditions
- Performance implications
- Security considerations

Present trade-offs to the user and get a decision before proceeding.

### Step 3: Define Entities & Value Objects

Identify domain objects involved in this use case:

- Reference existing entities in the codebase (search first)
- Define new entities or value objects if needed
- Place types in the shared `/types` directory (pragmatic boundaries)

### Step 4: Define Input/Output DTOs

Create typed request and response shapes:

- Input DTO: what the caller provides
- Output DTO: what the use case returns
- Apply input validation rules at the DTO level

Reference `references/dto-patterns.ts` for common patterns.

### Step 5: Define Repository Interface (Port)

Specify what data access this use case requires:

- Define the repository interface (port) with method signatures
- Use descriptive method names reflecting business intent (e.g., `findActiveOrdersByUser` not `getOrders`)
- Include error types the repository can throw

### Step 6: Write the Use Case Function

Create the function-based interactor following Pattern B:

- Factory function receives dependencies (repositories, services)
- Returns an async function that executes the business logic
- Apply business rules inside the executor
- Return the Output DTO

Reference `references/use-case-template.ts` for the skeleton.

### Step 7: Document Business Rules

List every business rule as a testable statement. These feed directly into the `test` skill:

```
Business Rules:
- [ ] Orders cannot exceed $10,000 without manager approval
- [ ] Users must have verified email before placing orders
- [ ] Discount codes can only be used once per user
```

Each rule becomes at minimum one unit test.

### Step 8: User Review & Confirmation

Present the complete use case specification:

- Entities & value objects
- Input/Output DTOs
- Repository interface
- Use case function signature
- Business rules checklist

Ask the user to review and confirm before implementation begins with the `develop` skill.

## Output

This skill produces a **use case spec** that includes:
1. Typed DTOs (input/output)
2. Repository interface (port)
3. Use case function with business logic
4. Documented business rules (testable statements)

The `develop` skill consumes this spec for implementation, and the `test` skill uses the business rules for coverage.

## Additional Resources

### Reference Files

- **`references/use-case-template.ts`** — Skeleton of a function-based use case with Pattern B structure, including factory function, dependency injection, and error handling patterns
- **`references/dto-patterns.ts`** — Common DTO patterns including input validation, output mapping, pagination, and error response shapes
