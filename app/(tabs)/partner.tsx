import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/lib/auth/AuthContext';
import { getPartnerPreferences, getPartnerProfile } from '@/lib/preferences/preferenceService';
import type { Preference, Profile } from '@/lib/preferences/types';

export default function PartnerScreen() {
  const { session } = useAuth();
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [partner, setPartner] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadPartnerData = useCallback(async () => {
    if (!session?.user.id) return;
    setLoading(true);
    const [profileData, prefData] = await Promise.all([
      getPartnerProfile(session.user.id),
      getPartnerPreferences(session.user.id),
    ]);
    setPartner(profileData);
    setPreferences(prefData);
    setLoading(false);
  }, [session?.user.id]);

  useFocusEffect(loadPartnerData);

  const filtered = preferences.filter(
    (p) =>
      p.category.toLowerCase().includes(search.toLowerCase()) ||
      p.value.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF6B9D" />
      </View>
    );
  }

  if (!partner) {
    return (
      <View style={styles.centered}>
        <Text style={styles.noPartnerIcon}>💔</Text>
        <Text style={styles.noPartnerText}>No partner connected yet</Text>
        <Text style={styles.noPartnerSubtext}>
          Go to the Connect tab to link with your partner
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.partnerName}>{partner.display_name}</Text>
        <Text style={styles.partnerSubtext}>Their preferences</Text>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search preferences..."
        value={search}
        onChangeText={setSearch}
        clearButtonMode="while-editing"
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {search ? 'No matching preferences' : 'Your partner has not added any preferences yet'}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.category}>{item.category}</Text>
            <Text style={styles.value}>{item.value}</Text>
            {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF0F5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  header: {
    backgroundColor: '#FF6B9D',
    padding: 24,
    paddingTop: 16,
    alignItems: 'center',
  },
  partnerName: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  partnerSubtext: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  search: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#FFB3CC',
  },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  emptyText: { textAlign: 'center', color: '#aaa', fontSize: 15, marginTop: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  category: { fontSize: 12, color: '#FF6B9D', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 16, color: '#333', fontWeight: '500', marginTop: 4 },
  notes: { fontSize: 13, color: '#888', marginTop: 4 },
  noPartnerIcon: { fontSize: 48, marginBottom: 16 },
  noPartnerText: { fontSize: 18, color: '#aaa', fontWeight: '600', marginBottom: 8 },
  noPartnerSubtext: { fontSize: 14, color: '#bbb', textAlign: 'center' },
});
