import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme.dart';
import '../providers/providers.dart';

class LoginScreen extends ConsumerWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userState = ref.watch(userProvider);

    return Scaffold(
      backgroundColor: AppColors.cream,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 36),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Bloom icon
                Container(
                  width: 80,
                  height: 80,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      colors: [AppColors.terracottaLight, AppColors.terracotta],
                    ),
                  ),
                  child: const Center(
                    child: Icon(Icons.spa_outlined, size: 36, color: Colors.white),
                  ),
                ),
                const SizedBox(height: 32),
                Text(
                  'Synced',
                  style: GoogleFonts.fraunces(
                    fontSize: 40,
                    fontWeight: FontWeight.w300,
                    color: AppColors.bark,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Understand your cycle,\nnurture your rhythm',
                  style: GoogleFonts.outfit(
                    fontSize: 15,
                    fontWeight: FontWeight.w300,
                    color: AppColors.textMid,
                    height: 1.5,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 56),
                userState.when(
                  loading: () => const CircularProgressIndicator(
                    color: AppColors.terracotta,
                  ),
                  error: (e, _) => Column(
                    children: [
                      Text(
                        'Sign in failed: $e',
                        style: GoogleFonts.outfit(
                          color: AppColors.terracotta,
                          fontSize: 13,
                        ),
                      ),
                      const SizedBox(height: 20),
                      _buildSignInButton(ref),
                    ],
                  ),
                  data: (_) => _buildSignInButton(ref),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSignInButton(WidgetRef ref) {
    return SizedBox(
      width: double.infinity,
      height: 54,
      child: ElevatedButton(
        onPressed: () {
          ref.read(userProvider.notifier).signInWithGoogle();
        },
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.white,
          foregroundColor: AppColors.bark,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(27),
            side: const BorderSide(color: AppColors.sand),
          ),
          elevation: 0,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Simple G icon
            Container(
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.terracotta, width: 1.5),
              ),
              child: Center(
                child: Text(
                  'G',
                  style: GoogleFonts.fraunces(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: AppColors.terracotta,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Text(
              'Continue with Google',
              style: GoogleFonts.outfit(
                fontSize: 15,
                fontWeight: FontWeight.w400,
                color: AppColors.bark,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
