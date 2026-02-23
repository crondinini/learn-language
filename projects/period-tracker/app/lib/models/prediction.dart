class Prediction {
  final String predictedStart;
  final String predictedEnd;
  final int avgCycleLength;
  final int avgPeriodDuration;
  final double confidence;

  Prediction({
    required this.predictedStart,
    required this.predictedEnd,
    required this.avgCycleLength,
    required this.avgPeriodDuration,
    required this.confidence,
  });

  factory Prediction.fromJson(Map<String, dynamic> json) {
    return Prediction(
      predictedStart: json['predictedStart'] ?? json['predicted_start'] as String,
      predictedEnd: json['predictedEnd'] ?? json['predicted_end'] as String,
      avgCycleLength: json['avgCycleLength'] ?? json['avg_cycle_length'] as int,
      avgPeriodDuration: json['avgPeriodDuration'] ?? json['avg_period_duration'] ?? 5,
      confidence: (json['confidence'] as num).toDouble(),
    );
  }

  DateTime get predictedStartDate => DateTime.parse(predictedStart);
  DateTime get predictedEndDate => DateTime.parse(predictedEnd);
}
