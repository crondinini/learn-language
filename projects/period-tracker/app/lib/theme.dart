import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppColors {
  static const cream = Color(0xFFFAF5ED);
  static const warmWhite = Color(0xFFF5EDE0);
  static const sand = Color(0xFFE8DCC8);
  static const terracotta = Color(0xFFC4654A);
  static const terracottaLight = Color(0xFFD98A72);
  static const terracottaBg = Color(0x14C4654A); // 8% opacity
  static const sage = Color(0xFF6B7F5E);
  static const sageLight = Color(0xFF8FA87E);
  static const sageBg = Color(0x146B7F5E);
  static const bark = Color(0xFF4A3F35);
  static const barkLight = Color(0xFF6D5F52);
  static const text = Color(0xFF3A322A);
  static const textMid = Color(0xFF7A6F63);
  static const textDim = Color(0xFFA89D91);
  static const clay = Color(0xFFB8845C);
  static const white = Colors.white;
}

class AppTheme {
  static ThemeData get theme {
    return ThemeData(
      scaffoldBackgroundColor: AppColors.cream,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.terracotta,
        brightness: Brightness.light,
        surface: AppColors.cream,
      ),
      useMaterial3: true,
      textTheme: GoogleFonts.outfitTextTheme().copyWith(
        headlineLarge: GoogleFonts.fraunces(
          fontSize: 32,
          fontWeight: FontWeight.w300,
          color: AppColors.bark,
        ),
        headlineMedium: GoogleFonts.fraunces(
          fontSize: 20,
          fontWeight: FontWeight.w400,
          color: AppColors.bark,
        ),
        headlineSmall: GoogleFonts.fraunces(
          fontSize: 18,
          fontWeight: FontWeight.w300,
          color: AppColors.bark,
        ),
        titleMedium: GoogleFonts.fraunces(
          fontSize: 15,
          fontWeight: FontWeight.w400,
          color: AppColors.bark,
        ),
        titleSmall: GoogleFonts.fraunces(
          fontSize: 14,
          fontWeight: FontWeight.w400,
          color: AppColors.textMid,
        ),
        bodyLarge: GoogleFonts.outfit(
          fontSize: 14,
          fontWeight: FontWeight.w300,
          color: AppColors.text,
        ),
        bodyMedium: GoogleFonts.outfit(
          fontSize: 13,
          fontWeight: FontWeight.w300,
          color: AppColors.textMid,
        ),
        bodySmall: GoogleFonts.outfit(
          fontSize: 12,
          fontWeight: FontWeight.w300,
          color: AppColors.textDim,
        ),
        labelSmall: GoogleFonts.outfit(
          fontSize: 10,
          fontWeight: FontWeight.w400,
          color: AppColors.textDim,
          letterSpacing: 0.5,
        ),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.cream,
        elevation: 0,
        scrolledUnderElevation: 0,
        titleTextStyle: GoogleFonts.fraunces(
          fontSize: 20,
          fontWeight: FontWeight.w400,
          color: AppColors.bark,
        ),
        iconTheme: const IconThemeData(color: AppColors.bark),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: AppColors.cream,
        indicatorColor: AppColors.terracottaBg,
        labelTextStyle: WidgetStatePropertyAll(
          GoogleFonts.outfit(fontSize: 10, fontWeight: FontWeight.w400, color: AppColors.textDim),
        ),
      ),
    );
  }
}
