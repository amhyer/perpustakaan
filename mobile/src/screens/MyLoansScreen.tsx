import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { apiGet, apiPut } from "../lib/api";
import { t } from "../lib/i18n";

interface Loan {
  id: string;
  bookTitle: string;
  dueDate: string;
  status: string;
  bookAuthor: string;
}

export default function MyLoansScreen() {
  const { data: loans, refetch } = useQuery<Loan[]>({
    queryKey: ["my-loans"],
    queryFn: () => apiGet("/api/loans?mine=1"),
  });

  const handleRenew = async (loanId: string) => {
    try {
      await apiPut(`/api/loans/${loanId}/renew`);
      Alert.alert("Berhasil", "Peminjaman diperpanjang 7 hari");
      refetch();
    } catch (err: any) {
      Alert.alert("Gagal", err.response?.data?.error || "Gagal perpanjang");
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <FlatList
        data={loans || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>Tidak ada pinjaman aktif</Text>
        }
        renderItem={({ item }) => {
          const isOverdue = new Date(item.dueDate) < new Date();
          return (
            <View style={[styles.card, isOverdue && styles.cardOverdue]}>
              <View style={styles.cardHeader}>
                <Text style={styles.title} numberOfLines={2}>
                  {item.bookTitle}
                </Text>
                <Text style={styles.author}>{item.bookAuthor}</Text>
              </View>
              <View style={styles.footer}>
                <Text
                  style={[styles.due, isOverdue && styles.dueOverdue]}
                >
                  {isOverdue ? "⚠ " : "📅 "}
                  {t("loan.dueIn")} {new Date(item.dueDate).toLocaleDateString("id-ID")}
                </Text>
                <TouchableOpacity
                  style={styles.renewBtn}
                  onPress={() => handleRenew(item.id)}
                >
                  <Text style={styles.renewText}>{t("loan.extend")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
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
  cardOverdue: { borderColor: "#fecaca", backgroundColor: "#fef2f2" },
  cardHeader: { marginBottom: 12 },
  title: { fontSize: 14, fontWeight: "600", color: "#0f172a" },
  author: { fontSize: 12, color: "#64748b", marginTop: 2 },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  due: { fontSize: 12, color: "#475569" },
  dueOverdue: { color: "#dc2626", fontWeight: "600" },
  renewBtn: {
    backgroundColor: "#1e3a5f",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  renewText: { color: "#ffffff", fontSize: 12, fontWeight: "600" },
});
