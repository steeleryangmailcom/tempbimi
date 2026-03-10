# Coupled App — Infrastructure Guide

Everything you need to set up to ship a real iOS + Android app.

---

## Stack Overview

| Layer | Technology | Why |
|---|---|---|
| Mobile App | React Native + Expo | Single codebase for iOS & Android |
| Routing | Expo Router (file-based) | Familiar Next.js-style routing |
| Backend/Auth/DB | Supabase | Postgres + Auth + Realtime, generous free tier |
| Builds | EAS (Expo Application Services) | Managed cloud builds; no Mac required for iOS |
| CI/CD | GitHub Actions | Lint, test, and trigger EAS builds automatically |
| App Distribution | Apple App Store + Google Play | Required for real users |

---

## 1. Supabase Setup (Backend & Database)

**Cost: Free up to 500MB DB / 50k MAU**

1. Go to [supabase.com](https://supabase.com) → Create a new project
2. In the SQL Editor, run the contents of `supabase/schema.sql`
3. Copy your project URL and anon key from **Settings → API**
4. Create a `.env` file (copy from `.env.example`) and paste those values

```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

**Row-Level Security** is already configured in the schema — users can only
read their own data or their linked partner's data.

---

## 2. EAS (Expo Application Services) Setup

**Cost: Free for personal projects; ~$99/mo for teams with faster build queues**

EAS handles building your app in the cloud (no Xcode required on Linux/Windows)
and submitting to app stores.

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to your Expo account (create one free at expo.dev)
eas login

# Link this project
eas init

# Update the projectId in app.json extra.eas.projectId
```

Update `eas.json` with your Apple and Google credentials when ready to submit.

---

## 3. Apple Developer Account (iOS)

**Cost: $99/year**

Required to:
- Distribute on the App Store
- Test on real iOS devices (via TestFlight)

Setup:
1. Enroll at [developer.apple.com](https://developer.apple.com)
2. Create an App ID with bundle identifier `com.coupled.app`
3. Create an App Store Connect listing
4. Generate an App Store Connect API Key for automated submissions
5. Add the API key as `EXPO_APPLE_API_KEY` in your EAS project secrets

---

## 4. Google Play Developer Account (Android)

**Cost: $25 one-time**

Setup:
1. Register at [play.google.com/console](https://play.google.com/console)
2. Create a new app with package name `com.coupled.app`
3. Create a Service Account in Google Cloud Console with "Release Manager" role
4. Download the JSON key and add it as an EAS secret
5. Add it to `eas.json` under `submit.production.android.serviceAccountKeyPath`

---

## 5. GitHub Secrets to Configure

In your repo: **Settings → Secrets and variables → Actions**

| Secret | Where to get it |
|---|---|
| `EXPO_TOKEN` | expo.dev → Account Settings → Access Tokens |
| `CODECOV_TOKEN` | codecov.io (optional, for coverage reports) |

EAS-specific secrets (Apple/Google keys) are configured in the EAS dashboard
at [expo.dev](https://expo.dev), not in GitHub.

---

## 6. Push Notifications (Future)

When you're ready to add push notifications (e.g. "Your partner updated their preferences"):

- **Expo Notifications** handles cross-platform tokens
- **Supabase Edge Functions** or a lightweight Node.js server can trigger sends
- No additional cost at small scale (Expo push service is free)

---

## 7. Local Development

```bash
# Install dependencies
npm install

# Start the dev server
npm start

# Then press:
#   i  — open iOS Simulator (requires Xcode on Mac)
#   a  — open Android Emulator (requires Android Studio)
#   w  — open in browser (limited native features)

# Or scan the QR code with the Expo Go app on your phone
```

---

## 8. Deployment Checklist

- [ ] Supabase project created and schema applied
- [ ] `.env` file created with Supabase credentials
- [ ] `app.json` updated (app name, bundle IDs, EAS project ID)
- [ ] `eas.json` updated with Apple/Google account details
- [ ] EAS project initialized (`eas init`)
- [ ] Apple Developer account enrolled ($99/yr)
- [ ] App Store Connect app listing created
- [ ] Google Play Console account created ($25)
- [ ] Google Play app listing created
- [ ] GitHub secrets configured (`EXPO_TOKEN`)
- [ ] First build tested: `eas build --profile preview --platform all`
- [ ] Submit to TestFlight + Google Play Internal Testing for beta
- [ ] Submit for App Store Review
