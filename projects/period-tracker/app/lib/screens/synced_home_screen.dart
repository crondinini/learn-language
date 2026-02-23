import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../theme.dart';
import '../providers/providers.dart';
import '../models/period.dart';
import '../models/prediction.dart';
import '../models/partnership.dart';
import 'day_detail_screen.dart';

class SyncedHomeScreen extends ConsumerStatefulWidget {
  const SyncedHomeScreen({super.key});

  @override
  ConsumerState<SyncedHomeScreen> createState() => _SyncedHomeScreenState();
}

class _SyncedHomeScreenState extends ConsumerState<SyncedHomeScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref.read(periodsProvider.notifier).load();
      ref.read(predictionProvider.notifier).load();
      ref.read(partnershipProvider.notifier).load();
      ref.read(partnerDataProvider.notifier).load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final userState = ref.watch(userProvider);
    final periodsState = ref.watch(periodsProvider);
    final predictionState = ref.watch(predictionProvider);
    final partnershipState = ref.watch(partnershipProvider);
    final partnerDataState = ref.watch(partnerDataProvider);

    final userName = userState.maybeWhen(
      data: (user) => user?.name.split(' ').first ?? 'there',
      orElse: () => 'there',
    );

    final periods = periodsState.maybeWhen(
      data: (p) => p,
      orElse: () => <Period>[],
    );

    final prediction = predictionState.maybeWhen(
      data: (p) => p,
      orElse: () => null,
    );

    final partnership = partnershipState.maybeWhen(
      data: (p) => p,
      orElse: () => null,
    );

    final partnerData = partnerDataState.maybeWhen(
      data: (d) => d,
      orElse: () => null,
    );

    final greeting = _getGreeting();

    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(22, 48, 22, 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            _buildHeader(userName, greeting),
            const SizedBox(height: 28),

            // Week Garden
            _buildWeekGarden(periods, prediction),
            const SizedBox(height: 24),

            // My Cycle card
            _buildCycleCard(periods, prediction),
            const SizedBox(height: 20),

            // Partner section (below cycle card)
            if (partnership != null && partnership.isAccepted && partnerData != null)
              ...[
                _buildPartnerSection(partnerData, periods, prediction),
                const SizedBox(height: 20),
              ]
            else if (partnership != null && partnership.isPending)
              ...[
                _buildPendingPartnerCard(partnership),
                const SizedBox(height: 20),
              ],

            // Quick actions / Sync bloom
            _buildSyncBloom(periods),
          ],
        ),
      ),
    );
  }

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  Widget _buildHeader(String name, String greeting) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Synced',
              style: GoogleFonts.fraunces(
                fontSize: 32,
                fontWeight: FontWeight.w300,
                color: AppColors.bark,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              '$greeting, $name',
              style: GoogleFonts.outfit(
                fontSize: 13,
                fontWeight: FontWeight.w300,
                color: AppColors.textDim,
              ),
            ),
          ],
        ),
        Container(
          width: 34,
          height: 34,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: AppColors.sageBg,
            border: Border.all(color: AppColors.sageLight, width: 2),
          ),
          child: Center(
            child: Text(
              name.isNotEmpty ? name[0].toUpperCase() : '?',
              style: GoogleFonts.fraunces(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.sage,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildWeekGarden(List<Period> periods, Prediction? prediction) {
    final now = DateTime.now();
    final monday = now.subtract(Duration(days: now.weekday - 1));
    final dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    final periodDays = _getPeriodDaySet(periods);
    final predictedDays = _getPredictedDaySet(prediction);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Your week in bloom',
          style: GoogleFonts.fraunces(
            fontSize: 14,
            fontWeight: FontWeight.w400,
            color: AppColors.textMid,
          ),
        ),
        const SizedBox(height: 14),
        Row(
          children: List.generate(7, (i) {
            final day = monday.add(Duration(days: i));
            final normalized = DateTime(day.year, day.month, day.day);
            final isToday = normalized == DateTime(now.year, now.month, now.day);
            final isPeriod = periodDays.contains(normalized);
            final isPredicted = predictedDays.contains(normalized);

            return Expanded(
              child: GestureDetector(
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => DayDetailScreen(date: day)),
                  );
                },
                child: _buildGardenDay(
                  name: dayNames[i],
                  number: day.day,
                  isToday: isToday,
                  isPeriod: isPeriod,
                  isPredicted: isPredicted,
                ),
              ),
            );
          }),
        ),
      ],
    );
  }

  Widget _buildGardenDay({
    required String name,
    required int number,
    required bool isToday,
    required bool isPeriod,
    required bool isPredicted,
  }) {
    Color circleColor = AppColors.warmWhite;
    Color numColor = AppColors.textMid;
    FontWeight numWeight = FontWeight.w400;
    Color dotColor = Colors.transparent;

    if (isPeriod) {
      circleColor = AppColors.terracotta;
      numColor = Colors.white;
      numWeight = FontWeight.w600;
      dotColor = AppColors.terracotta;
    } else if (isPredicted) {
      circleColor = AppColors.sageBg;
      numColor = AppColors.sage;
      dotColor = AppColors.sageLight;
    }

    return Column(
      children: [
        Text(
          name,
          style: GoogleFonts.outfit(
            fontSize: 11,
            fontWeight: FontWeight.w500,
            color: AppColors.textDim,
            letterSpacing: 0.3,
          ),
        ),
        const SizedBox(height: 6),
        Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: circleColor,
            boxShadow: isToday
                ? [
                    BoxShadow(
                      color: AppColors.cream,
                      spreadRadius: 3,
                    ),
                    BoxShadow(
                      color: AppColors.sand,
                      spreadRadius: 5,
                    ),
                    BoxShadow(
                      color: AppColors.cream,
                      spreadRadius: 3,
                    ),
                  ]
                : null,
            border: isToday
                ? Border.all(color: AppColors.barkLight, width: 2)
                : null,
          ),
          child: Center(
            child: Text(
              '$number',
              style: GoogleFonts.fraunces(
                fontSize: 16,
                fontWeight: numWeight,
                color: numColor,
              ),
            ),
          ),
        ),
        const SizedBox(height: 6),
        Container(
          width: 5,
          height: 5,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: dotColor,
          ),
        ),
      ],
    );
  }

  Widget _buildCycleCard(List<Period> periods, Prediction? prediction) {
    // Find current/most recent period
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);

    Period? currentPeriod;
    for (final p in periods) {
      final start = DateTime.parse(p.startDate);
      final end = p.endDate != null ? DateTime.parse(p.endDate!) : now;
      if (!today.isBefore(start) && !today.isAfter(end)) {
        currentPeriod = p;
        break;
      }
    }

    final lastPeriod = periods.isNotEmpty ? periods.first : null;

    // Empty state — no periods logged yet
    if (lastPeriod == null) {
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
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Your cycle',
                  style: GoogleFonts.fraunces(
                    fontSize: 20,
                    fontWeight: FontWeight.w400,
                    color: AppColors.bark,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                  decoration: BoxDecoration(
                    color: AppColors.sageBg,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    'No data yet',
                    style: GoogleFonts.outfit(
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                      color: AppColors.sage,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            Text(
              'Log your first period to start tracking your cycle.',
              style: GoogleFonts.outfit(
                fontSize: 13,
                fontWeight: FontWeight.w300,
                color: AppColors.textMid,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: TextButton(
                onPressed: () {
                  final todayStr = DateFormat('yyyy-MM-dd').format(DateTime.now());
                  ref.read(periodsProvider.notifier).create(startDate: todayStr);
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
                  'Log period today',
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

    // Calculate cycle day
    int cycleDay = 1;
    int cycleLength = prediction?.avgCycleLength ?? 28;
    final periodDuration = prediction?.avgPeriodDuration ?? lastPeriod.periodDays.length.clamp(1, 14);
    String phaseName = 'Period';

    final lastStart = DateTime.parse(lastPeriod.startDate);
    cycleDay = today.difference(lastStart).inDays + 1;

    if (cycleDay > cycleLength) cycleDay = cycleDay % cycleLength;

    if (currentPeriod != null && cycleDay <= periodDuration) {
      phaseName = 'Period';
    } else if (cycleDay <= 13) {
      phaseName = 'Follicular';
    } else if (cycleDay <= 16) {
      phaseName = 'Ovulation';
    } else {
      phaseName = 'Luteal';
    }

    final daysUntilNext = cycleLength - cycleDay + 1;

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
          // Top row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Your cycle',
                style: GoogleFonts.fraunces(
                  fontSize: 20,
                  fontWeight: FontWeight.w400,
                  color: AppColors.bark,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                decoration: BoxDecoration(
                  color: phaseName == 'Period'
                      ? AppColors.terracottaBg
                      : AppColors.sageBg,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  'Day $cycleDay · $phaseName',
                  style: GoogleFonts.outfit(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: phaseName == 'Period'
                        ? AppColors.terracotta
                        : AppColors.sage,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Cycle progress ring
          Center(
            child: SizedBox(
              width: 160,
              height: 160,
              child: CustomPaint(
                painter: _CycleRingPainter(
                  cycleDay: cycleDay,
                  cycleLength: cycleLength,
                  periodDuration: periodDuration,
                  phaseName: phaseName,
                ),
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        '$daysUntilNext',
                        style: GoogleFonts.fraunces(
                          fontSize: 36,
                          fontWeight: FontWeight.w300,
                          color: AppColors.bark,
                          height: 1,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'days until\nnext period',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.outfit(
                          fontSize: 11,
                          fontWeight: FontWeight.w400,
                          color: AppColors.textDim,
                          height: 1.3,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 20),

          // Stats row
          Row(
            children: [
              _buildStat('$cycleLength', 'Cycle length'),
              _buildStat('$periodDuration', 'Period days'),
            ],
          ),

          // Start new period button (only if not currently in a period)
          if (currentPeriod == null) ...[
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: TextButton(
                onPressed: () {
                  final todayStr = DateFormat('yyyy-MM-dd').format(DateTime.now());
                  ref.read(periodsProvider.notifier).create(startDate: todayStr);
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
                  'Log period today',
                  style: GoogleFonts.outfit(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildStat(String value, String label) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
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

  Widget _buildSyncBloom(List<Period> periods) {
    final hasData = periods.length >= 3;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.sand),
      ),
      child: Column(
        children: [
          // Bloom circles
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 24,
                height: 24,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [AppColors.terracottaLight, AppColors.terracotta],
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                width: 24,
                height: 24,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [AppColors.sageLight, AppColors.sage],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            hasData
                ? 'Your rhythm is growing'
                : 'Plant the first seed',
            style: GoogleFonts.fraunces(
              fontSize: 18,
              fontWeight: FontWeight.w300,
              color: AppColors.bark,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            hasData
                ? 'Keep logging to improve predictions and understand your unique cycle.'
                : 'Log at least 3 periods to unlock cycle predictions and insights.',
            style: GoogleFonts.outfit(
              fontSize: 12,
              color: AppColors.textDim,
              fontWeight: FontWeight.w300,
              height: 1.5,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  String _getPartnerPhase(PartnerData data) {
    if (data.periods.isEmpty) return 'No data';

    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final lastPeriod = data.periods.first;
    final start = DateTime.parse(lastPeriod.startDate);
    final end = lastPeriod.endDate != null ? DateTime.parse(lastPeriod.endDate!) : now;

    // Currently on period?
    if (!today.isBefore(start) && !today.isAfter(end)) {
      return 'Period';
    }

    final cycleLength = data.prediction?.avgCycleLength ?? 28;
    int cycleDay = today.difference(start).inDays + 1;
    if (cycleDay > cycleLength) cycleDay = cycleDay % cycleLength;

    if (cycleDay <= 13) return 'Follicular';
    if (cycleDay <= 16) return 'Ovulation';
    return 'Luteal';
  }

  Map<String, dynamic> _getPhaseDetails(String phase) {
    switch (phase) {
      case 'Period':
        return {
          'forecast': 'may feel lower energy, cramps, and need extra rest. Comfort and warmth go a long way right now.',
          'tips': [
            {'icon': '🛁', 'title': 'Create calm spaces', 'desc': 'Warmth and softness help. Run a bath, light a candle, lower the lights.'},
            {'icon': '🍫', 'title': 'Keep snacks close', 'desc': 'Cravings peak now. Chocolate, carbs, and warm meals will be appreciated.'},
            {'icon': '🤍', 'title': 'Be gentle', 'desc': 'Energy is low. Offer help without being asked, and keep plans light.'},
          ],
        };
      case 'Follicular':
        return {
          'forecast': 'is in her follicular phase — energy is rising, mood is lifting. Great time for new plans and adventures together.',
          'tips': [
            {'icon': '🌱', 'title': 'Plan something fun', 'desc': 'Energy and optimism are building. Try a new restaurant or activity together.'},
            {'icon': '💬', 'title': 'Have those big talks', 'desc': 'Communication flows easier now. Good time for planning and decisions.'},
            {'icon': '🏃‍♀️', 'title': 'Be active together', 'desc': 'She\'ll have more stamina. Suggest a walk, workout, or outdoor time.'},
          ],
        };
      case 'Ovulation':
        return {
          'forecast': 'is near ovulation — confidence and social energy are at their peak. She\'ll feel most outgoing and connected.',
          'tips': [
            {'icon': '✨', 'title': 'Enjoy the glow', 'desc': 'Energy and mood are highest. Make the most of this window together.'},
            {'icon': '🎉', 'title': 'Social plans welcome', 'desc': 'She\'ll enjoy seeing friends, going out, and being spontaneous.'},
            {'icon': '💕', 'title': 'Connection time', 'desc': 'Emotional and physical closeness feel most natural right now.'},
          ],
        };
      default: // Luteal
        return {
          'forecast': 'is in her luteal phase — expect heightened emotions and a deeper need for comfort. Not the best time for big conversations.',
          'tips': [
            {'icon': '🛁', 'title': 'Create calm spaces', 'desc': 'She\'ll gravitate toward warmth and softness. Lower the lights, keep it cozy.'},
            {'icon': '🍫', 'title': 'Keep snacks close', 'desc': 'Cravings are picking up. Chocolate and warm meals will be appreciated.'},
            {'icon': '🤍', 'title': 'Affirm and reassure', 'desc': 'She may doubt herself more. A simple "you\'re doing great" goes far.'},
            {'icon': '📵', 'title': 'Less stimulation', 'desc': 'Reduce social plans if you can. She\'ll recharge best in low-key environments.'},
          ],
        };
    }
  }

  int _getPartnerCycleDay(PartnerData data) {
    if (data.periods.isEmpty) return 0;
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final lastPeriod = data.periods.first;
    final start = DateTime.parse(lastPeriod.startDate);
    final cycleLength = data.prediction?.avgCycleLength ?? 28;
    int cycleDay = today.difference(start).inDays + 1;
    if (cycleDay > cycleLength) cycleDay = cycleDay % cycleLength;
    return cycleDay;
  }

  Widget _buildPartnerSection(PartnerData data, List<Period> myPeriods, Prediction? myPrediction) {
    final phase = _getPartnerPhase(data);
    final cycleDay = _getPartnerCycleDay(data);
    final details = _getPhaseDetails(phase);
    final name = data.partner.name.split(' ').first;
    final tips = details['tips'] as List<Map<String, String>>;

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
          // Partner header
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [AppColors.sageBg, AppColors.sageLight],
                  ),
                ),
                child: Center(
                  child: Text(
                    name.isNotEmpty ? name[0].toUpperCase() : '?',
                    style: GoogleFonts.fraunces(
                      fontSize: 20,
                      fontWeight: FontWeight.w400,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '$name\'s cycle',
                      style: GoogleFonts.fraunces(
                        fontSize: 20,
                        fontWeight: FontWeight.w400,
                        color: AppColors.bark,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      cycleDay > 0 ? 'Day $cycleDay · $phase' : phase,
                      style: GoogleFonts.outfit(
                        fontSize: 12,
                        color: AppColors.sage,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Mood forecast
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.sageBg,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColors.sage.withValues(alpha: 0.12)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 16,
                      height: 16,
                      decoration: BoxDecoration(
                        color: AppColors.sageLight,
                        borderRadius: BorderRadius.only(
                          topLeft: Radius.circular(8),
                          topRight: Radius.zero,
                          bottomLeft: Radius.circular(8),
                          bottomRight: Radius.zero,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Mood forecast',
                      style: GoogleFonts.fraunces(
                        fontSize: 15,
                        fontWeight: FontWeight.w400,
                        color: AppColors.sage,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  '$name ${details['forecast']}',
                  style: GoogleFonts.outfit(
                    fontSize: 13,
                    fontWeight: FontWeight.w300,
                    color: AppColors.textMid,
                    height: 1.7,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Recommendations
          ...tips.map((tip) => _buildGardenNote(
            icon: tip['icon']!,
            title: tip['title']!,
            desc: tip['desc']!,
            isLast: tip == tips.last,
          )),
        ],
      ),
    );
  }

  Widget _buildGardenNote({
    required String icon,
    required String title,
    required String desc,
    required bool isLast,
  }) {
    return Container(
      padding: EdgeInsets.only(top: 14, bottom: isLast ? 0 : 14),
      decoration: BoxDecoration(
        border: isLast
            ? null
            : Border(bottom: BorderSide(color: AppColors.warmWhite)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: AppColors.cream,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Center(
              child: Text(icon, style: const TextStyle(fontSize: 16)),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: GoogleFonts.fraunces(
                    fontSize: 14,
                    fontWeight: FontWeight.w400,
                    color: AppColors.bark,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  desc,
                  style: GoogleFonts.outfit(
                    fontSize: 12,
                    fontWeight: FontWeight.w300,
                    color: AppColors.textDim,
                    height: 1.5,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPendingPartnerCard(Partnership partnership) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.sand),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.favorite_outline, size: 18, color: AppColors.terracottaLight),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Partner invite from ${partnership.partnerEmail}',
                  style: GoogleFonts.outfit(
                    fontSize: 13,
                    fontWeight: FontWeight.w400,
                    color: AppColors.bark,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: TextButton(
                  onPressed: () {
                    ref.read(partnershipProvider.notifier).accept().then((_) {
                      ref.read(partnerDataProvider.notifier).load();
                    });
                  },
                  style: TextButton.styleFrom(
                    backgroundColor: AppColors.terracottaBg,
                    foregroundColor: AppColors.terracotta,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  child: Text(
                    'Accept',
                    style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.w500),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: TextButton(
                  onPressed: () {
                    ref.read(partnershipProvider.notifier).remove();
                  },
                  style: TextButton.styleFrom(
                    backgroundColor: AppColors.cream,
                    foregroundColor: AppColors.textMid,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  child: Text(
                    'Decline',
                    style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.w500),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Set<DateTime> _getPeriodDaySet(List<Period> periods) {
    final days = <DateTime>{};
    for (final period in periods) {
      for (final pd in period.periodDays) {
        final d = DateTime.parse(pd.date);
        days.add(DateTime(d.year, d.month, d.day));
      }
    }
    return days;
  }

  Set<DateTime> _getPredictedDaySet(Prediction? prediction) {
    if (prediction == null) return {};
    final days = <DateTime>{};
    final start = prediction.predictedStartDate;
    final end = prediction.predictedEndDate;
    for (var d = start; !d.isAfter(end); d = d.add(const Duration(days: 1))) {
      days.add(DateTime(d.year, d.month, d.day));
    }
    return days;
  }
}

class _CycleRingPainter extends CustomPainter {
  final int cycleDay;
  final int cycleLength;
  final int periodDuration;
  final String phaseName;

  _CycleRingPainter({
    required this.cycleDay,
    required this.cycleLength,
    required this.periodDuration,
    required this.phaseName,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 8;
    const strokeWidth = 10.0;
    const startAngle = -math.pi / 2; // Start from top
    const fullSweep = 2 * math.pi;

    // Background track
    final bgPaint = Paint()
      ..color = AppColors.warmWhite
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    canvas.drawCircle(center, radius, bgPaint);

    final rect = Rect.fromCircle(center: center, radius: radius);

    // Period portion (terracotta)
    final periodSweep = (periodDuration / cycleLength) * fullSweep;
    final periodPaint = Paint()
      ..color = AppColors.terracotta
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(rect, startAngle, periodSweep, false, periodPaint);

    // Elapsed portion (sand, from period end to current day)
    final elapsedSweep = (cycleDay / cycleLength) * fullSweep;
    if (cycleDay > periodDuration) {
      final sandSweep = elapsedSweep - periodSweep;
      final sandPaint = Paint()
        ..color = AppColors.sand
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeWidth
        ..strokeCap = StrokeCap.round;

      canvas.drawArc(rect, startAngle + periodSweep, sandSweep, false, sandPaint);
    }

    // Current day marker dot
    final markerAngle = startAngle + elapsedSweep;
    final markerX = center.dx + radius * math.cos(markerAngle);
    final markerY = center.dy + radius * math.sin(markerAngle);
    final markerPaint = Paint()
      ..color = phaseName == 'Period' ? AppColors.terracotta : AppColors.bark
      ..style = PaintingStyle.fill;

    canvas.drawCircle(Offset(markerX, markerY), 6, markerPaint);

    // White inner ring on marker
    final markerInnerPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.fill;

    canvas.drawCircle(Offset(markerX, markerY), 3, markerInnerPaint);
  }

  @override
  bool shouldRepaint(_CycleRingPainter oldDelegate) =>
      cycleDay != oldDelegate.cycleDay ||
      cycleLength != oldDelegate.cycleLength ||
      periodDuration != oldDelegate.periodDuration;
}
