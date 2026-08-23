# Mobile Setup Guide

Status: **Foundation Complete** (Sprint F6)
Last updated: 23 Agustus 2026

## Overview

Native mobile app untuk Perpustakaan Jendela Ilmu menggunakan **React Native 0.76+** (New Architecture ready). App ini share 70%+ code dengan web app.

## Quick Start

### Prerequisites

- Node.js >= 18
- npm 9+ (or yarn 3+)
- **For Android:**
  - Java 17 (JDK)
  - Android Studio (latest)
  - Android SDK 34
  - NDK 26.1
- **For iOS:**
  - macOS only
  - Xcode 15+
  - CocoaPods 1.13+
  - iOS 14+ deployment target

### Installation

```bash
cd mobile
npm install --no-audit --no-fund --legacy-peer-deps

# iOS only
cd ios && pod install && cd ..

# Run
npm run android  # atau
npm run ios
```

## Architecture

### Code Sharing Strategy

- **API endpoints**: 100% share (same backend)
- **Business logic** (`src/lib/`): 100% share
- **React hooks** (`src/hooks/`): 100% share
- **Types**: 100% share
- **UI components**: 50% share (butuh platform adaptation)

### Directory Structure

```
mobile/
├── src/
│   ├── App.tsx              # Entry component
│   ├── navigation/          # React Navigation setup
│   │   ├── RootNavigator.tsx
│   │   └── MainTabs.tsx     # Bottom tabs
│   ├── screens/             # Screen components
│   │   ├── HomeScreen.tsx
│   │   ├── CatalogScreen.tsx
│   │   ├── ScanScreen.tsx
│   │   ├── RewardsScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   ├── BookDetailScreen.tsx
│   │   ├── RewardDetailScreen.tsx
│   │   ├── MyLoansScreen.tsx
│   │   └── MyRedemptionsScreen.tsx
│   ├── components/          # Reusable UI components
│   │   ├── StatCard.tsx
│   │   └── QuickActionCard.tsx
│   ├── hooks/               # Custom hooks
│   │   ├── useCamera.ts
│   │   └── usePushNotifications.ts
│   ├── lib/                 # Shared business logic
│   │   ├── api.ts           # HTTP client (axios + auto-refresh)
│   │   ├── i18n.ts          # i18n-js
│   │   ├── deep-linking.ts  # Universal Links config
│   │   └── locales/         # id, en, ar
│   ├── store/               # Zustand stores
│   │   └── useAuthStore.ts
│   └── types/               # TypeScript types
├── android/                 # Android-specific
│   └── app/
│       ├── build.gradle
│       └── src/main/
│           ├── AndroidManifest.xml
│           └── res/values/strings.xml
├── ios/                     # iOS-specific
│   └── Info.plist
├── app.json                 # App config
├── index.js                 # Entry point
├── package.json
└── tsconfig.json
```

## Features Implemented

### ✅ Sprint F6 Foundation

- [x] Authentication (login/logout/refresh)
- [x] Persistent auth via AsyncStorage
- [x] HTTP client with auto-refresh token
- [x] Bottom tab navigation (5 tabs)
- [x] Modal screens (BookDetail, RewardDetail, etc)
- [x] i18n (id, en, ar with RTL)
- [x] Deep linking (jendela-ilmu:// + universal links)
- [x] Permission requests (camera)
- [x] Manual ISBN input (with API integration)
- [x] Push notification hook (stub)
- [x] Android & iOS build configs
- [x] App manifest + Info.plist with proper permissions

### 🚧 To Be Implemented (next sprints)

- [ ] Full camera barcode scanner (react-native-vision-camera)
- [ ] Real FCM push notification integration
- [ ] Offline support (Realm/MMKV)
- [ ] Biometric authentication
- [ ] QR code generation for member card
- [ ] Real-time notifications via WebSocket
- [ ] Background sync
- [ ] Apple Watch / Wear OS companion

## Deep Linking

### Custom scheme: `jendela-ilmu://`

```
jendela-ilmu://home
jendela-ilmu://catalog
jendela-ilmu://book/abc-123
jendela-ilmu://reward/xyz
jendela-ilmu://loan/active
```

### Universal Links: `https://perpustakaan.sekolah.sch.id/`

```
https://perpustakaan.sekolah.sch.id/home
https://perpustakaan.sekolah.sch.id/book/abc-123
```

Setup:
1. **iOS**: Configure apple-app-site-association at `https://perpustakaan.sekolah.sch.id/.well-known/`
2. **Android**: Configure Digital Asset Links at `https://perpustakaan.sekolah.sch.id/.well-known/assetlinks.json`

## i18n

3 locales supported: `id` (default), `en`, `ar` (RTL).
Device locale auto-detected via `react-native-localize`.
User can manually switch in Profile screen.

## API Configuration

Set environment variable:

```bash
# .env
API_BASE_URL=https://perpustakaan.sekolah.sch.id
```

For development:
```bash
API_BASE_URL=http://localhost:3001
```

## Build

### Android (Release)

```bash
cd mobile
npm run build:android
# Output: mobile/android/app/build/outputs/apk/release/app-release.apk
```

For Play Store:
```bash
cd mobile/android
./gradlew bundleRelease
# Output: app/build/outputs/bundle/release/app-release.aab
```

### iOS (Release)

```bash
cd mobile
npm run build:ios
# Output: mobile/ios/build/Build/Products/Release-iphoneos/Perpustakaan.ipa
```

## Testing

```bash
# Unit tests
npm test

# Type check
npm run typecheck
```

## Deployment

### Google Play Store

1. Build AAB: `cd android && ./gradlew bundleRelease`
2. Upload to Google Play Console
3. Setup signing key (production)

### Apple App Store

1. Open `ios/Perpustakaan.xcworkspace` in Xcode
2. Product → Archive
3. Distribute App → App Store Connect

## Troubleshooting

### Camera permission denied

iOS: Check Info.plist has `NSCameraUsageDescription`
Android: Check AndroidManifest.xml has `<uses-permission android:name="android.permission.CAMERA" />`

### Build fails on Android

- Clear gradle cache: `cd android && ./gradlew clean`
- Reinstall: `cd .. && rm -rf node_modules && npm install`

### Build fails on iOS

- Clean pod: `cd ios && rm -rf Pods Podfile.lock && pod install`
- Clear Xcode cache: Cmd+Shift+K

## Next Steps

1. Add vision-camera for full ISBN scanner
2. Setup Firebase project for FCM
3. Add biometric auth with `react-native-keychain`
4. Configure offline-first with Realm
5. Setup CI/CD with Fastlane + GitHub Actions
