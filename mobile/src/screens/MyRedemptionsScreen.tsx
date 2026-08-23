import React from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../lib/api";
import { t } from "../lib/i18n";

interface Redemption {
  id: string;
  rewardName: string;
  status: string;
  pointsSpent: number;
  createdAt: string;
  pickupCode: string;
}

export default function MyRedemptionsScreen() {
  const { data } = useQuery<{ items: Redemption[] }>({
    queryKey: ["my-redemptions"],
    queryFn: () => apiGet("/api/redemptions/me"),
  });

  const items = data?.items || [];

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>Belum ada klaim</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.name}>{item.rewardName}</Text>
              <Text style={styles.points}>-{item.pointsSpent} pts</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.code}>Kode: {item.pickupCode}</Text>
              <Text style={[styles.status, getStatusStyle(item.status)]}>
                {item.status}
              </Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function getStatusStyle(status: string) {
  switch (status) {
    case "DELIVERED":
      return { color: "#10b981" };
    case "APPROVED":
      return { color: "#3b82f6" };
    case "PENDING":
      return { color: "#f59e0b" };
    case "REJECTED":
      return { color: "#ef4444" };
    default:
      return { color: "#94a3b8" };
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  list: { padding: 12, gap: 8 },
  empty: { textAlign: "center", padding: 32, color: "#94a3b8" },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: { fontSize: 14, fontWeight: "600", color: "#0f172a", flex: 1 },
  points: { fontSize: 13, color: "#dc2626", fontWeight: "600" },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  code: { fontSize: 12, color: "#64748b", fontFamily: "monospace" },
  status: { fontSize: 11, fontWeight: "600", textTransform: "uppercase" },
});
