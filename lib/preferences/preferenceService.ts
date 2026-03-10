import { supabase } from '@/lib/supabase';
import type { Preference, Profile } from './types';

// ─── Profiles ───────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return data;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'display_name'>>
) {
  const { error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId);
  return { error };
}

// ─── Partner linking ─────────────────────────────────────────────────────────

export async function getPartnerProfile(userId: string): Promise<Profile | null> {
  const profile = await getProfile(userId);
  if (!profile?.partner_id) return null;
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profile.partner_id)
    .single();
  return data;
}

export async function getInviteCode(userId: string): Promise<string | null> {
  const profile = await getProfile(userId);
  return profile?.invite_code ?? null;
}

export async function generateInviteCode(userId: string): Promise<string> {
  // Generate a random 6-character alphanumeric code
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  await supabase
    .from('profiles')
    .update({ invite_code: code, updated_at: new Date().toISOString() })
    .eq('id', userId);
  return code;
}

export async function redeemInviteCode(
  userId: string,
  code: string
): Promise<{ error: string | null }> {
  // Find the profile that owns this invite code
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('invite_code', code)
    .single();

  if (!targetProfile) {
    return { error: 'Invalid invite code. Please check and try again.' };
  }
  if (targetProfile.id === userId) {
    return { error: 'You cannot connect with yourself.' };
  }
  if (targetProfile.partner_id) {
    return { error: 'This person is already connected with a partner.' };
  }

  // Link both users to each other
  const now = new Date().toISOString();
  const [r1, r2] = await Promise.all([
    supabase
      .from('profiles')
      .update({ partner_id: targetProfile.id, invite_code: null, updated_at: now })
      .eq('id', userId),
    supabase
      .from('profiles')
      .update({ partner_id: userId, invite_code: null, updated_at: now })
      .eq('id', targetProfile.id),
  ]);

  if (r1.error || r2.error) {
    return { error: 'Something went wrong. Please try again.' };
  }
  return { error: null };
}

export async function unlinkPartner(userId: string): Promise<void> {
  const profile = await getProfile(userId);
  if (!profile?.partner_id) return;

  const now = new Date().toISOString();
  await Promise.all([
    supabase
      .from('profiles')
      .update({ partner_id: null, updated_at: now })
      .eq('id', userId),
    supabase
      .from('profiles')
      .update({ partner_id: null, updated_at: now })
      .eq('id', profile.partner_id),
  ]);
}

// ─── Preferences ─────────────────────────────────────────────────────────────

export async function getMyPreferences(userId: string): Promise<Preference[]> {
  const { data } = await supabase
    .from('preferences')
    .select('*')
    .eq('user_id', userId)
    .order('category');
  return data ?? [];
}

export async function getPartnerPreferences(userId: string): Promise<Preference[]> {
  const partner = await getPartnerProfile(userId);
  if (!partner) return [];
  const { data } = await supabase
    .from('preferences')
    .select('*')
    .eq('user_id', partner.id)
    .order('category');
  return data ?? [];
}

export async function upsertPreference(
  userId: string,
  preference: Omit<Preference, 'id' | 'user_id' | 'created_at' | 'updated_at'> & { id?: string }
): Promise<{ error: Error | null }> {
  const now = new Date().toISOString();
  const row = {
    ...(preference.id ? { id: preference.id } : {}),
    user_id: userId,
    category: preference.category,
    value: preference.value,
    notes: preference.notes ?? null,
    updated_at: now,
    ...(!preference.id ? { created_at: now } : {}),
  };
  const { error } = await supabase.from('preferences').upsert(row);
  return { error };
}

export async function deletePreference(id: string): Promise<void> {
  await supabase.from('preferences').delete().eq('id', id);
}
