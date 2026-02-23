import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'theme.dart';
import 'providers/providers.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';

void main() {
  runApp(const ProviderScope(child: SyncedApp()));
}

class SyncedApp extends StatelessWidget {
  const SyncedApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Synced',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.theme,
      home: const AuthGate(),
    );
  }
}

class AuthGate extends ConsumerWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userState = ref.watch(userProvider);

    return userState.when(
      loading: () => Scaffold(
        backgroundColor: AppColors.cream,
        body: const Center(
          child: CircularProgressIndicator(color: AppColors.terracotta),
        ),
      ),
      error: (_, _) => const LoginScreen(),
      data: (user) {
        if (user == null) return const LoginScreen();
        return const HomeScreen();
      },
    );
  }
}
