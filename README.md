# Coupled

A mobile app for couples to share what matters — preferences, favorites, and the little details that make thoughtful gestures easy.

## Features

- **My Preferences** — Add and manage your own preferences (Starbucks order, shoe size, favorite restaurant, and more)
- **My Partner** — Browse everything your partner has shared, with search
- **Connect** — Link with your partner via a simple invite code
- **Profile** — Manage your display name and account

## Tech Stack

- **React Native + Expo** (iOS & Android)
- **Expo Router** (file-based navigation)
- **Supabase** (auth, PostgreSQL database, row-level security)
- **EAS** (cloud builds + App Store/Play Store submission)
- **GitHub Actions** (CI: lint, typecheck, tests)

## Getting Started

```bash
npm install
cp .env.example .env  # add your Supabase credentials
npm start
```

See [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) for the full setup guide including
Supabase, EAS, Apple Developer, and Google Play accounts.

## Project Structure

```
app/
  (auth)/        # Login + signup screens
  (tabs)/        # Main tab navigator
    index.tsx    # My Preferences screen
    partner.tsx  # Partner's preferences screen
    connect.tsx  # Partner linking screen
    profile.tsx  # Profile/settings screen
components/
  PreferenceModal.tsx   # Add/edit preference sheet
lib/
  supabase.ts           # Supabase client
  auth/
    AuthContext.tsx     # Auth state + hooks
  preferences/
    preferenceService.ts  # All DB operations
    types.ts              # TypeScript types
supabase/
  schema.sql    # Run this in Supabase SQL Editor
.github/
  workflows/
    ci.yml                # Lint + test on every push
    eas-preview.yml       # Preview builds on PRs
    eas-production.yml    # Production builds on version tags
```
