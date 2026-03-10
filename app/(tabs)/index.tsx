import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth/AuthContext';
import { getMyPreferences, deletePreference } from '@/lib/preferences/preferenceService';
import type { Preference } from '@/lib/preferences/types';
import PreferenceModal from '@/components/PreferenceModal';

export default function MyPreferencesScreen() {
  const { session } = useAuth();
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPreference, setEditingPreference] = useState<Preference | null>(null);

  const loadPreferences = useCallback(async () => {
    if (!session?.user.id) return;
    setLoading(true);
    const data = await getMyPreferences(session.user.id);
    setPreferences(data);
    setLoading(false);
  }, [session?.user.id]);

  useFocusEffect(loadPreferences);

  function handleAdd() {
    setEditingPreference(null);
    setModalVisible(true);
  }

  function handleEdit(pref: Preference) {
    setEditingPreference(pref);
    setModalVisible(true);
  }

  async function handleDelete(pref: Preference) {
    Alert.alert('Delete Preference', `Remove "${pref.category}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deletePreference(pref.id);
          loadPreferences();
        },
      },
    ]);
  }

  function handleModalClose(saved: boolean) {
    setModalVisible(false);
    if (saved) loadPreferences();
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF6B9D" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={preferences}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No preferences yet</Text>
            <Text style={styles.emptySubtext}>
              Tap + to add things like your Starbucks order, shoe size, and more
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardContent}>
              <Text style={styles.category}>{item.category}</Text>
              <Text style={styles.value}>{item.value}</Text>
              {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity onPress={() => handleEdit(item)} style={styles.iconBtn}>
                <Ionicons name="pencil-outline" size={20} color="#FF6B9D" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item)} style={styles.iconBtn}>
                <Ionicons name="trash-outline" size={20} color="#ccc" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={handleAdd}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <PreferenceModal
        visible={modalVisible}
        preference={editingPreference}
        onClose={handleModalClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF0F5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 18, color: '#aaa', fontWeight: '600', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#bbb', textAlign: 'center', paddingHorizontal: 32 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: { flex: 1 },
  category: { fontSize: 12, color: '#FF6B9D', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 16, color: '#333', fontWeight: '500', marginTop: 4 },
  notes: { fontSize: 13, color: '#888', marginTop: 4 },
  cardActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { padding: 4 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#FF6B9D',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
});
