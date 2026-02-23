import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme.dart';
import '../providers/providers.dart';
import '../services/health_service.dart';
import 'partner_settings_screen.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  bool _healthKitEnabled = false;
  bool _syncing = false;

  @override
  Widget build(BuildContext context) {
    final userState = ref.watch(userProvider);
    final healthService = ref.read(healthServiceProvider);

    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(22, 48, 22, 20),
        children: [
          Text(
            'Settings',
            style: GoogleFonts.fraunces(
              fontSize: 32,
              fontWeight: FontWeight.w300,
              color: AppColors.bark,
            ),
          ),
          const SizedBox(height: 28),

          // Account card
          userState.maybeWhen(
            data: (user) {
              if (user == null) return const SizedBox.shrink();
              return Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: AppColors.sand),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: AppColors.sageBg,
                        border: Border.all(color: AppColors.sageLight, width: 2),
                      ),
                      child: Center(
                        child: Text(
                          user.name.isNotEmpty ? user.name[0].toUpperCase() : '?',
                          style: GoogleFonts.fraunces(
                            fontSize: 20,
                            fontWeight: FontWeight.w600,
                            color: AppColors.sage,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            user.name,
                            style: GoogleFonts.fraunces(
                              fontSize: 16,
                              fontWeight: FontWeight.w400,
                              color: AppColors.bark,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            user.email,
                            style: GoogleFonts.outfit(
                              fontSize: 12,
                              color: AppColors.textDim,
                              fontWeight: FontWeight.w300,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
            orElse: () => const SizedBox.shrink(),
          ),
          const SizedBox(height: 20),

          // Apple Health section
          if (Platform.isIOS) ...[
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: AppColors.sand),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Apple Health',
                    style: GoogleFonts.fraunces(
                      fontSize: 16,
                      fontWeight: FontWeight.w400,
                      color: AppColors.bark,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Sync menstrual data',
                              style: GoogleFonts.outfit(
                                fontSize: 14,
                                color: AppColors.text,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Import and export cycle data',
                              style: GoogleFonts.outfit(
                                fontSize: 12,
                                color: AppColors.textDim,
                                fontWeight: FontWeight.w300,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Switch.adaptive(
                        value: _healthKitEnabled,
                        activeTrackColor: AppColors.sageLight,
                        thumbColor: WidgetStatePropertyAll(
                          _healthKitEnabled ? AppColors.sage : AppColors.sand,
                        ),
                        onChanged: (value) async {
                          setState(() => _healthKitEnabled = value);
                          if (value) {
                            try {
                              await healthService.requestPermissions();
                              if (mounted) _syncHealthKit(healthService);
                            } catch (e) {
                              if (mounted) {
                                setState(() => _healthKitEnabled = false);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text('HealthKit error: $e', style: GoogleFonts.outfit()),
                                    backgroundColor: AppColors.terracotta,
                                  ),
                                );
                              }
                            }
                          }
                        },
                      ),
                    ],
                  ),
                  if (_healthKitEnabled) ...[
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: TextButton(
                        onPressed: _syncing ? null : () => _syncHealthKit(healthService),
                        style: TextButton.styleFrom(
                          backgroundColor: AppColors.cream,
                          foregroundColor: AppColors.terracotta,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: _syncing
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: AppColors.terracotta,
                                ),
                              )
                            : Text(
                                'Sync now',
                                style: GoogleFonts.outfit(fontSize: 13),
                              ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 20),
          ],

          // Partner sharing
          GestureDetector(
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const PartnerSettingsScreen()),
              );
            },
            child: Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.sand),
              ),
              child: Row(
                children: [
                  const Icon(Icons.favorite_outline, size: 18, color: AppColors.terracotta),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Partner sharing',
                      style: GoogleFonts.outfit(
                        fontSize: 14,
                        fontWeight: FontWeight.w400,
                        color: AppColors.text,
                      ),
                    ),
                  ),
                  const Icon(Icons.chevron_right, size: 20, color: AppColors.textDim),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),

          // Sign out
          GestureDetector(
            onTap: () => ref.read(userProvider.notifier).signOut(),
            child: Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.sand),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.logout, size: 18, color: AppColors.terracotta),
                  const SizedBox(width: 10),
                  Text(
                    'Sign out',
                    style: GoogleFonts.outfit(
                      fontSize: 14,
                      fontWeight: FontWeight.w400,
                      color: AppColors.terracotta,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _syncHealthKit(HealthService healthService) async {
    setState(() => _syncing = true);
    try {
      await healthService.syncToBackend(
        startDate: DateTime.now().subtract(const Duration(days: 365)),
        endDate: DateTime.now(),
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('HealthKit data synced', style: GoogleFonts.outfit()),
            backgroundColor: AppColors.sage,
          ),
        );
        ref.read(periodsProvider.notifier).load();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Sync failed: $e', style: GoogleFonts.outfit()),
            backgroundColor: AppColors.terracotta,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _syncing = false);
    }
  }
}
