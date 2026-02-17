---
name: develop-flutter
description: This skill should be used when the user asks to "build flutter app", "develop flutter feature", "flutter screen", "dart code", "implement flutter", "flutter widget", "flutter page", "bloc", "riverpod", or wants to implement a feature in a Flutter/Dart application. It follows Clean Architecture with feature-based modules, supports BLoC/Riverpod/Provider state management, and works on both new and existing Flutter projects.
version: 0.1.0
---

# Flutter Development — Clean Architecture Implementation

Implement features in a Flutter/Dart application following Clean Architecture with feature-based modules. This skill is a flexible guide — adapt the order based on what makes sense for the specific feature.

> **For React/Next.js + Node/Express projects**, use `/develop` instead.

## Legacy Project Rules

When working on an **existing Flutter codebase** (detected by presence of `pubspec.yaml` or `.product/architecture.md` mentioning Flutter):

### Convention Detection (Before Writing Code)

Read `.product/architecture.md` first. If it doesn't exist, check the codebase directly:

```bash
# What state management does this project use?
grep -rn "flutter_bloc\|riverpod\|provider" pubspec.yaml | head -5

# What architecture pattern?
ls lib/features/ lib/modules/ lib/src/ lib/presentation/ lib/domain/ lib/data/ 2>/dev/null

# What naming convention?
find lib/ -name "*.dart" | head -20

# What import style?
grep -rn "^import " lib/main.dart | head -10

# What DI approach?
grep -rn "get_it\|injectable\|riverpod" pubspec.yaml | head -5
```

**Match existing conventions exactly:**
- If the project uses BLoC → use BLoC, don't introduce Riverpod
- If the project uses `snake_case` file names → keep `snake_case`
- If the project uses feature-based folders → don't introduce layer-based
- If the project uses a custom API client → use it, don't introduce dio
- If the project uses GetX → use GetX, don't switch to BLoC

### Impact Analysis (Before Implementing)

Before writing any code, present an impact plan:

```
Implementation Plan:

  Feature: [name]
  Risk Level: LOW / MEDIUM / HIGH

  New files ({{COUNT}}):
    - lib/features/discount/domain/entities/discount.dart
    - lib/features/discount/domain/usecases/apply_discount.dart
    - lib/features/discount/data/repositories/discount_repository_impl.dart
    - lib/features/discount/presentation/pages/discount_page.dart
    - lib/features/discount/presentation/bloc/discount_bloc.dart

  Modified files ({{COUNT}}):
    - lib/core/di/injection.dart (register new dependencies)
    - lib/core/router/app_router.dart (add route)

  Backward compatibility: No breaking changes
  Estimated token cost: ~2,500 (reading 6 files)

Proceed? (y/adjust)
```

**Always wait for user confirmation before writing code on legacy projects.**

### Minimal-Impact Rules

1. **Never modify files that aren't directly related** to the feature
2. **Never refactor existing code** unless the user explicitly asks for it
3. **Add, don't replace** — extend existing modules rather than rewriting them
4. **Preserve all existing tests** — never delete or modify passing tests
5. **If a breaking change is needed**, flag it as HIGH risk and explain the impact
6. **Follow the existing folder structure** — don't reorganize the project

## Architecture Overview

```
lib/
├── core/                      ← App-wide utilities and config
│   ├── constants/             ← App constants, API URLs, keys
│   ├── error/                 ← Failure classes, exceptions
│   ├── network/               ← API client (dio/http), interceptors
│   ├── theme/                 ← App theme, colors, text styles
│   ├── utils/                 ← Shared helpers, extensions
│   ├── di/                    ← Dependency injection setup (get_it)
│   └── router/                ← Navigation setup (go_router/auto_route)
├── features/                  ← Feature modules (self-contained)
│   └── feature_name/
│       ├── data/
│       │   ├── datasources/   ← Remote (API) and local (cache) data sources
│       │   ├── models/        ← Data models (JSON serialization)
│       │   └── repositories/  ← Repository implementations
│       ├── domain/
│       │   ├── entities/      ← Business entities (pure Dart)
│       │   ├── repositories/  ← Repository interfaces (abstract classes)
│       │   └── usecases/      ← Use case classes
│       └── presentation/
│           ├── bloc/          ← BLoC/Cubit (or providers/notifiers)
│           ├── pages/         ← Full screen pages
│           └── widgets/       ← Feature-specific widgets
├── shared/                    ← Shared UI components
│   ├── widgets/               ← Reusable widgets across features
│   └── extensions/            ← Dart extensions
└── main.dart                  ← Entry point, DI init, app bootstrap
test/                          ← Unit + widget tests (mirrors lib/)
integration_test/              ← Full app integration tests
```

