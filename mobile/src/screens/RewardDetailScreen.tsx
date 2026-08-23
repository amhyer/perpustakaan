import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "@react-navigation/native";
import { apiGet, apiPost } from "../lib/api";
import { t } from "../lib/i18n";

export default function RewardDetailScreen() {
  const route = useRoute<any>();
  const queryClient = useQueryClient();
  const { rewardId } = route.params;

  const { data: reward, isLoading } = useQuery({
    queryKey: ["reward", rewardId],
    queryFn: () => apiGet(`/api/rewards/${rewardId}`),
  });

  const handleClaim = async () => {
    try {
      await apiPost(`/api/rewards/${rewardId}/claim`);
      Alert.alert("Berhasil", "Hadiah berhasil diklaim!");
      queryClient.invalidateQueries({ queryKey: ["rewards"] });
    } catch (err: any) {
      Alert.alert("Gagal", err.response?.data?.error || "Gagal mengklaim hadiah");
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.image}>
        <Text style={styles.imageText}>{reward?.name?.charAt(0)}</Text>
      </View>
      <Text style={styles.name}>{reward?.name}</Text>
      {reward?.description && (
        <Text style={styles.description}>{reward.description}</Text>
      )}
      <View style={styles.costRow}>
        <Text style={styles.cost}>{reward?.pointCost} poin</Text>
        <Text style={styles.category}>{reward?.category}</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleClaim}>
        <Text style={styles.buttonText}>{t("rewards.claim")}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  content: { padding: 24 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  image: {
    width: 160,
    height: 160,
    borderRadius: 12,
    backgroundColor: "#1e3a5f",
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  imageText: { color: "#ffffff", fontSize: 64, fontWeight: "700" },
  name: { fontSize: 22, fontWeight: "700", color: "#0f172a" },
  description: { fontSize: 14, color: "#64748b", marginTop: 12, lineHeight: 20 },
  costRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  cost: { fontSize: 18, fontWeight: "700", color: "#dc2626" },
  category: { fontSize: 11, color: "#94a3b8", textTransform: "uppercase" },
  button: {
    marginTop: 24,
    backgroundColor: "#1e3a5f",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
});
