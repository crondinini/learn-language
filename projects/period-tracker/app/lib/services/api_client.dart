import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiClient {
  static const String _baseUrl = 'http://localhost:3068'; // TODO: change for production
  static const _storage = FlutterSecureStorage();
  static const _tokenKey = 'auth_token';

  late final Dio _dio;

  ApiClient() {
    _dio = Dio(BaseOptions(
      baseUrl: _baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {'Content-Type': 'application/json'},
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: _tokenKey);
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
    ));
  }

  static Future<void> saveToken(String token) async {
    await _storage.write(key: _tokenKey, value: token);
  }

  static Future<void> clearToken() async {
    await _storage.delete(key: _tokenKey);
  }

  static Future<String?> getToken() async {
    return _storage.read(key: _tokenKey);
  }

  // Auth
  Future<Response> googleSignIn(String idToken) {
    return _dio.post('/auth/google', data: {'idToken': idToken});
  }

  Future<Response> getMe() {
    return _dio.get('/auth/me');
  }

  // Periods
  Future<Response> getPeriods() {
    return _dio.get('/periods');
  }

  Future<Response> createPeriod({
    required String startDate,
    String? endDate,
    String source = 'manual',
  }) {
    return _dio.post('/periods', data: {
      'startDate': startDate,
      'endDate': endDate,
      'source': source,
    });
  }

  Future<Response> updatePeriod(String id, {String? startDate, String? endDate}) {
    final data = <String, dynamic>{};
    if (startDate != null) data['startDate'] = startDate;
    if (endDate != null) data['endDate'] = endDate;
    return _dio.put('/periods/$id', data: data);
  }

  Future<Response> deletePeriod(String id) {
    return _dio.delete('/periods/$id');
  }

  Future<Response> logPeriodDay(String periodId, {required String date, required String flow}) {
    return _dio.post('/periods/$periodId/days', data: {
      'date': date,
      'flow': flow,
    });
  }

  Future<Response> deletePeriodDay(String periodId, String date) {
    return _dio.delete('/periods/$periodId/days/$date');
  }

  // Symptoms
  Future<Response> getSymptoms({String? from, String? to}) {
    final params = <String, String>{};
    if (from != null) params['from'] = from;
    if (to != null) params['to'] = to;
    return _dio.get('/symptoms', queryParameters: params);
  }

  Future<Response> createSymptom({
    required String date,
    required String type,
    required int severity,
    String? notes,
  }) {
    return _dio.post('/symptoms', data: {
      'date': date,
      'type': type,
      'severity': severity,
      'notes': notes,
    });
  }

  Future<Response> deleteSymptom(String id) {
    return _dio.delete('/symptoms/$id');
  }

  // Predictions
  Future<Response> getPredictions() {
    return _dio.get('/predictions');
  }

  // HealthKit sync
  Future<Response> syncHealthKit(List<Map<String, dynamic>> entries) {
    return _dio.post('/sync/healthkit', data: {'entries': entries});
  }

  // Partners
  Future<Response> getPartnership() {
    return _dio.get('/partners');
  }

  Future<Response> invitePartner(String email) {
    return _dio.post('/partners/invite', data: {'email': email});
  }

  Future<Response> acceptPartner() {
    return _dio.post('/partners/accept');
  }

  Future<Response> removePartner() {
    return _dio.delete('/partners/remove');
  }

  Future<Response> getPartnerData() {
    return _dio.get('/partners/data');
  }
}
