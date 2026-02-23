import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/user.dart';
import '../models/period.dart';
import '../models/symptom.dart';
import '../models/prediction.dart';
import '../models/partnership.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../services/health_service.dart';

// Core services
final apiClientProvider = Provider((ref) => ApiClient());
final authServiceProvider = Provider((ref) => AuthService(ref.read(apiClientProvider)));
final healthServiceProvider = Provider((ref) => HealthService(ref.read(apiClientProvider)));

// Auth state
final userProvider =
    AsyncNotifierProvider<UserNotifier, User?>(UserNotifier.new);

class UserNotifier extends AsyncNotifier<User?> {
  @override
  FutureOr<User?> build() async {
    final authService = ref.read(authServiceProvider);
    return authService.getCurrentUser();
  }

  Future<void> signInWithGoogle() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final authService = ref.read(authServiceProvider);
      return authService.signInWithGoogle();
    });
  }

  Future<void> signOut() async {
    final authService = ref.read(authServiceProvider);
    await authService.signOut();
    state = const AsyncData(null);
  }
}

// Periods
final periodsProvider =
    AsyncNotifierProvider<PeriodsNotifier, List<Period>>(PeriodsNotifier.new);

class PeriodsNotifier extends AsyncNotifier<List<Period>> {
  @override
  FutureOr<List<Period>> build() => [];

  Future<void> load() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final api = ref.read(apiClientProvider);
      final response = await api.getPeriods();
      return (response.data as List)
          .map((p) => Period.fromJson(p as Map<String, dynamic>))
          .toList();
    });
  }

  Future<void> create({required String startDate, String? endDate}) async {
    final api = ref.read(apiClientProvider);
    await api.createPeriod(startDate: startDate, endDate: endDate);
    await load();
  }

  Future<void> updatePeriod(String id, {String? startDate, String? endDate}) async {
    final api = ref.read(apiClientProvider);
    await api.updatePeriod(id, startDate: startDate, endDate: endDate);
    await load();
  }

  Future<void> delete(String id) async {
    final api = ref.read(apiClientProvider);
    await api.deletePeriod(id);
    await load();
  }

  Future<void> logDay(String periodId, {required String date, required String flow}) async {
    final api = ref.read(apiClientProvider);
    await api.logPeriodDay(periodId, date: date, flow: flow);
    await load();
  }

  Future<void> removeDay(String periodId, {required String date}) async {
    final api = ref.read(apiClientProvider);
    await api.deletePeriodDay(periodId, date);
    await load();
  }
}

// Symptoms
final symptomsProvider =
    AsyncNotifierProvider<SymptomsNotifier, List<Symptom>>(SymptomsNotifier.new);

class SymptomsNotifier extends AsyncNotifier<List<Symptom>> {
  @override
  FutureOr<List<Symptom>> build() => [];

  Future<void> load({String? from, String? to}) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final api = ref.read(apiClientProvider);
      final response = await api.getSymptoms(from: from, to: to);
      return (response.data as List)
          .map((s) => Symptom.fromJson(s as Map<String, dynamic>))
          .toList();
    });
  }

  Future<void> create({
    required String date,
    required SymptomType type,
    required int severity,
    String? notes,
  }) async {
    final api = ref.read(apiClientProvider);
    await api.createSymptom(
      date: date,
      type: type.apiValue,
      severity: severity,
      notes: notes,
    );
    await load();
  }

  Future<void> delete(String id) async {
    final api = ref.read(apiClientProvider);
    await api.deleteSymptom(id);
    await load();
  }
}

// Partnership
final partnershipProvider =
    AsyncNotifierProvider<PartnershipNotifier, Partnership?>(PartnershipNotifier.new);

class PartnershipNotifier extends AsyncNotifier<Partnership?> {
  @override
  FutureOr<Partnership?> build() => null;

  Future<void> load() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final api = ref.read(apiClientProvider);
      final response = await api.getPartnership();
      final data = response.data;
      if (data['partnership'] != null) {
        return Partnership.fromJson(data['partnership'] as Map<String, dynamic>);
      }
      return null;
    });
  }

  Future<void> invite(String email) async {
    final api = ref.read(apiClientProvider);
    await api.invitePartner(email);
    await load();
  }

  Future<void> accept() async {
    final api = ref.read(apiClientProvider);
    await api.acceptPartner();
    await load();
  }

  Future<void> remove() async {
    final api = ref.read(apiClientProvider);
    await api.removePartner();
    state = const AsyncData(null);
  }
}

// Partner data
final partnerDataProvider =
    AsyncNotifierProvider<PartnerDataNotifier, PartnerData?>(PartnerDataNotifier.new);

class PartnerDataNotifier extends AsyncNotifier<PartnerData?> {
  @override
  FutureOr<PartnerData?> build() => null;

  Future<void> load() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      try {
        final api = ref.read(apiClientProvider);
        final response = await api.getPartnerData();
        return PartnerData.fromJson(response.data as Map<String, dynamic>);
      } on DioException catch (e) {
        if (e.response?.statusCode == 404) return null;
        rethrow;
      }
    });
  }
}

// Prediction
final predictionProvider =
    AsyncNotifierProvider<PredictionNotifier, Prediction?>(PredictionNotifier.new);

class PredictionNotifier extends AsyncNotifier<Prediction?> {
  @override
  FutureOr<Prediction?> build() => null;

  Future<void> load() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final api = ref.read(apiClientProvider);
      final response = await api.getPredictions();
      final data = response.data;
      if (data['prediction'] != null) {
        return Prediction.fromJson(data['prediction'] as Map<String, dynamic>);
      }
      return null;
    });
  }
}
