import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../theme.dart';
import '../providers/providers.dart';
import '../models/period.dart';

class HistoryScreen extends ConsumerStatefulWidget {
  const HistoryScreen({super.key});

  @override
  ConsumerState<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends ConsumerState<HistoryScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(periodsProvider.notifier).load());
  }

  @override
  Widget build(BuildContext context) {
    final periodsState = ref.watch(periodsProvider);

    return SafeArea(
      child: periodsState.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppColors.terracotta),
        ),
        error: (e, _) => Center(
          child: Text('Error: $e', style: GoogleFonts.outfit(color: AppColors.terracotta)),
        ),
        data: (periods) {
          // Calculate cycle lengths
          final cycleLengths = <int>[];
          for (var i = 1; i < periods.length; i++) {
            final prev = DateTime.parse(periods[i].startDate);
            final curr = DateTime.parse(periods[i - 1].startDate);
            cycleLengths.add(curr.difference(prev).inDays);
          }

          return ListView(
            padding: const EdgeInsets.fromLTRB(22, 48, 22, 20),
            children: [
              Text(
                'Cycle history',
                style: GoogleFonts.fraunces(
                  fontSize: 32,
                  fontWeight: FontWeight.w300,
                  color: AppColors.bark,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Your past rhythms',
                style: GoogleFonts.outfit(
                  fontSize: 13,
                  fontWeight: FontWeight.w300,
                  color: AppColors.textDim,
                ),
              ),
              const SizedBox(height: 24),
              if (periods.isEmpty)
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: AppColors.sand),
                  ),
                  child: Text(
                    'No periods logged yet. Start tracking from the home screen.',
                    style: GoogleFonts.outfit(
                      fontSize: 14,
                      color: AppColors.textDim,
                      fontWeight: FontWeight.w300,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              if (cycleLengths.isNotEmpty) ...[
                _buildStatsCard(periods, cycleLengths),
                const SizedBox(height: 20),
              ],
              ...periods.asMap().entries.map((entry) {
                final index = entry.key;
                final period = entry.value;
                final cycleLength = index < cycleLengths.length ? cycleLengths[index] : null;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _buildPeriodCard(period, cycleLength),
                );
              }),
            ],
          );
        },
      ),
    );
  }

  Widget _buildStatsCard(List<Period> periods, List<int> cycleLengths) {
    final avgCycle = cycleLengths.reduce((a, b) => a + b) / cycleLengths.length;
    final completedPeriods = periods.where((p) => p.endDate != null).toList();
    final avgDuration = completedPeriods.isNotEmpty
        ? completedPeriods.map((p) => p.durationDays ?? 0).reduce((a, b) => a + b) /
            completedPeriods.length
        : 0;

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.sand),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Statistics',
            style: GoogleFonts.fraunces(
              fontSize: 18,
              fontWeight: FontWeight.w400,
              color: AppColors.bark,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _buildStatItem('${avgCycle.round()}', 'Avg cycle'),
              _buildStatItem('${avgDuration.round()}', 'Avg duration'),
              _buildStatItem('${periods.length}', 'Logged'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatItem(String value, String label) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        margin: const EdgeInsets.symmetric(horizontal: 4),
        decoration: BoxDecoration(
          color: AppColors.cream,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          children: [
            Text(
              value,
              style: GoogleFonts.fraunces(
                fontSize: 22,
                fontWeight: FontWeight.w400,
                color: AppColors.bark,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: GoogleFonts.outfit(
                fontSize: 10,
                color: AppColors.textDim,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPeriodCard(Period period, int? cycleLength) {
    final start = DateTime.parse(period.startDate);
    final end = period.endDate != null ? DateTime.parse(period.endDate!) : null;
    final isOngoing = end == null;

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.sand),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isOngoing ? AppColors.terracotta : AppColors.terracottaBg,
            ),
            child: Icon(
              isOngoing ? Icons.circle : Icons.check,
              color: isOngoing ? Colors.white : AppColors.terracotta,
              size: 18,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${DateFormat.MMMd().format(start)}'
                  '${end != null ? ' – ${DateFormat.MMMd().format(end)}' : ' – ongoing'}',
                  style: GoogleFonts.fraunces(
                    fontSize: 14,
                    fontWeight: FontWeight.w400,
                    color: AppColors.bark,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  [
                    if (period.durationDays != null) '${period.durationDays} days',
                    if (cycleLength != null) 'Cycle: $cycleLength days',
                    period.source,
                  ].join(' · '),
                  style: GoogleFonts.outfit(
                    fontSize: 11,
                    color: AppColors.textDim,
                    fontWeight: FontWeight.w300,
                  ),
                ),
              ],
            ),
          ),
          PopupMenuButton(
            icon: const Icon(Icons.more_horiz, color: AppColors.textDim, size: 20),
            color: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            itemBuilder: (ctx) => [
              PopupMenuItem(
                value: 'delete',
                child: Text(
                  'Delete',
                  style: GoogleFonts.outfit(color: AppColors.terracotta, fontSize: 14),
                ),
              ),
            ],
            onSelected: (value) {
              if (value == 'delete') {
                ref.read(periodsProvider.notifier).delete(period.id);
              }
            },
          ),
        ],
      ),
    );
  }
}
