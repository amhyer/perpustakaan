import React from "react";
import { View, Text, StyleSheet } from "react-native";

export function StatCard({
  icon,
  label,
  value,
  total,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  total?: number;
  accent?: boolean;
}) {
  return (
    <View style={[styles.card, accent && styles.accent]}>
      <View style={styles.icon}>{icon}</View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={styles.value}>{value}</Text>
        {total !== undefined && (
          <Text style={styles.total}>/ {total}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  accent: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  label: { fontSize: 12, color: "#64748b" },
  valueRow: { flexDirection: "row", alignItems: "baseline", marginTop: 4 },
  value: { fontSize: 24, fontWeight: "700", color: "#0f172a" },
  total: { fontSize: 13, color: "#94a3b8", marginLeft: 4 },
});
