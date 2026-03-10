import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  getInviteCode,
  generateInviteCode,
  redeemInviteCode,
  getPartnerProfile,
  unlinkPartner,
} from '@/lib/preferences/preferenceService';
import type { Profile } from '@/lib/preferences/types';

export default function ConnectScreen() {
  const { session } = useAuth();
  const [partner, setPartner] = useState<Profile | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);

  const loadData = useCallback(async () => {
    if (!session?.user.id) return;
    setLoading(true);
    const [partnerData, code] = await Promise.all([
      getPartnerProfile(session.user.id),
      getInviteCode(session.user.id),
    ]);
    setPartner(partnerData);
    setInviteCode(code);
    setLoading(false);
  }, [session?.user.id]);

  useFocusEffect(loadData);

  async function handleGenerateCode() {
    if (!session?.user.id) return;
    const code = await generateInviteCode(session.user.id);
    setInviteCode(code);
  }

  async function handleShareCode() {
    if (!inviteCode) return;
    Share.share({
      message: `Join me on Coupled! Use this invite code: ${inviteCode}`,
    });
  }

  async function handleRedeem() {
    if (!session?.user.id || !inputCode.trim()) return;
    setRedeeming(true);
    const { error } = await redeemInviteCode(session.user.id, inputCode.trim().toUpperCase());
    setRedeeming(false);
    if (error) {
      Alert.alert('Error', error);
    } else {
      Alert.alert('Connected!', 'You are now connected with your partner.');
      setInputCode('');
      loadData();
    }
  }

  async function handleUnlink() {
    Alert.alert('Disconnect Partner', 'Are you sure you want to disconnect from your partner?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          if (!session?.user.id) return;
          await unlinkPartner(session.user.id);
          loadData();
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF6B9D" />
      </View>
    );
  }

  if (partner) {
    return (
      <View style={styles.container}>
        <View style={styles.connectedCard}>
          <Text style={styles.connectedIcon}>💑</Text>
          <Text style={styles.connectedTitle}>Connected!</Text>
          <Text style={styles.connectedName}>{partner.display_name}</Text>
          <Text style={styles.connectedSince}>You are sharing preferences with each other</Text>
        </View>
        <TouchableOpacity style={styles.unlinkButton} onPress={handleUnlink}>
          <Ionicons name="unlink-outline" size={18} color="#FF6B9D" />
          <Text style={styles.unlinkText}>Disconnect Partner</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Share Your Invite Code</Text>
        <Text style={styles.sectionDesc}>
          Generate a code and share it with your partner so they can connect with you.
        </Text>

        {inviteCode ? (
          <View style={styles.codeBox}>
            <Text style={styles.code}>{inviteCode}</Text>
            <TouchableOpacity onPress={handleShareCode} style={styles.shareBtn}>
              <Ionicons name="share-outline" size={20} color="#FF6B9D" />
              <Text style={styles.shareBtnText}>Share</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.generateBtn} onPress={handleGenerateCode}>
            <Text style={styles.generateBtnText}>Generate Invite Code</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Enter Partner's Code</Text>
        <Text style={styles.sectionDesc}>
          Have your partner's invite code? Enter it below to connect.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Enter invite code"
          value={inputCode}
          onChangeText={setInputCode}
          autoCapitalize="characters"
          maxLength={8}
        />
        <TouchableOpacity
          style={[styles.connectBtn, (!inputCode.trim() || redeeming) && styles.btnDisabled]}
          onPress={handleRedeem}
          disabled={!inputCode.trim() || redeeming}
        >
          <Text style={styles.connectBtnText}>
            {redeeming ? 'Connecting...' : 'Connect'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF0F5', padding: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 8 },
  sectionDesc: { fontSize: 14, color: '#888', marginBottom: 16 },
  codeBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFB3CC',
    borderStyle: 'dashed',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  code: { fontSize: 28, fontWeight: '800', color: '#FF6B9D', letterSpacing: 4 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  shareBtnText: { color: '#FF6B9D', fontWeight: '600' },
  generateBtn: {
    backgroundColor: '#FF6B9D',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  generateBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#FFD6E7' },
  dividerText: { color: '#ccc', marginHorizontal: 16, fontWeight: '600' },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#FFB3CC',
    marginBottom: 16,
  },
  connectBtn: {
    backgroundColor: '#FF6B9D',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  connectBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  connectedCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  connectedIcon: { fontSize: 48, marginBottom: 16 },
  connectedTitle: { fontSize: 24, fontWeight: '800', color: '#FF6B9D', marginBottom: 8 },
  connectedName: { fontSize: 20, fontWeight: '600', color: '#333', marginBottom: 8 },
  connectedSince: { fontSize: 14, color: '#888', textAlign: 'center' },
  unlinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFB3CC',
    backgroundColor: '#fff',
  },
  unlinkText: { color: '#FF6B9D', fontWeight: '600' },
});
