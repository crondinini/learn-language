import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:period_tracker/main.dart';

void main() {
  testWidgets('App renders login screen', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(child: SyncedApp()),
    );
    await tester.pumpAndSettle();

    expect(find.text('Synced'), findsOneWidget);
  });
}