**Import rules:** Presentation → Domain ← Data. Domain layer is pure Dart (no Flutter imports in entities/usecases). Data layer implements domain interfaces.

## State Management

Before implementing, check which state management the project uses:

1. Read `.product/decisions.md` — find DEC-004 (Flutter State Management)
2. Check `pubspec.yaml` for `flutter_bloc`, `riverpod`, or `provider`

| State Management | Package | When to Use | Reference |
|-----------------|---------|-------------|-----------|
| **BLoC** (recommended) | `flutter_bloc` | Complex state, event-driven, large teams | `references/flutter-architecture.md` |
| **Riverpod** | `flutter_riverpod` | Compile-safe, testable, flexible | `references/flutter-architecture.md` |
| **Provider** | `provider` | Simple state, quick prototyping | `references/flutter-architecture.md` |

**Key rule:** The domain layer is IDENTICAL regardless of state management. Only the `presentation/` layer changes.

Reference `references/flutter-architecture.md` for complete implementation patterns per state management approach.

## Development Guide

### Step 1: Check for Use Case Spec

Before implementing, look for an existing use case specification:

- Search the codebase for related use case files in `lib/features/*/domain/usecases/`
- Check if the `use-case` skill was run previously
- If no spec exists, suggest running the `use-case` skill first — but do not block if the user wants to proceed

Needed from the spec: entities, use case parameters, repository interface, business rules.

### Step 2: Implement Domain Layer

Build the use case and supporting domain objects in pure Dart:

**Entities** — `lib/features/{name}/domain/entities/`

```dart
class Discount {
  final String id;
  final double percentage;
  final DateTime validUntil;
  final bool isActive;

  const Discount({
    required this.id,
    required this.percentage,
    required this.validUntil,
    required this.isActive,
  });
}
```

**Repository Interface** — `lib/features/{name}/domain/repositories/`

```dart
abstract class DiscountRepository {
  Future<Either<Failure, Discount>> getDiscount(String id);
  Future<Either<Failure, Discount>> applyDiscount(ApplyDiscountParams params);
}
```

**Use Case** — `lib/features/{name}/domain/usecases/`

```dart
class ApplyDiscount {
  final DiscountRepository repository;

  ApplyDiscount(this.repository);

  Future<Either<Failure, Discount>> call(ApplyDiscountParams params) {
    return repository.applyDiscount(params);
  }
}
```

**Important:** Domain code must NOT import Flutter packages. It only knows about abstract interfaces and pure Dart types.

### Step 3: Implement Data Layer

Build concrete implementations of domain interfaces:

**Data Model** — `lib/features/{name}/data/models/`

```dart
class DiscountModel extends Discount {
  const DiscountModel({
    required super.id,
    required super.percentage,
    required super.validUntil,
    required super.isActive,
  });

  factory DiscountModel.fromJson(Map<String, dynamic> json) {
    return DiscountModel(
      id: json['id'],
      percentage: json['percentage'].toDouble(),
      validUntil: DateTime.parse(json['valid_until']),
      isActive: json['is_active'],
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'percentage': percentage,
    'valid_until': validUntil.toIso8601String(),
    'is_active': isActive,
  };
}
```

**Data Source** — `lib/features/{name}/data/datasources/`

