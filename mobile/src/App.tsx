/**
 * Perpustakaan Jendela Ilmu - Mobile App Entry Component.
 *
 * Setup:
 * - Navigation: bottom tabs (Home, Catalog, Scan, Rewards, Profile)
 * - Auth: stored in AsyncStorage
 * - API: base URL from app config
 * - Push: Firebase messaging (opsional)
 * - i18n: Indonesia (default) + English + Arabic
 */

import React, { useEffect, useState } from "react";
import { StatusBar, View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import RootNavigator from "./navigation/RootNavigator";
import { useAuthStore } from "./store/useAuthStore";
import { initI18n } from "./lib/i18n";
import { setupDeepLinking } from "./lib/deep-linking";
import { api } from "./lib/api";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 min
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const { checkAuth, isAuthenticated } = useAuthStore();

  useEffect(() => {
    (async () => {
      try {
        // 1. Init i18n
        await initI18n();

        // 2. Check existing auth from AsyncStorage
        await checkAuth();

        // 3. Setup deep linking
        const linking = setupDeepLinking();

        setReady(true);
        return linking;
      } catch (err) {
        setInitError(err instanceof Error ? err.message : "Init failed");
        setReady(true);
      }
    })();
  }, [checkAuth]);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1e3a5f" />
        <Text style={styles.loadingText}>Memuat Jendela Ilmu...</Text>
      </View>
    );
  }

  if (initError) {
    return (
      <View style={styles.error}>
        <Text style={styles.errorText}>Gagal memulai aplikasi:</Text>
        <Text style={styles.errorDetail}>{initError}</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
          <NavigationContainer>
            <RootNavigator isAuthenticated={isAuthenticated} />
          </NavigationContainer>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748b",
  },
  error: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#ffffff",
  },
  errorText: {
    fontSize: 16,
    color: "#dc2626",
    marginBottom: 8,
  },
  errorDetail: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
  },
});
