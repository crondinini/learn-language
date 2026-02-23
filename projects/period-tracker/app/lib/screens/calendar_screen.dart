import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:table_calendar/table_calendar.dart';
import '../theme.dart';
import '../providers/providers.dart';
import '../models/period.dart';
import '../models/prediction.dart';
import 'day_detail_screen.dart';

class CalendarScreen extends ConsumerStatefulWidget {
  const CalendarScreen({super.key});

  @override
  ConsumerState<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends ConsumerState<CalendarScreen> {
  DateTime _focusedDay = DateTime.now();
  DateTime? _selectedDay;

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref.read(periodsProvider.notifier).load();
      ref.read(predictionProvider.notifier).load();
    });
  }

  Set<DateTime> _getPeriodDays(List<Period> periods) {
    final days = <DateTime>{};
    for (final period in periods) {
      final start = DateTime.parse(period.startDate);
      final end = period.endDate != null ? DateTime.parse(period.endDate!) : start;
      for (var d = start; !d.isAfter(end); d = d.add(const Duration(days: 1))) {
        days.add(DateTime(d.year, d.month, d.day));
      }
    }
    return days;
  }

  Set<DateTime> _getPredictedDays(Prediction? prediction) {
    if (prediction == null) return {};
    final days = <DateTime>{};
    final start = prediction.predictedStartDate;
    final end = prediction.predictedEndDate;
    for (var d = start; !d.isAfter(end); d = d.add(const Duration(days: 1))) {
      days.add(DateTime(d.year, d.month, d.day));
    }
    return days;
  }

  @override
  Widget build(BuildContext context) {
    final periodsState = ref.watch(periodsProvider);
    final predictionState = ref.watch(predictionProvider);

    final periodDaySet = periodsState.maybeWhen(
      data: (periods) => _getPeriodDays(periods),
      orElse: () => <DateTime>{},
    );

    final predictedDaySet = predictionState.maybeWhen(
      data: (prediction) => _getPredictedDays(prediction),
      orElse: () => <DateTime>{},
    );

    return SafeArea(
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(22, 48, 22, 0),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Calendar',
                style: GoogleFonts.fraunces(
                  fontSize: 32,
                  fontWeight: FontWeight.w300,
                  color: AppColors.bark,
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: TableCalendar(
              firstDay: DateTime(2020),
              lastDay: DateTime(2030),
              focusedDay: _focusedDay,
              selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
              onDaySelected: (selectedDay, focusedDay) {
                setState(() {
                  _selectedDay = selectedDay;
                  _focusedDay = focusedDay;
                });
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => DayDetailScreen(date: selectedDay),
                  ),
                );
              },
              onPageChanged: (focusedDay) => _focusedDay = focusedDay,
              calendarStyle: CalendarStyle(
                outsideDaysVisible: false,
                defaultTextStyle: GoogleFonts.fraunces(
                  fontSize: 15,
                  color: AppColors.textMid,
                ),
                weekendTextStyle: GoogleFonts.fraunces(
                  fontSize: 15,
                  color: AppColors.textMid,
                ),
                todayDecoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.barkLight, width: 2),
                ),
                todayTextStyle: GoogleFonts.fraunces(
                  fontSize: 15,
                  color: AppColors.bark,
                  fontWeight: FontWeight.w600,
                ),
                selectedDecoration: const BoxDecoration(
                  color: AppColors.bark,
                  shape: BoxShape.circle,
                ),
                selectedTextStyle: GoogleFonts.fraunces(
                  fontSize: 15,
                  color: Colors.white,
                ),
              ),
              daysOfWeekStyle: DaysOfWeekStyle(
                weekdayStyle: GoogleFonts.outfit(
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                  color: AppColors.textDim,
                ),
                weekendStyle: GoogleFonts.outfit(
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                  color: AppColors.textDim,
                ),
              ),
              headerStyle: HeaderStyle(
                formatButtonVisible: false,
                titleCentered: true,
                titleTextStyle: GoogleFonts.fraunces(
                  fontSize: 18,
                  fontWeight: FontWeight.w400,
                  color: AppColors.bark,
                ),
                leftChevronIcon: const Icon(Icons.chevron_left, color: AppColors.bark),
                rightChevronIcon: const Icon(Icons.chevron_right, color: AppColors.bark),
              ),
              calendarBuilders: CalendarBuilders(
                defaultBuilder: (context, day, focusedDay) {
                  final norm = DateTime(day.year, day.month, day.day);
                  if (periodDaySet.contains(norm)) {
                    return _dayCell(day, AppColors.terracotta, Colors.white);
                  }
                  if (predictedDaySet.contains(norm)) {
                    return _predictedCell(day);
                  }
                  return null;
                },
                todayBuilder: (context, day, focusedDay) {
                  final norm = DateTime(day.year, day.month, day.day);
                  if (periodDaySet.contains(norm)) {
                    return _dayCell(day, AppColors.terracotta, Colors.white, ring: true);
                  }
                  return null;
                },
              ),
            ),
          ),
          const Spacer(),
          // Legend
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _legendDot(AppColors.terracotta, 'Period'),
                const SizedBox(width: 20),
                _legendRing(AppColors.terracotta, 'Predicted'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _dayCell(DateTime day, Color bg, Color textColor, {bool ring = false}) {
    return Container(
      margin: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: bg,
        shape: BoxShape.circle,
        border: ring ? Border.all(color: AppColors.bark, width: 2) : null,
      ),
      alignment: Alignment.center,
      child: Text(
        '${day.day}',
        style: GoogleFonts.fraunces(
          fontSize: 15,
          color: textColor,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _predictedCell(DateTime day) {
    return Container(
      margin: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.terracottaLight, width: 2),
      ),
      alignment: Alignment.center,
      child: Text(
        '${day.day}',
        style: GoogleFonts.fraunces(
          fontSize: 15,
          color: AppColors.terracotta,
        ),
      ),
    );
  }

  Widget _legendDot(Color color, String label) {
    return Row(
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(shape: BoxShape.circle, color: color),
        ),
        const SizedBox(width: 6),
        Text(label, style: GoogleFonts.outfit(fontSize: 12, color: AppColors.textDim)),
      ],
    );
  }

  Widget _legendRing(Color color, String label) {
    return Row(
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: color, width: 2),
          ),
        ),
        const SizedBox(width: 6),
        Text(label, style: GoogleFonts.outfit(fontSize: 12, color: AppColors.textDim)),
      ],
    );
  }
}