```dart
abstract class DiscountRemoteDataSource {
  Future<DiscountModel> getDiscount(String id);
  Future<DiscountModel> applyDiscount(ApplyDiscountParams params);
}

class DiscountRemoteDataSourceImpl implements DiscountRemoteDataSource {
  final Dio dio;

  DiscountRemoteDataSourceImpl(this.dio);

  @override
  Future<DiscountModel> getDiscount(String id) async {
    final response = await dio.get('/api/discounts/$id');
    return DiscountModel.fromJson(response.data);
  }
}
```

**Repository Implementation** — `lib/features/{name}/data/repositories/`

```dart
class DiscountRepositoryImpl implements DiscountRepository {
  final DiscountRemoteDataSource remoteDataSource;

  DiscountRepositoryImpl(this.remoteDataSource);

  @override
  Future<Either<Failure, Discount>> getDiscount(String id) async {
    try {
      final result = await remoteDataSource.getDiscount(id);
      return Right(result);
    } on DioException catch (e) {
      return Left(ServerFailure(e.message ?? 'Server error'));
    }
  }
}
```

**Key principle:** Data layer errors should be caught and translated to `Failure` objects before crossing the boundary to domain.

### Step 4: Implement Presentation Layer

Build the UI and state management for the feature.

#### BLoC Pattern (Recommended)

**Events** — `lib/features/{name}/presentation/bloc/{name}_event.dart`

```dart
abstract class DiscountEvent extends Equatable {
  const DiscountEvent();
}

class ApplyDiscountRequested extends DiscountEvent {
  final String code;
  const ApplyDiscountRequested(this.code);

  @override
  List<Object> get props => [code];
}
```

**State** — `lib/features/{name}/presentation/bloc/{name}_state.dart`

```dart
abstract class DiscountState extends Equatable {
  const DiscountState();
}

class DiscountInitial extends DiscountState { ... }
class DiscountLoading extends DiscountState { ... }
class DiscountLoaded extends DiscountState {
  final Discount discount;
  const DiscountLoaded(this.discount);
}
class DiscountError extends DiscountState {
  final String message;
  const DiscountError(this.message);
}
```

**BLoC** — `lib/features/{name}/presentation/bloc/{name}_bloc.dart`

```dart
class DiscountBloc extends Bloc<DiscountEvent, DiscountState> {
  final ApplyDiscount applyDiscount;

  DiscountBloc({required this.applyDiscount}) : super(DiscountInitial()) {
    on<ApplyDiscountRequested>(_onApplyDiscount);
  }

  Future<void> _onApplyDiscount(
    ApplyDiscountRequested event,
    Emitter<DiscountState> emit,
  ) async {
    emit(DiscountLoading());
    final result = await applyDiscount(ApplyDiscountParams(code: event.code));
    result.fold(
      (failure) => emit(DiscountError(failure.message)),
      (discount) => emit(DiscountLoaded(discount)),
    );
  }
}
```

**Page** — `lib/features/{name}/presentation/pages/{name}_page.dart`

```dart
class DiscountPage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => getIt<DiscountBloc>(),
      child: BlocBuilder<DiscountBloc, DiscountState>(
        builder: (context, state) {
          if (state is DiscountLoading) return const CircularProgressIndicator();
          if (state is DiscountError) return ErrorWidget(state.message);
          if (state is DiscountLoaded) return DiscountView(state.discount);
          return const SizedBox.shrink();
        },
      ),
    );
  }
}
```

Reference `references/flutter-architecture.md` for Riverpod and Provider alternatives.

Guidelines:
- Keep widgets focused — one responsibility per widget
- Extract business logic into BLoC/Cubit, keep widgets presentational
- Handle loading, error, and empty states in every page
- Use `const` constructors where possible for performance

### Step 5: Wire Dependencies

Connect all layers using dependency injection (`lib/core/di/injection.dart`):

```dart
final getIt = GetIt.instance;

void initDependencies() {
  // Core
  getIt.registerLazySingleton<Dio>(() => Dio(BaseOptions(
    baseUrl: AppConstants.apiBaseUrl,
  )));

  // Data Sources
  getIt.registerLazySingleton<DiscountRemoteDataSource>(
    () => DiscountRemoteDataSourceImpl(getIt()),
  );

  // Repositories
  getIt.registerLazySingleton<DiscountRepository>(
    () => DiscountRepositoryImpl(getIt()),
  );

  // Use Cases
  getIt.registerLazySingleton(() => ApplyDiscount(getIt()));

  // BLoCs
  getIt.registerFactory(() => DiscountBloc(applyDiscount: getIt()));
}
```

