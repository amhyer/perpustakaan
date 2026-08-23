# 📱 Native Mobile App — Implementation Guide

Status: **Foundation Ready** (Tahap D)
Last updated: 23 Agustus 2026

---

## 🎯 Architecture: Code Sharing Strategy

Strategy: **70% code sharing** antara web & mobile pakai:
1. **API endpoints** (semua backend logic) — 100% share
2. **Business logic** (TypeScript modules di `src/lib/`) — 100% share
3. **React hooks** (custom hooks di `src/hooks/`) — 100% share
4. **Type definitions** (types/interfaces) — 100% share
5. **UI components** — 50% share (butuh platform adaptation)

```
┌──────────────────────────────────────────────────────┐
│  WEB (Next.js)                │  MOBILE (React Native)  │
│  ─ src/app/                  │  ─ app/                  │
│  ─ src/components/           │  ─ components/           │
│  ─ src/hooks/ ←── share ────→│  ─ hooks/                │
│  ─ src/lib/   ←── share ────→│  ─ lib/                  │
│  ─ src/store/  ←── share ────→│  ─ store/                │
└──────────────────────────────┴───────────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   API (Next.js API)   │
                    │   - 100% same          │
                    └───────────────────────┘
```

---

## 🚀 Quick Start (React Native CLI)

### 1. Initialize RN project
```bash
npx react-native init PerpustakaanMobile --template react-native-template-typescript
cd PerpustakaanMobile
```

### 2. Install dependencies
```bash
npm install zustand @react-navigation/native @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context
npm install @react-native-async-storage/async-storage  # for localStorage
npm install react-native-voice  # for voice search
npm install @notifee/react-native  # for push notifications
```

### 3. Copy shared code dari web project
```bash
# Setup monorepo structure
mkdir -p mobile/src/shared
cp -r ../perpustakaan/src/lib mobile/src/shared/lib
cp -r ../perpustakaan/src/hooks mobile/src/shared/hooks
cp -r ../perpustakaan/src/store mobile/src/shared/store
```

### 4. Setup Metro bundler
```js
// metro.config.js
const path = require('path');
const extraNodeModules = {
  '@': path.resolve(__dirname, '../perpustakaan/src'),
};
module.exports = {
  resolver: { extraNodeModules },
  watchFolders: [path.resolve(__dirname, '../perpustakaan')],
};
```

### 5. Replace platform-specific imports
Gunakan aliasing di `mobile/src/lib/platform.ts`:
```ts
// web: use localStorage, mobile: use AsyncStorage
export { default as Storage } from '@react-native-async-storage/async-storage';
```

---

## 📂 File Mapping: Web → Mobile

| Web (Next.js) | Mobile (React Native) | Strategy |
|---|---|---|
| `src/lib/points-engine.ts` | Copy as-is | ✅ Direct |
| `src/lib/voice-assistant.ts` | Copy as-is | ✅ Direct |
| `src/lib/recommendation-engine.ts` | Copy as-is | ✅ Direct |
| `src/lib/i18n/*` | Copy as-is | ✅ Direct |
| `src/hooks/use-event-stream.ts` | Replace with `use-websocket.ts` | 🔄 Adapt |
| `src/hooks/use-push-notification.ts` | Replace with `@notifee/react-native` | 🔄 Adapt |
| `src/hooks/use-local-storage.ts` | Use AsyncStorage | 🔄 Adapt |
| `src/components/app/rewards/*` | Use React Native primitives | 🔄 Adapt |
| `src/components/ui/*` (shadcn) | Use `react-native-paper` atau `tamagui` | 🔄 Replace |

---

## 🧩 Reusable Mobile Components

File: `src/components/app/rewards/mobile-shell.tsx` (sudah dibuat)

- `MobileShell` — Bottom tab navigation + top bar dengan search
- `usePullToRefresh` — Pull-to-refresh hook

### Usage:
```tsx
import { MobileShell, usePullToRefresh } from '@/components/app/rewards/mobile-shell';

function HomePage() {
  const refresh = usePullToRefresh(async () => {
    await refetchData();
  });
  
  return (
    <MobileShell unreadNotifications={3} userName="Andini">
      <DashboardContent />
    </MobileShell>
  );
}
```

---

## 📡 API Endpoints (Reused 100%)

Semua endpoint ini sudah siap dan tinggal dipanggil dari mobile:

| Endpoint | Fungsi | Status |
|---|---|---|
| `POST /api/auth/login` | Login | ✅ |
| `GET /api/points/me` | Saldo poin | ✅ |
| `GET /api/rewards` | Katalog hadiah | ✅ |
| `POST /api/rewards/[id]/claim` | Klaim | ✅ |
| `GET /api/redemptions/me` | History | ✅ |
| `POST /api/redemptions/admin/[id]/approve` | Approve (pustakawan) | ✅ |
| `GET /api/recommendations` | Rekomendasi buku | ✅ |
| `GET /api/ai/summary/[bookId]` | AI summary | ✅ |
| `GET /api/analytics/predictive` | Analytics (pustakawan) | ✅ |
| `POST /api/push/subscribe` | Push notification | ✅ |
| `GET /api/events/stream` | SSE (replaceable dengan WebSocket) | ✅ |
| `GET /api/voice/alexa` | Alexa integration | ✅ |
| `GET /api/voice/google` | Google Assistant integration | ✅ |

