# Flutter Clean Architecture — Reference Guide

Complete architecture patterns for Flutter applications. This reference covers directory structure, state management implementations, dependency injection, and error handling.

## Directory Structure

```
lib/
├── core/
│   ├── constants/
│   │   └── app_constants.dart          # API URLs, keys, app-wide constants
│   ├── error/
│   │   ├── exceptions.dart             # ServerException, CacheException
│   │   └── failures.dart               # Failure abstract class + implementations
│   ├── network/
│   │   ├── api_client.dart             # Dio instance with interceptors
│   │   └── network_info.dart           # Connectivity checker
│   ├── theme/
│   │   ├── app_theme.dart              # ThemeData definitions
│   │   ├── app_colors.dart             # Color palette
│   │   └── app_text_styles.dart        # Typography
│   ├── utils/
│   │   └── extensions.dart             # Dart extensions
│   ├── di/
│   │   └── injection.dart              # GetIt setup
│   └── router/
│       └── app_router.dart             # Route definitions
├── features/
│   └── auth/                           # Example feature module
│       ├── data/
│       │   ├── datasources/
│       │   │   ├── auth_remote_data_source.dart
│       │   │   └── auth_local_data_source.dart
│       │   ├── models/
│       │   │   └── user_model.dart
│       │   └── repositories/
│       │       └── auth_repository_impl.dart
│       ├── domain/
│       │   ├── entities/
│       │   │   └── user.dart
│       │   ├── repositories/
│       │   │   └── auth_repository.dart
│       │   └── usecases/
│       │       ├── login.dart
│       │       └── register.dart
│       └── presentation/
│           ├── bloc/
│           │   ├── auth_bloc.dart
│           │   ├── auth_event.dart
│           │   └── auth_state.dart
│           ├── pages/
│           │   ├── login_page.dart
│           │   └── register_page.dart
│           └── widgets/
│               └── auth_form.dart
├── shared/
│   ├── widgets/
│   │   ├── loading_indicator.dart
│   │   ├── error_view.dart
│   │   └── empty_state.dart
│   └── extensions/
│       └── context_extensions.dart
└── main.dart
```

## Error Handling Pattern

### Failure Classes

```dart
// lib/core/error/failures.dart
abstract class Failure extends Equatable {
  final String message;
  const Failure(this.message);

  @override
  List<Object> get props => [message];
}

class ServerFailure extends Failure {
  const ServerFailure(super.message);
}

class CacheFailure extends Failure {
  const CacheFailure(super.message);
}

class NetworkFailure extends Failure {
  const NetworkFailure(super.message);
}

class ValidationFailure extends Failure {
  const ValidationFailure(super.message);
}
```

### Exception Classes

```dart
// lib/core/error/exceptions.dart
class ServerException implements Exception {
  final String message;
  final int? statusCode;

  const ServerException({required this.message, this.statusCode});
}

class CacheException implements Exception {
  final String message;
  const CacheException({required this.message});
}
```

### Either Type (using dartz or fpdart)

```dart
// Domain repositories return Either<Failure, T>
abstract class AuthRepository {
  Future<Either<Failure, User>> login(LoginParams params);
  Future<Either<Failure, User>> register(RegisterParams params);
  Future<Either<Failure, void>> logout();
}
```

## Use Case Base Class

```dart
// lib/core/usecases/usecase.dart
abstract class UseCase<Type, Params> {
  Future<Either<Failure, Type>> call(Params params);
}

class NoParams extends Equatable {
  @override
  List<Object> get props => [];
}
```

```dart
// Usage
class Login extends UseCase<User, LoginParams> {
  final AuthRepository repository;

  Login(this.repository);

  @override
  Future<Either<Failure, User>> call(LoginParams params) {
    return repository.login(params);
  }
}

class LoginParams extends Equatable {
  final String email;
  final String password;

  const LoginParams({required this.email, required this.password});

  @override
  List<Object> get props => [email, password];
}
```

## State Management Patterns

### BLoC Pattern (Recommended)

Best for: large apps, complex state, teams, event-driven flows.

```dart
// Events
abstract class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object> get props => [];
}

class LoginRequested extends AuthEvent {
  final String email;
  final String password;

  const LoginRequested({required this.email, required this.password});

  @override
  List<Object> get props => [email, password];
}

class LogoutRequested extends AuthEvent {}

// States
abstract class AuthState extends Equatable {
  const AuthState();

  @override
  List<Object> get props => [];
}

class AuthInitial extends AuthState {}
class AuthLoading extends AuthState {}
class AuthAuthenticated extends AuthState {
  final User user;
  const AuthAuthenticated(this.user);

  @override
  List<Object> get props => [user];
}
class AuthUnauthenticated extends AuthState {}
class AuthError extends AuthState {
  final String message;
  const AuthError(this.message);

  @override
  List<Object> get props => [message];
}

// BLoC
class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final Login login;
  final Logout logout;

  AuthBloc({required this.login, required this.logout})
    : super(AuthInitial()) {
    on<LoginRequested>(_onLogin);
    on<LogoutRequested>(_onLogout);
  }

  Future<void> _onLogin(LoginRequested event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    final result = await login(LoginParams(
      email: event.email,
      password: event.password,
    ));
    result.fold(
      (failure) => emit(AuthError(failure.message)),
      (user) => emit(AuthAuthenticated(user)),
    );
  }

  Future<void> _onLogout(LogoutRequested event, Emitter<AuthState> emit) async {
    await logout(NoParams());
    emit(AuthUnauthenticated());
  }
}

// Usage in Widget
BlocProvider(
  create: (_) => getIt<AuthBloc>(),
  child: BlocConsumer<AuthBloc, AuthState>(
    listener: (context, state) {
      if (state is AuthAuthenticated) {
        context.go('/home');
      }
      if (state is AuthError) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(state.message)),
        );
      }
    },
    builder: (context, state) {
      if (state is AuthLoading) return const CircularProgressIndicator();
      return LoginForm();
    },
  ),
);
```

