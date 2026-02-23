import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme.dart';
import '../providers/providers.dart';

class PartnerSettingsScreen extends ConsumerStatefulWidget {
  const PartnerSettingsScreen({super.key});

  @override
  ConsumerState<PartnerSettingsScreen> createState() => _PartnerSettingsScreenState();
}

class _PartnerSettingsScreenState extends ConsumerState<PartnerSettingsScreen> {
  final _emailController = TextEditingController();
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref.read(partnershipProvider.notifier).load();
    });
  }

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final partnershipState = ref.watch(partnershipProvider);

    return Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(
        title: Text(
          'Partner sharing',
          style: GoogleFonts.fraunces(
            fontSize: 20,
            fontWeight: FontWeight.w400,
            color: AppColors.bark,
          ),
        ),
        backgroundColor: AppColors.cream,
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: const IconThemeData(color: AppColors.bark),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(22, 20, 22, 20),
          children: [
            Text(
              'Share your cycle phase with a partner. Symptoms stay private — only your current phase is shared.',
              style: GoogleFonts.outfit(
                fontSize: 13,
                fontWeight: FontWeight.w300,
                color: AppColors.textMid,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 24),
            partnershipState.when(
              data: (partnership) {
                if (partnership == null) {
                  return _buildInviteForm();
                } else if (partnership.isPending) {
                  return _buildPendingState(partnership.partnerEmail);
                } else {
                  return _buildAcceptedState(partnership);
                }
              },
              loading: () => const Center(
                child: Padding(
                  padding: EdgeInsets.all(40),
                  child: CircularProgressIndicator(color: AppColors.terracotta),
                ),
              ),
              error: (e, _) => Text(
                'Error: $e',
                style: GoogleFonts.outfit(color: AppColors.terracotta),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInviteForm() {
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
          Text(
            'Invite a partner',
            style: GoogleFonts.fraunces(
              fontSize: 16,
              fontWeight: FontWeight.w400,
              color: AppColors.bark,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'They must already have a Synced account.',
            style: GoogleFonts.outfit(
              fontSize: 12,
              fontWeight: FontWeight.w300,
              color: AppColors.textDim,
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            autocorrect: false,
            style: GoogleFonts.outfit(fontSize: 14, color: AppColors.text),
            decoration: InputDecoration(
              hintText: 'Partner\'s email',
              hintStyle: GoogleFonts.outfit(
                fontSize: 14,
                color: AppColors.textDim,
                fontWeight: FontWeight.w300,
              ),
              filled: true,
              fillColor: AppColors.cream,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide.none,
              ),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            ),
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: TextButton(
              onPressed: _sending ? null : _invite,
              style: TextButton.styleFrom(
                backgroundColor: AppColors.terracottaBg,
                foregroundColor: AppColors.terracotta,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: _sending
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppColors.terracotta,
                      ),
                    )
                  : Text(
                      'Send invite',
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

  Widget _buildPendingState(String partnerEmail) {
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
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.sageBg,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  'Pending',
                  style: GoogleFonts.outfit(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: AppColors.sage,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            'Waiting for response',
            style: GoogleFonts.fraunces(
              fontSize: 16,
              fontWeight: FontWeight.w400,
              color: AppColors.bark,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Invite sent to $partnerEmail',
            style: GoogleFonts.outfit(
              fontSize: 13,
              fontWeight: FontWeight.w300,
              color: AppColors.textMid,
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: TextButton(
              onPressed: () async {
                await ref.read(partnershipProvider.notifier).remove();
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Invite cancelled', style: GoogleFonts.outfit()),
                      backgroundColor: AppColors.sage,
                    ),
                  );
                }
              },
              style: TextButton.styleFrom(
                backgroundColor: AppColors.cream,
                foregroundColor: AppColors.terracotta,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: Text(
                'Cancel invite',
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

  Widget _buildAcceptedState(dynamic partnership) {
    final partnerName = partnership.partner?.name ?? partnership.partnerEmail;
    final partnerEmail = partnership.partner?.email ?? partnership.partnerEmail;

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
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.terracottaBg,
                  border: Border.all(color: AppColors.terracottaLight, width: 2),
                ),
                child: Center(
                  child: Text(
                    partnerName.isNotEmpty ? partnerName[0].toUpperCase() : '?',
                    style: GoogleFonts.fraunces(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: AppColors.terracotta,
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
                      partnerName,
                      style: GoogleFonts.fraunces(
                        fontSize: 16,
                        fontWeight: FontWeight.w400,
                        color: AppColors.bark,
                      ),
                    ),
                    Text(
                      partnerEmail,
                      style: GoogleFonts.outfit(
                        fontSize: 12,
                        fontWeight: FontWeight.w300,
                        color: AppColors.textDim,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.sageBg,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  'Linked',
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
          SizedBox(
            width: double.infinity,
            child: TextButton(
              onPressed: () => _confirmRemove(partnerName),
              style: TextButton.styleFrom(
                backgroundColor: AppColors.cream,
                foregroundColor: AppColors.terracotta,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: Text(
                'Remove partner',
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

  Future<void> _invite() async {
    final email = _emailController.text.trim();
    if (email.isEmpty) return;

    setState(() => _sending = true);
    try {
      await ref.read(partnershipProvider.notifier).invite(email);
      if (mounted) _emailController.clear();
    } catch (e) {
      if (mounted) {
        final message = e.toString().contains('409')
            ? 'One of you already has a partner'
            : e.toString().contains('404')
                ? 'No account found with that email'
                : 'Could not send invite';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(message, style: GoogleFonts.outfit()),
            backgroundColor: AppColors.terracotta,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  void _confirmRemove(String name) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          'Remove partner?',
          style: GoogleFonts.fraunces(
            fontSize: 18,
            fontWeight: FontWeight.w400,
            color: AppColors.bark,
          ),
        ),
        content: Text(
          'You and $name will no longer see each other\'s cycle phase.',
          style: GoogleFonts.outfit(
            fontSize: 14,
            fontWeight: FontWeight.w300,
            color: AppColors.textMid,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(
              'Cancel',
              style: GoogleFonts.outfit(color: AppColors.textMid),
            ),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(ctx);
              await ref.read(partnershipProvider.notifier).remove();
              if (mounted) {
                ref.read(partnerDataProvider.notifier).load();
              }
            },
            child: Text(
              'Remove',
              style: GoogleFonts.outfit(color: AppColors.terracotta),
            ),
          ),
        ],
      ),
    );
  }
}