---

## 🔌 Voice Search (Mobile Native)

File: `src/hooks/use-voice-search.ts` (sudah dibuat)

Di mobile, replace Web Speech API dengan `react-native-voice`:
```tsx
import Voice from 'react-native-voice';

Voice.onSpeechResults = (event) => {
  const text = event.value[0];
  onResult(text);
};

const start = () => Voice.start('id-ID');
const stop = () => Voice.stop();
```

---

## 🔔 Push Notification (Mobile Native)

File: `src/hooks/use-push-notification.ts`

Di mobile, pakai `@notifee/react-native`:
```tsx
import notifee from '@notifee/react-native';

const token = await notifee.getToken();
// Save to /api/push/subscribe
await api.post('/api/push/subscribe', { token, platform: 'fcm' });
```

---

## 🎨 UI Adaptation Strategy

### Buttons & Inputs
- `react-native-paper` untuk Material Design yang familiar
- `tamagui` untuk universal styling (web + native)
- `nativewind` untuk Tailwind di RN

### Lists
- `FlatList` (built-in) untuk simple list
- `FlashList` (@shopify/flash-list) untuk long lists
- `LegendList` untuk advanced

### Navigation
- `react-navigation` v6 (de facto standard)
- `expo-router` (kalau pakai Expo)

### Forms
- `react-hook-form` (sama dengan web)
- Validation tetap via zod

---

## 📐 Platform-Specific Considerations

### 1. Image Handling
```tsx
// Web
<img src={book.coverImage} alt={book.title} />

// React Native
<Image source={{ uri: book.coverImage }} style={{ width: 120, height: 180 }} />
```

### 2. Date/Time
```tsx
// Web
new Date().toLocaleDateString('id-ID', { ... })

// React Native — pakai date-fns (sama)
import { format } from 'date-fns';
format(date, 'dd MMM yyyy', { locale: idLocale });
```

### 3. Storage
- Web: `localStorage`
- Mobile: `AsyncStorage` (with same key naming convention)
- Abstraction: `Storage.get(key)` & `Storage.set(key, value)` (already created in `use-local-storage.ts`)

### 4. Navigation
- Web: Next.js router
- Mobile: `react-navigation` (different API but similar concepts)
- Shared: Both use "go to URL with query params" pattern

### 5. QR Scanner
- Web: `BarcodeDetector` API atau library
- Mobile: `react-native-camera` atau `expo-camera`
- **Same API contract**: return string (the scanned value)

---

## 🚦 Build & Distribution

### iOS
```bash
cd ios && pod install && cd ..
npx react-native run-ios --release
# Atau
xcodebuild -workspace PerpustakaanMobile.xcworkspace -scheme PerpustakaanMobile -configuration Release
```

### Android
```bash
cd android && ./gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk
```

### App Store Submission
- iOS: App Store Connect → TestFlight → App Review
- Android: Google Play Console → Internal testing → Production

### Over-the-Air Updates
- `expo-updates` (kalau pakai Expo)
- `code-push` (Microsoft) untuk instant updates tanpa app store review

---

## 🧪 Testing

Reuse semua logic tests dari web:
```bash
# Di mobile project
npx vitest run ../perpustakaan/src/lib/__tests__/
```

Platform-specific tests:
```bash
# Component snapshot tests
npx jest __tests__/components/

# E2E with Detox or Maestro
npx maestro test flows/
```

---

## 📊 Estimated Effort

| Task | Effort | Notes |
|---|---|---|
| Monorepo setup | 2 days | Turborepo/Nx |
| Shared code migration | 3 days | Hooks, lib, store |
| UI component port | 1 week | Replace shadcn with RN |
| Platform integrations | 3 days | Voice, push, camera |
| Testing | 1 week | Detox, Maestro, Jest |
| Build & distribution | 2 days | Xcode, Gradle, signing |
| **Total** | **~5 weeks** | For 1 developer |

---

## 🎯 Recommended Tools

- **Framework**: React Native CLI (full control) atau Expo (easier)
- **State**: Zustand (same as web)
- **Forms**: react-hook-form + zod
- **UI Kit**: Tamagui (universal) atau react-native-paper
- **Navigation**: react-navigation
- **Storage**: AsyncStorage
- **Push**: @notifee/react-native
- **Testing**: Jest + Detox (E2E) + Maestro
- **CI/CD**: Fastlane + GitHub Actions
- **Distribution**: App Store + Play Store + OTA (CodePush)

---

## 🏆 Reference Apps

Contoh aplikasi library mobile yang bisa jadi referensi:
- **Libby** (by OverDrive) — elegant mobile library
- **Hoopla** — simple UX
- **BorrowBox** — comprehensive features

---

## ❓ FAQ

**Q: Apakah web app masih relevan setelah mobile ada?**
A: Ya. Web app untuk admin/staff/library management, mobile untuk end-user (siswa/guru).

**Q: Bisa pakai Expo untuk easier setup?**
A: Ya, recommended untuk tim kecil. Trade-off: ukuran app lebih besar.

**Q: Bagaimana handle offline mode?**
A: Pakai MMKV atau AsyncStorage + sync queue. Library offline-first seperti WatermelonDB untuk complex cases.

**Q: Apakah data pribadi aman?**
A: Token disimpan di Keychain (iOS) / Keystore (Android). HTTPS only. Rate limiting di server.