### Riverpod Pattern

Best for: compile-safe DI, flexible state, no context dependency.

```dart
// Providers
final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepositoryImpl(ref.watch(dioProvider));
});

final loginProvider = Provider<Login>((ref) {
  return Login(ref.watch(authRepositoryProvider));
});

// State Notifier
class AuthNotifier extends StateNotifier<AuthState> {
  final Login _login;

  AuthNotifier(this._login) : super(const AuthState.initial());

  Future<void> login(String email, String password) async {
    state = const AuthState.loading();
    final result = await _login(LoginParams(email: email, password: password));
    result.fold(
      (failure) => state = AuthState.error(failure.message),
      (user) => state = AuthState.authenticated(user),
    );
  }
}

final authNotifierProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.watch(loginProvider));
});

// Usage in Widget (with ConsumerWidget)
class LoginPage extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authNotifierProvider);

    return authState.when(
      initial: () => LoginForm(),
      loading: () => const CircularProgressIndicator(),
      authenticated: (user) => HomeView(user),
      error: (message) => ErrorView(message),
    );
  }
}
```

### Provider Pattern

Best for: simple state, quick prototyping, small apps.

```dart
// ChangeNotifier
class AuthProvider extends ChangeNotifier {
  final Login _login;

  AuthProvider(this._login);

  User? _user;
  bool _isLoading = false;
  String? _error;

  User? get user => _user;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isAuthenticated => _user != null;

  Future<void> login(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    final result = await _login(LoginParams(email: email, password: password));
    result.fold(
      (failure) => _error = failure.message,
      (user) => _user = user,
    );

    _isLoading = false;
    notifyListeners();
  }
}

// Usage in Widget
Consumer<AuthProvider>(
  builder: (context, auth, child) {
    if (auth.isLoading) return const CircularProgressIndicator();
    if (auth.error != null) return ErrorView(auth.error!);
    return LoginForm();
  },
);
```

## Dependency Injection with get_it

```dart
// lib/core/di/injection.dart
import 'package:get_it/get_it.dart';

final getIt = GetIt.instance;

void initDependencies() {
  // ── Core ──
  getIt.registerLazySingleton<Dio>(() => Dio(BaseOptions(
    baseUrl: AppConstants.apiBaseUrl,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 10),
  ))..interceptors.add(LogInterceptor()));

  // ── Data Sources ──
  getIt.registerLazySingleton<AuthRemoteDataSource>(
    () => AuthRemoteDataSourceImpl(getIt<Dio>()),
  );
  getIt.registerLazySingleton<AuthLocalDataSource>(
    () => AuthLocalDataSourceImpl(getIt<SharedPreferences>()),
  );

  // ── Repositories ──
  getIt.registerLazySingleton<AuthRepository>(
    () => AuthRepositoryImpl(
      remoteDataSource: getIt(),
      localDataSource: getIt(),
    ),
  );

  // ── Use Cases ──
  getIt.registerLazySingleton(() => Login(getIt()));
  getIt.registerLazySingleton(() => Register(getIt()));
  getIt.registerLazySingleton(() => Logout(getIt()));

  // ── BLoCs (Factory = new instance each time) ──
  getIt.registerFactory(() => AuthBloc(
    login: getIt(),
    logout: getIt(),
  ));
}
```

```dart
// lib/main.dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  initDependencies();
  runApp(const MyApp());
}
```

## API Client Pattern with Dio

```dart
// lib/core/network/api_client.dart
class ApiClient {
  final Dio _dio;

  ApiClient(this._dio);

  Future<T> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    required T Function(dynamic data) fromJson,
  }) async {
    try {
      final response = await _dio.get(path, queryParameters: queryParameters);
      return fromJson(response.data);
    } on DioException catch (e) {
      throw ServerException(
        message: e.response?.data['message'] ?? 'Server error',
        statusCode: e.response?.statusCode,
      );
    }
  }

  Future<T> post<T>(
    String path, {
    dynamic data,
    required T Function(dynamic data) fromJson,
  }) async {
    try {
      final response = await _dio.post(path, data: data);
      return fromJson(response.data);
    } on DioException catch (e) {
      throw ServerException(
        message: e.response?.data['message'] ?? 'Server error',
        statusCode: e.response?.statusCode,
      );
    }
  }
}
```

## State Management Comparison

| Criteria | BLoC | Riverpod | Provider |
|----------|------|----------|----------|
| **Learning curve** | Medium | Medium-High | Low |
| **Boilerplate** | High (events + states) | Medium | Low |
| **Testability** | Excellent (bloc_test) | Excellent | Good |
| **Scalability** | Excellent | Excellent | Moderate |
| **Compile safety** | Good | Excellent | Moderate |
| **Team size** | Large teams | Any | Small teams |
| **Best for** | Complex, event-driven | Flexible, modern | Simple, quick |
| **DI approach** | External (get_it) | Built-in providers | External or InheritedWidget |
