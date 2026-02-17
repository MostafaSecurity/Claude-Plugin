# Flutter Packages — Curated Reference

Recommended packages organized by category. Always check existing `pubspec.yaml` before adding new packages — use what the project already has.

## State Management

| Package | Description | When to Use |
|---------|-------------|-------------|
| `flutter_bloc` | BLoC pattern with events and states | Complex state, large teams, event-driven |
| `bloc` | Core BLoC library (without Flutter widgets) | Dart-only packages |
| `flutter_riverpod` | Compile-safe state management | Modern projects, flexible DI |
| `riverpod_annotation` | Code generation for Riverpod | Reduced boilerplate with Riverpod |
| `provider` | Simple InheritedWidget wrapper | Quick prototyping, simple state |
| `equatable` | Value equality for Dart classes | BLoC events/states, entities |

## Networking

| Package | Description | When to Use |
|---------|-------------|-------------|
| `dio` | Full-featured HTTP client | Most projects (interceptors, FormData) |
| `http` | Simple HTTP client (Dart team) | Lightweight, simple API calls |
| `retrofit` | Type-safe HTTP client (code gen) | Strongly-typed API layer |
| `web_socket_channel` | WebSocket support | Real-time features |

## Local Storage

| Package | Description | When to Use |
|---------|-------------|-------------|
| `shared_preferences` | Key-value storage | Settings, tokens, simple flags |
| `hive` | Fast NoSQL local database | Offline data, cached content |
| `hive_flutter` | Hive with Flutter integration | Hive with widget helpers |
| `isar` | High-performance local database | Complex queries, large datasets |
| `sqflite` | SQLite for Flutter | Relational local data |
| `drift` | Type-safe SQLite (code gen) | Complex SQL with compile safety |
| `flutter_secure_storage` | Encrypted storage | Tokens, passwords, secrets |

## Dependency Injection

| Package | Description | When to Use |
|---------|-------------|-------------|
| `get_it` | Service locator | Most projects (simple, fast) |
| `injectable` | Code generation for get_it | Reduced DI boilerplate |

## Navigation

| Package | Description | When to Use |
|---------|-------------|-------------|
| `go_router` | Declarative routing (Google) | Most projects, deep linking |
| `auto_route` | Code-generated routing | Type-safe routes, complex navigation |

## Code Generation

| Package | Description | When to Use |
|---------|-------------|-------------|
| `freezed` | Immutable classes and unions | Data classes, sealed states |
| `freezed_annotation` | Annotations for freezed | With freezed |
| `json_serializable` | JSON serialization | API models |
| `json_annotation` | Annotations for json_serializable | With json_serializable |
| `build_runner` | Code generation runner | Required for all code gen |

## Testing

| Package | Description | When to Use |
|---------|-------------|-------------|
| `flutter_test` | Widget and unit testing (built-in) | All Flutter tests |
| `bloc_test` | BLoC-specific test utilities | Testing BLoCs and Cubits |
| `mocktail` | Mocking library (no code gen) | Mocking dependencies in tests |
| `mockito` | Mocking library (code gen) | Legacy projects using mockito |
| `integration_test` | Integration testing (built-in) | Full app flow tests |

## UI & Design

| Package | Description | When to Use |
|---------|-------------|-------------|
| `flutter_screenutil` | Responsive sizing | Adaptive layouts |
| `cached_network_image` | Image caching | Network images |
| `shimmer` | Loading shimmer effect | Skeleton loading screens |
| `flutter_svg` | SVG rendering | SVG assets |
| `lottie` | Lottie animations | Complex animations |
| `google_fonts` | Google Fonts | Custom typography |
| `flutter_animate` | Declarative animations | Simple animations |

## Firebase (Optional)

| Package | Description | When to Use |
|---------|-------------|-------------|
| `firebase_core` | Firebase initialization | Any Firebase service |
| `firebase_auth` | Authentication | Firebase-based auth |
| `cloud_firestore` | Firestore database | Firebase backend |
| `firebase_messaging` | Push notifications | FCM push notifications |
| `firebase_analytics` | Analytics | Usage tracking |
| `firebase_crashlytics` | Crash reporting | Production crash tracking |

## Utilities

| Package | Description | When to Use |
|---------|-------------|-------------|
| `dartz` | Functional programming (Either type) | Error handling in domain |
| `fpdart` | Modern FP library | Alternative to dartz |
| `intl` | Internationalization | Date/number formatting, i18n |
| `url_launcher` | Open URLs/email/phone | External links |
| `permission_handler` | Runtime permissions | Camera, location, etc. |
| `connectivity_plus` | Network connectivity | Offline detection |
| `path_provider` | File system paths | File storage |
| `image_picker` | Camera and gallery | Image selection |

## Adding Packages

```bash
# Add a single package
flutter pub add package_name

# Add dev dependency
flutter pub add --dev package_name

# Add multiple packages
flutter pub add dio get_it equatable dartz

# Run code generation after adding code-gen packages
dart run build_runner build --delete-conflicting-outputs
```

## pubspec.yaml Structure

```yaml
dependencies:
  flutter:
    sdk: flutter

  # State Management (pick ONE)
  flutter_bloc: ^8.0.0
  equatable: ^2.0.0

  # Networking
  dio: ^5.0.0

  # DI
  get_it: ^7.0.0

  # Navigation
  go_router: ^14.0.0

  # Error Handling
  dartz: ^0.10.0

  # Storage
  shared_preferences: ^2.0.0

dev_dependencies:
  flutter_test:
    sdk: flutter

  # Testing
  bloc_test: ^9.0.0
  mocktail: ^1.0.0

  # Code Generation (if needed)
  build_runner: ^2.0.0
  freezed: ^2.0.0
  json_serializable: ^6.0.0
  freezed_annotation: ^2.0.0
  json_annotation: ^4.0.0

  # Linting
  flutter_lints: ^4.0.0
```
