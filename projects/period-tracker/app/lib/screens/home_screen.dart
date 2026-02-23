import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme.dart';
import 'synced_home_screen.dart';
import 'calendar_screen.dart';
import 'history_screen.dart';
import 'settings_screen.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  int _currentIndex = 0;

  final _screens = const [
    SyncedHomeScreen(),
    CalendarScreen(),
    HistoryScreen(),
    SettingsScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cream,
      body: _screens[_currentIndex],
      bottomNavigationBar: _buildBottomNav(),
    );
  }

  Widget _buildBottomNav() {
    final items = [
      _NavItem(icon: Icons.circle_outlined, activeIcon: Icons.circle, label: 'Home'),
      _NavItem(icon: Icons.calendar_today_outlined, activeIcon: Icons.calendar_today, label: 'Calendar'),
      _NavItem(icon: Icons.water_drop_outlined, activeIcon: Icons.water_drop, label: 'History'),
      _NavItem(icon: Icons.settings_outlined, activeIcon: Icons.settings, label: 'Settings'),
    ];

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [AppColors.cream.withAlpha(0), AppColors.cream],
          stops: const [0.0, 0.3],
        ),
      ),
      padding: const EdgeInsets.only(left: 20, right: 20, bottom: 28, top: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: items.asMap().entries.map((entry) {
          final i = entry.key;
          final item = entry.value;
          final isActive = i == _currentIndex;

          return GestureDetector(
            onTap: () => setState(() => _currentIndex = i),
            behavior: HitTestBehavior.opaque,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: isActive ? AppColors.terracottaBg : Colors.transparent,
                    border: Border.all(
                      color: isActive ? AppColors.terracotta : AppColors.textDim,
                      width: 1.5,
                    ),
                  ),
                  child: Icon(
                    isActive ? item.activeIcon : item.icon,
                    size: 13,
                    color: isActive ? AppColors.terracotta : AppColors.textDim,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  item.label,
                  style: GoogleFonts.outfit(
                    fontSize: 10,
                    fontWeight: FontWeight.w400,
                    color: isActive ? AppColors.terracotta : AppColors.textDim,
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _NavItem {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  const _NavItem({required this.icon, required this.activeIcon, required this.label});
}
