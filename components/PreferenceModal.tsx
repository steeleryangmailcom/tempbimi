import { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth/AuthContext';
import { upsertPreference } from '@/lib/preferences/preferenceService';
import { PREFERENCE_CATEGORIES, type Preference } from '@/lib/preferences/types';

interface Props {
  visible: boolean;
  preference: Preference | null;
  onClose: (saved: boolean) => void;
}

export default function PreferenceModal({ visible, preference, onClose }: Props) {
  const { session } = useAuth();
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (preference) {
      const isBuiltIn = PREFERENCE_CATEGORIES.includes(preference.category as typeof PREFERENCE_CATEGORIES[number]);
      setCategory(isBuiltIn ? preference.category : 'Custom');
      setCustomCategory(isBuiltIn ? '' : preference.category);
      setValue(preference.value);
      setNotes(preference.notes ?? '');
    } else {
      setCategory('');
      setCustomCategory('');
      setValue('');
      setNotes('');
    }
  }, [preference, visible]);

  async function handleSave() {
    const finalCategory = category === 'Custom' ? customCategory.trim() : category;
    if (!finalCategory || !value.trim()) {
      Alert.alert('Required', 'Please select a category and enter a value.');
      return;
    }
    if (!session?.user.id) return;

    setSaving(true);
    const { error } = await upsertPreference(session.user.id, {
      id: preference?.id,
      category: finalCategory,
      value: value.trim(),
      notes: notes.trim() || null,
    });
    setSaving(false);

    if (error) {
      Alert.alert('Error', 'Failed to save preference. Please try again.');
    } else {
      onClose(true);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{preference ? 'Edit Preference' : 'Add Preference'}</Text>
          <TouchableOpacity onPress={() => onClose(false)}>
            <Ionicons name="close" size={24} color="#888" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScroll}
            contentContainerStyle={styles.chips}
          >
            {PREFERENCE_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, category === cat && styles.chipSelected]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.chipText, category === cat && styles.chipTextSelected]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {category === 'Custom' && (
            <TextInput
              style={styles.input}
              placeholder="Custom category name"
              value={customCategory}
              onChangeText={setCustomCategory}
            />
          )}

          <Text style={styles.label}>Value</Text>
          <TextInput
            style={styles.input}
            placeholder={
              category === 'Starbucks Order'
                ? 'e.g. Venti Iced Brown Sugar Oat Milk Shaken Espresso'
                : category === 'Shoe Size'
                ? 'e.g. 9.5 Mens / 11 Womens'
                : 'Enter value...'
            }
            value={value}
            onChangeText={setValue}
            multiline={category === 'Starbucks Order' || category === 'Coffee Order'}
          />

          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Any extra details..."
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.btnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF0F5' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE4EF',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#333' },
  body: { flex: 1, padding: 20 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 16,
  },
  chipScroll: { marginBottom: 8 },
  chips: { gap: 8, paddingRight: 16 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FFB3CC',
  },
  chipSelected: { backgroundColor: '#FF6B9D', borderColor: '#FF6B9D' },
  chipText: { color: '#FF6B9D', fontSize: 13, fontWeight: '500' },
  chipTextSelected: { color: '#fff' },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#FFB3CC',
    marginBottom: 4,
  },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#FFE4EF' },
  saveBtn: {
    backgroundColor: '#FF6B9D',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
