export interface Profile {
  id: string;
  display_name: string;
  partner_id: string | null;
  invite_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface Preference {
  id: string;
  user_id: string;
  category: string;
  value: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Built-in suggestion categories to help users get started
export const PREFERENCE_CATEGORIES = [
  'Starbucks Order',
  'Coffee Order',
  'Shoe Size',
  'Clothing Size',
  'Ring Size',
  'Favorite Restaurant',
  'Favorite Cuisine',
  'Favorite Snack',
  'Favorite Candy',
  'Favorite Ice Cream',
  'Favorite Movie Genre',
  'Favorite TV Show',
  'Favorite Music Genre',
  'Favorite Artist',
  'Favorite Color',
  'Favorite Flower',
  'Favorite Season',
  'Favorite Holiday',
  'Allergies',
  'Dietary Restrictions',
  'Love Language',
  'Pillow Preference',
  'Blanket Preference',
  'Morning / Night Person',
  'Custom',
] as const;
