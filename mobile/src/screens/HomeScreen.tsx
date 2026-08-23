/**
 * Home Screen — Dashboard untuk siswa/guru.
 *
 * Stats: Active loans, points balance
 * Quick actions: Search, Scan ISBN, My Loans, Rewards
 * Recent activity
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Gift, Search, QrCode, Bell } from "lucide-react-native";

import { apiGet } from "../lib/api";
import { t } from "../lib/i18n";
import { useAuthStore } from "../store/useAuthStore";
import { StatCard } from "../components/StatCard";
import { QuickActionCard } from "../components/QuickActionCard";
import { useNavigation } from "@react-navigation/native";

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);

  const { data: dashboard, isLoading, refetch } = useQuery({
    queryKey: ["home-dashboard"],
    queryFn: () => apiGet("/api/mobile/dashboard"),
  });

  const firstName = user?.name?.split(" ")[0] || "User";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Selamat pagi" : hour < 18 ? "Selamat siang" : "Selamat malam";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
      >
        {/* Greeting */}
        <View style={styles.greeting}>
          <View>
            <Text style={styles.greetingText}>
              {greeting}, {firstName}! 👋
            </Text>
            <Text style={styles.subtitle}>
              {user?.member?.memberNumber || user?.email}
            </Text>
          </View>
          <TouchableOpacity style={styles.bellButton}>
            <Bell size={22} color="#1e3a5f" />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard
            icon={<BookOpen size={20} color="#1e3a5f" />}
            label={t("home.activeLoans")}
            value={dashboard?.activeLoans ?? 0}
            total={3}
          />
          <StatCard
            icon={<Gift size={20} color="#dc2626" />}
            label={t("home.points")}
            value={dashboard?.points ?? 0}
            accent
          />
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>{t("home.quickActions")}</Text>
        <View style={styles.actionsGrid}>
          <QuickActionCard
            icon={<Search size={24} color="#1e3a5f" />}
            label={t("home.searchCatalog")}
            onPress={() => navigation.navigate("Catalog")}
          />
          <QuickActionCard
            icon={<QrCode size={24} color="#1e3a5f" />}
            label={t("home.scanISBN")}
            onPress={() => navigation.navigate("Scan")}
          />
          <QuickActionCard
            icon={<BookOpen size={24} color="#1e3a5f" />}
            label={t("home.myLoans")}
            onPress={() => navigation.navigate("MyLoans")}
          />
          <QuickActionCard
            icon={<Gift size={24} color="#1e3a5f" />}
            label={t("home.rewards")}
            onPress={() => navigation.navigate("Rewards")}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 16 },
  greeting: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  greetingText: { fontSize: 22, fontWeight: "700", color: "#0f172a" },
  subtitle: { fontSize: 13, color: "#64748b", marginTop: 4 },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
});
