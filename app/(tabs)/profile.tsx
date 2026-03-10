import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/lib/auth/AuthContext';
import { getProfile, updateProfile } from '@/lib/preferences/preferenceService';

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        if (!session?.user.id) return;
        const profile = await getProfile(session.user.id);
        if (profile) setDisplayName(profile.display_name);
      }
      load();
    }, [session?.user.id])
  );

  async function handleSave() {
    if (!session?.user.id || !displayName.trim()) return;
    setSaving(true);
    const { error } = await updateProfile(session.user.id, { display_name: displayName.trim() });
    setSaving(false);
    if (error) {
      Alert.alert('Error', 'Failed to update profile');
    } else {
      Alert.alert('Saved', 'Profile updated successfully');
    }
  }

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {displayName ? displayName[0].toUpperCase() : '?'}
          </Text>
        </View>
        <Text style={styles.email}>{session?.user.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Display Name</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your name"
        />
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.btnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF0F5' },
  content: { padding: 24 },
  avatarContainer: { alignItems: 'center', marginBottom: 32 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF6B9D',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#fff' },
  email: { fontSize: 14, color: '#888' },
  section: { marginBottom: 32 },
  label: { fontSize: 13, fontWeight: '600', color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#FFB3CC',
    marginBottom: 12,
  },
  saveBtn: {
    backgroundColor: '#FF6B9D',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  signOutBtn: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFB3CC',
    backgroundColor: '#fff',
  },
  signOutText: { color: '#FF6B9D', fontWeight: '600', fontSize: 15 },
});
