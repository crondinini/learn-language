import 'dart:io';
import 'package:health/health.dart';
import 'api_client.dart';

class HealthService {
  final ApiClient _api;
  bool _configured = false;

  HealthService(this._api);

  bool get isAvailable => Platform.isIOS;

  Future<void> _ensureConfigured() async {
    if (!_configured) {
      await Health().configure();
      _configured = true;
    }
  }

  Future<bool> requestPermissions() async {
    if (!isAvailable) return false;

    await _ensureConfigured();

    final types = [HealthDataType.MENSTRUATION_FLOW];
    final permissions = [HealthDataAccess.READ_WRITE];

    return Health().requestAuthorization(types, permissions: permissions);
  }

  Future<List<HealthDataPoint>> readMenstrualData({
    required DateTime startDate,
    required DateTime endDate,
  }) async {
    if (!isAvailable) return [];

    await _ensureConfigured();

    final types = [HealthDataType.MENSTRUATION_FLOW];
    final data = await Health().getHealthDataFromTypes(
      startTime: startDate,
      endTime: endDate,
      types: types,
    );

    return Health().removeDuplicates(data);
  }

  Future<void> syncToBackend({
    required DateTime startDate,
    required DateTime endDate,
  }) async {
    final data = await readMenstrualData(
      startDate: startDate,
      endDate: endDate,
    );

    if (data.isEmpty) return;

    final entries = data.map((point) {
      String flow = 'medium';
      if (point.value is MenstruationFlowHealthValue) {
        final menstrualFlow =
            (point.value as MenstruationFlowHealthValue).flow;
        switch (menstrualFlow) {
          case MenstrualFlow.light:
            flow = 'light';
          case MenstrualFlow.heavy:
            flow = 'heavy';
          case MenstrualFlow.medium:
            flow = 'medium';
          case MenstrualFlow.spotting:
            flow = 'spotting';
          default:
            flow = 'medium';
        }
      }

      return {
        'startDate': point.dateFrom.toIso8601String().split('T')[0],
        'endDate': point.dateTo.toIso8601String().split('T')[0],
        'flow': flow,
      };
    }).toList();

    await _api.syncHealthKit(entries);
  }

  Future<void> writeMenstrualData({
    required DateTime date,
    required String flow,
    bool isStartOfCycle = false,
  }) async {
    if (!isAvailable) return;

    await _ensureConfigured();

    MenstrualFlow healthFlow;
    switch (flow) {
      case 'light':
        healthFlow = MenstrualFlow.light;
      case 'heavy':
        healthFlow = MenstrualFlow.heavy;
      case 'spotting':
        healthFlow = MenstrualFlow.spotting;
      default:
        healthFlow = MenstrualFlow.medium;
    }

    await Health().writeMenstruationFlow(
      flow: healthFlow,
      startTime: date,
      endTime: date.add(const Duration(days: 1)),
      isStartOfCycle: isStartOfCycle,
    );
  }
}
