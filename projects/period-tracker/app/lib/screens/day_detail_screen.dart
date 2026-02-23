import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../theme.dart';
import '../providers/providers.dart';
import '../models/symptom.dart';
import '../models/period.dart';

class DayDetailScreen extends ConsumerStatefulWidget {
  final DateTime date;

  const DayDetailScreen({super.key, required this.date});

  @override
  ConsumerState<DayDetailScreen> createState() => _DayDetailScreenState();
}

class _DayDetailScreenState extends ConsumerState<DayDetailScreen> {
  String? _selectedFlow;

  @override
  void initState() {
    super.initState();
    final dateStr = DateFormat('yyyy-MM-dd').format(widget.date);
    Future.microtask(() {
      ref.read(symptomsProvider.notifier).load(from: dateStr, to: dateStr);
    });
  }

  String get _dateStr => DateFormat('yyyy-MM-dd').format(widget.date);

  Period? _findPeriodForDate(List<Period> periods) {
    for (final period in periods) {
      final start = DateTime.parse(period.startDate);
      final end = period.endDate != null ? DateTime.parse(period.endDate!) : DateTime.now();
      if (!widget.date.isBefore(start) && !widget.date.isAfter(end)) {
        return period;
      }
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final periodsState = ref.watch(periodsProvider);
    final symptomsState = ref.watch(symptomsProvider);

    return Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(
        backgroundColor: AppColors.cream,
        title: Text(
          DateFormat.yMMMd().format(widget.date),
          style: GoogleFonts.fraunces(
            fontSize: 20,
            fontWeight: FontWeight.w400,
            color: AppColors.bark,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.bark),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(22),
        children: [
          // Flow section
          Text(
            'Flow',
            style: GoogleFonts.fraunces(
              fontSize: 18,
              fontWeight: FontWeight.w400,
              color: AppColors.bark,
            ),
          ),
          const SizedBox(height: 12),
          periodsState.maybeWhen(
            data: (periods) {
              final period = _findPeriodForDate(periods);
              if (period == null) {
                return Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.sand),
                  ),
                  child: Column(
                    children: [
                      Text(
                        'No period logged for this day.',
                        style: GoogleFonts.outfit(
                          fontSize: 13,
                          color: AppColors.textDim,
                          fontWeight: FontWeight.w300,
                        ),
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: TextButton(
                          onPressed: () async {
                            await ref.read(periodsProvider.notifier).create(startDate: _dateStr);
                            ref.read(predictionProvider.notifier).load();
                          },
                          style: TextButton.styleFrom(
                            backgroundColor: AppColors.terracottaBg,
                            foregroundColor: AppColors.terracotta,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                          ),
                          child: Text(
                            'Log period',
                            style: GoogleFonts.outfit(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              }

              final existingDay = period.periodDays.where((d) => d.date == _dateStr).toList();
              final currentFlow = existingDay.isNotEmpty ? existingDay.first.flow : null;

              return _buildFlowSelector(period.id, currentFlow: currentFlow);
            },
            orElse: () => const Center(
              child: CircularProgressIndicator(color: AppColors.terracotta),
            ),
          ),

          const SizedBox(height: 28),

          // Symptoms section
          Text(
            'Symptoms',
            style: GoogleFonts.fraunces(
              fontSize: 18,
              fontWeight: FontWeight.w400,
              color: AppColors.bark,
            ),
          ),
          const SizedBox(height: 12),
          symptomsState.maybeWhen(
            data: (symptoms) {
              final daySymptoms = symptoms.where((s) => s.date == _dateStr).toList();
              return Column(
                children: [
                  if (daySymptoms.isNotEmpty)
                    ...daySymptoms.map((s) => Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppColors.sand),
                          ),
                          child: ListTile(
                            leading: _getSymptomIcon(s.type),
                            title: Text(
                              s.type.displayName,
                              style: GoogleFonts.fraunces(
                                fontSize: 14,
                                fontWeight: FontWeight.w400,
                                color: AppColors.bark,
                              ),
                            ),
                            subtitle: Text(
                              ['Mild', 'Moderate', 'Severe'][s.severity - 1],
                              style: GoogleFonts.outfit(
                                fontSize: 12,
                                color: AppColors.textDim,
                              ),
                            ),
                            trailing: IconButton(
                              icon: const Icon(Icons.close, size: 18, color: AppColors.textDim),
                              onPressed: () => ref.read(symptomsProvider.notifier).delete(s.id),
                            ),
                          ),
                        )),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: TextButton(
                      onPressed: _showAddSymptomSheet,
                      style: TextButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: AppColors.terracotta,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: const BorderSide(color: AppColors.sand),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.add, size: 18),
                          const SizedBox(width: 8),
                          Text(
                            'Add symptom',
                            style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w400),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              );
            },
            orElse: () => const Center(
              child: CircularProgressIndicator(color: AppColors.terracotta),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFlowSelector(String periodId, {String? currentFlow}) {
    const flows = ['spotting', 'light', 'medium', 'heavy'];
    final flowColors = {
      'spotting': AppColors.sand,
      'light': AppColors.terracottaLight.withAlpha(150),
      'medium': AppColors.terracotta,
      'heavy': AppColors.bark,
    };

    final activeFlow = _selectedFlow ?? currentFlow;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.sand),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            currentFlow != null ? 'Flow' : 'Log flow for this day',
            style: GoogleFonts.outfit(fontSize: 13, color: AppColors.textMid),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: flows.map((flow) {
              final isSelected = activeFlow == flow;
              return GestureDetector(
                onTap: () {
                  if (isSelected) {
                    setState(() => _selectedFlow = null);
                    ref.read(periodsProvider.notifier).removeDay(periodId, date: _dateStr);
                  } else {
                    setState(() => _selectedFlow = flow);
                    ref.read(periodsProvider.notifier).logDay(periodId, date: _dateStr, flow: flow);
                  }
                },
                child: Column(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: isSelected ? flowColors[flow] : flowColors[flow]?.withAlpha(60),
                        shape: BoxShape.circle,
                        border: isSelected
                            ? Border.all(color: AppColors.bark, width: 2)
                            : null,
                      ),
                      child: Icon(
                        Icons.water_drop,
                        color: isSelected ? Colors.white : flowColors[flow],
                        size: 22,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      flow,
                      style: GoogleFonts.outfit(
                        fontSize: 11,
                        fontWeight: isSelected ? FontWeight.w500 : FontWeight.w300,
                        color: isSelected ? AppColors.bark : AppColors.textDim,
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  void _showAddSymptomSheet() {
    SymptomType? selectedType;
    int severity = 1;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.cream,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
          padding: EdgeInsets.only(
            left: 22,
            right: 22,
            top: 24,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Add symptom',
                style: GoogleFonts.fraunces(
                  fontSize: 20,
                  fontWeight: FontWeight.w400,
                  color: AppColors.bark,
                ),
              ),
              const SizedBox(height: 20),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: SymptomType.values.map((type) {
                  final isSelected = selectedType == type;
                  return GestureDetector(
                    onTap: () => setSheetState(() => selectedType = isSelected ? null : type),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: isSelected ? AppColors.terracottaBg : Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: isSelected ? AppColors.terracotta : AppColors.sand,
                        ),
                      ),
                      child: Text(
                        type.displayName,
                        style: GoogleFonts.outfit(
                          fontSize: 13,
                          fontWeight: FontWeight.w400,
                          color: isSelected ? AppColors.terracotta : AppColors.textMid,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 20),
              Text(
                'Severity',
                style: GoogleFonts.fraunces(
                  fontSize: 14,
                  fontWeight: FontWeight.w400,
                  color: AppColors.bark,
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [1, 2, 3].map((s) {
                  final labels = ['Mild', 'Moderate', 'Severe'];
                  final isSelected = severity == s;
                  return Expanded(
                    child: GestureDetector(
                      onTap: () => setSheetState(() => severity = s),
                      child: Container(
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: isSelected ? AppColors.terracottaBg : Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isSelected ? AppColors.terracotta : AppColors.sand,
                          ),
                        ),
                        child: Center(
                          child: Text(
                            labels[s - 1],
                            style: GoogleFonts.outfit(
                              fontSize: 12,
                              fontWeight: isSelected ? FontWeight.w500 : FontWeight.w300,
                              color: isSelected ? AppColors.terracotta : AppColors.textMid,
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: selectedType == null
                      ? null
                      : () {
                          ref.read(symptomsProvider.notifier).create(
                                date: _dateStr,
                                type: selectedType!,
                                severity: severity,
                              );
                          Navigator.pop(ctx);
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.terracotta,
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: AppColors.sand,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    elevation: 0,
                  ),
                  child: Text(
                    'Save',
                    style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.w500),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _getSymptomIcon(SymptomType type) {
    final icons = {
      SymptomType.cramps: Icons.flash_on,
      SymptomType.headache: Icons.psychology,
      SymptomType.bloating: Icons.circle,
      SymptomType.moodSwings: Icons.mood,
      SymptomType.fatigue: Icons.battery_1_bar,
      SymptomType.acne: Icons.face,
      SymptomType.breastTenderness: Icons.favorite,
      SymptomType.backache: Icons.accessibility,
    };
    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        color: AppColors.cream,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(icons[type] ?? Icons.circle, color: AppColors.terracotta, size: 18),
    );
  }
}
