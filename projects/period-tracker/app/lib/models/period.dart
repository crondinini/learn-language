class PeriodDay {
  final String id;
  final String periodId;
  final String date;
  final String flow; // light, medium, heavy, spotting

  PeriodDay({
    required this.id,
    required this.periodId,
    required this.date,
    required this.flow,
  });

  factory PeriodDay.fromJson(Map<String, dynamic> json) {
    return PeriodDay(
      id: json['id'] as String,
      periodId: json['periodId'] ?? json['period_id'] as String,
      date: json['date'] as String,
      flow: json['flow'] as String,
    );
  }
}

class Period {
  final String id;
  final String userId;
  final String startDate;
  final String? endDate;
  final String source;
  final List<PeriodDay> periodDays;

  Period({
    required this.id,
    required this.userId,
    required this.startDate,
    this.endDate,
    required this.source,
    this.periodDays = const [],
  });

  factory Period.fromJson(Map<String, dynamic> json) {
    return Period(
      id: json['id'] as String,
      userId: json['userId'] ?? json['user_id'] as String,
      startDate: json['startDate'] ?? json['start_date'] as String,
      endDate: json['endDate'] ?? json['end_date'] as String?,
      source: json['source'] as String,
      periodDays: (json['periodDays'] as List<dynamic>?)
              ?.map((d) => PeriodDay.fromJson(d as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  int? get durationDays {
    if (endDate == null) return null;
    final start = DateTime.parse(startDate);
    final end = DateTime.parse(endDate!);
    return end.difference(start).inDays;
  }
}
