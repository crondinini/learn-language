enum SymptomType {
  cramps,
  headache,
  bloating,
  moodSwings,
  fatigue,
  acne,
  breastTenderness,
  backache;

  String get apiValue {
    switch (this) {
      case SymptomType.cramps:
        return 'cramps';
      case SymptomType.headache:
        return 'headache';
      case SymptomType.bloating:
        return 'bloating';
      case SymptomType.moodSwings:
        return 'mood_swings';
      case SymptomType.fatigue:
        return 'fatigue';
      case SymptomType.acne:
        return 'acne';
      case SymptomType.breastTenderness:
        return 'breast_tenderness';
      case SymptomType.backache:
        return 'backache';
    }
  }

  String get displayName {
    switch (this) {
      case SymptomType.cramps:
        return 'Cramps';
      case SymptomType.headache:
        return 'Headache';
      case SymptomType.bloating:
        return 'Bloating';
      case SymptomType.moodSwings:
        return 'Mood Swings';
      case SymptomType.fatigue:
        return 'Fatigue';
      case SymptomType.acne:
        return 'Acne';
      case SymptomType.breastTenderness:
        return 'Breast Tenderness';
      case SymptomType.backache:
        return 'Backache';
    }
  }

  static SymptomType fromApi(String value) {
    switch (value) {
      case 'cramps':
        return SymptomType.cramps;
      case 'headache':
        return SymptomType.headache;
      case 'bloating':
        return SymptomType.bloating;
      case 'mood_swings':
        return SymptomType.moodSwings;
      case 'fatigue':
        return SymptomType.fatigue;
      case 'acne':
        return SymptomType.acne;
      case 'breast_tenderness':
        return SymptomType.breastTenderness;
      case 'backache':
        return SymptomType.backache;
      default:
        return SymptomType.cramps;
    }
  }
}

class Symptom {
  final String id;
  final String date;
  final SymptomType type;
  final int severity; // 1-3
  final String? notes;

  Symptom({
    required this.id,
    required this.date,
    required this.type,
    required this.severity,
    this.notes,
  });

  factory Symptom.fromJson(Map<String, dynamic> json) {
    return Symptom(
      id: json['id'] as String,
      date: json['date'] as String,
      type: SymptomType.fromApi(json['type'] as String),
      severity: json['severity'] as int,
      notes: json['notes'] as String?,
    );
  }
}
