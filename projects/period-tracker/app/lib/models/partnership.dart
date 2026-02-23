import 'period.dart';
import 'prediction.dart';

class PartnerInfo {
  final String id;
  final String name;
  final String email;

  PartnerInfo({required this.id, required this.name, required this.email});

  factory PartnerInfo.fromJson(Map<String, dynamic> json) {
    return PartnerInfo(
      id: json['id'] as String,
      name: json['name'] as String,
      email: json['email'] as String,
    );
  }
}

class Partnership {
  final String id;
  final String partnerEmail;
  final String status; // 'pending' | 'accepted'
  final PartnerInfo? partner;

  Partnership({
    required this.id,
    required this.partnerEmail,
    required this.status,
    this.partner,
  });

  bool get isPending => status == 'pending';
  bool get isAccepted => status == 'accepted';

  factory Partnership.fromJson(Map<String, dynamic> json) {
    return Partnership(
      id: json['id'] as String,
      partnerEmail: json['partnerEmail'] ?? json['partner_email'] as String,
      status: json['status'] as String,
      partner: json['partner'] != null
          ? PartnerInfo.fromJson(json['partner'] as Map<String, dynamic>)
          : null,
    );
  }
}

class PartnerData {
  final PartnerInfo partner;
  final List<Period> periods;
  final Prediction? prediction;

  PartnerData({
    required this.partner,
    required this.periods,
    this.prediction,
  });

  factory PartnerData.fromJson(Map<String, dynamic> json) {
    return PartnerData(
      partner: PartnerInfo.fromJson(json['partner'] as Map<String, dynamic>),
      periods: (json['periods'] as List)
          .map((p) => Period.fromJson(p as Map<String, dynamic>))
          .toList(),
      prediction: json['prediction'] != null
          ? Prediction.fromJson(json['prediction'] as Map<String, dynamic>)
          : null,
    );
  }
}
