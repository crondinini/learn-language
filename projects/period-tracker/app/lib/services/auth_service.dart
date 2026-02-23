import 'dart:async';
import 'dart:developer' as dev;
import 'package:google_sign_in/google_sign_in.dart';
import 'api_client.dart';
import '../models/user.dart';

class AuthService {
  final ApiClient _api;
  bool _initialized = false;

  AuthService(this._api);

  Future<void> _ensureInitialized() async {
    if (_initialized) return;
    try {
      await GoogleSignIn.instance.initialize(
        clientId: '652885649152-pkg3ukelca30vhnjn2h4nn1kduuspne0.apps.googleusercontent.com',
        serverClientId: '652885649152-bv2jj2fs3p1lfnrdt8pm52ve6v3ht5te.apps.googleusercontent.com',
      );
      _initialized = true;
      dev.log('[AUTH] Google Sign-In initialized');
    } catch (e) {
      dev.log('[AUTH] Initialize error: $e');
      rethrow;
    }
  }

  Future<User?> signInWithGoogle() async {
    await _ensureInitialized();

    try {
      dev.log('[AUTH] Starting authenticate()...');
      final account = await GoogleSignIn.instance.authenticate();
      dev.log('[AUTH] Got account: ${account.email}');

      final auth = account.authentication;
      dev.log('[AUTH] idToken present: ${auth.idToken != null}');

      final idToken = auth.idToken;
      if (idToken == null) {
        dev.log('[AUTH] ERROR: idToken is null');
        throw Exception('Failed to get Google ID token');
      }

      dev.log('[AUTH] Calling backend /auth/google...');
      final response = await _api.googleSignIn(idToken);
      dev.log('[AUTH] Backend response status: ${response.statusCode}');
      final data = response.data;

      await ApiClient.saveToken(data['token'] as String);
      dev.log('[AUTH] Token saved, user created');

      return User.fromJson(data['user'] as Map<String, dynamic>);
    } catch (e, st) {
      dev.log('[AUTH] signInWithGoogle error: $e');
      dev.log('[AUTH] stack: $st');
      rethrow;
    }
  }

  Future<User?> getCurrentUser() async {
    final token = await ApiClient.getToken();
    if (token == null) return null;

    try {
      final response = await _api.getMe();
      return User.fromJson(response.data as Map<String, dynamic>);
    } catch (_) {
      await ApiClient.clearToken();
      return null;
    }
  }

  Future<void> signOut() async {
    await _ensureInitialized();
    await GoogleSignIn.instance.signOut();
    await ApiClient.clearToken();
  }
}