**Call `initDependencies()` in `main.dart` before `runApp()`.**

If the project uses `injectable`, generate the injection config instead:
```bash
dart run build_runner build --delete-conflicting-outputs
```

### Step 6: Add Navigation

Register the new route in the app router:

#### go_router

```dart
GoRoute(
  path: '/discounts',
  builder: (context, state) => const DiscountPage(),
),
```

#### auto_route

```dart
AutoRoute(page: DiscountRoute.page, path: '/discounts'),
```

If the project uses `auto_route`, regenerate routes:
```bash
dart run build_runner build --delete-conflicting-outputs
```

### Step 7: Smoke Check

Verify the feature works end-to-end:

```bash
# Run the app
flutter run

# Run code generation (if using freezed/json_serializable/auto_route)
dart run build_runner build --delete-conflicting-outputs

# Check for analyzer issues
flutter analyze

# Run tests
flutter test
```

- Verify the new screen renders correctly
- Test the full user flow (UI → BLoC → UseCase → Repository → API)
- Check for analyzer warnings and fix them

## Local Storage Support

If the feature needs local storage, choose based on project decisions:

| Storage | Package | Use Case |
|---------|---------|----------|
| **Key-value** | `shared_preferences` | Settings, tokens, simple flags |
| **NoSQL local DB** | `hive` / `isar` | Offline-first, cached data |
| **SQL local DB** | `sqflite` / `drift` | Complex queries, relational data |
| **Secure storage** | `flutter_secure_storage` | Tokens, passwords, sensitive data |

Add a **local data source** alongside the remote one:

```dart
abstract class DiscountLocalDataSource {
  Future<DiscountModel?> getCachedDiscount(String id);
  Future<void> cacheDiscount(DiscountModel discount);
}
```

The repository then coordinates between remote and local:

```dart
@override
Future<Either<Failure, Discount>> getDiscount(String id) async {
  try {
    final remote = await remoteDataSource.getDiscount(id);
    await localDataSource.cacheDiscount(remote);
    return Right(remote);
  } on DioException {
    // Fallback to cache
    final cached = await localDataSource.getCachedDiscount(id);
    if (cached != null) return Right(cached);
    return Left(CacheFailure('No cached data available'));
  }
}
```

## Code Generation

Many Flutter projects use code generation. If the project uses any of these, run build_runner after changes:

| Package | Purpose | Generated Files |
|---------|---------|----------------|
| `freezed` | Immutable classes, unions | `*.freezed.dart` |
| `json_serializable` | JSON serialization | `*.g.dart` |
| `auto_route` | Type-safe navigation | `*.gr.dart` |
| `injectable` | DI code generation | `*.config.dart` |
| `retrofit` | API client generation | `*.g.dart` |

```bash
# Generate all
dart run build_runner build --delete-conflicting-outputs

# Watch mode (during development)
dart run build_runner watch --delete-conflicting-outputs
```

**Never manually edit generated files** (those ending in `.freezed.dart`, `.g.dart`, `.gr.dart`).

## Composing with Other Skills

| Skill | When to Invoke |
|-------|----------------|
| `/use-case` | Before implementation — define business rules and use case specs |
| `/test` | After implementation — write unit, widget, and integration tests |
| `/ship` | When ready to commit and push changes |
| `/deploy` | When ready to build and deploy to app stores or web hosting |
| `/setup-infra` | If Flutter SDK is missing or needs configuration |

## Additional Resources

### Reference Files

- **`references/flutter-architecture.md`** — Complete Clean Architecture patterns for Flutter with BLoC, Riverpod, and Provider examples, dependency injection, and error handling
- **`references/flutter-packages.md`** — Curated list of recommended Flutter packages organized by category: state management, networking, storage, navigation, testing, and UI
