import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Gift } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { apiGet } from "../lib/api";
import { t } from "../lib/i18n";

interface Reward {
  id: string;
  name: string;
  description: string;
  pointCost: number;
  imageUrl?: string;
  category: string;
  stock: number | null;
}

export default function RewardsScreen() {
  const navigation = useNavigation<any>();
  const { data, isLoading } = useQuery<{ items: Reward[]; balance: number }>({
    queryKey: ["rewards"],
    queryFn: () => apiGet("/api/rewards?pageSize=50"),
  });

  const rewards = data?.items || [];
  const balance = data?.balance || 0;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t("rewards.title")}</Text>
          <Text style={styles.balance}>
            {balance} {t("rewards.myPoints")}
          </Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate("MyRedemptions")}>
          <Gift size={22} color="#1e3a5f" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={rewards}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.card,
              balance < item.pointCost && styles.cardDisabled,
            ]}
            onPress={() => navigation.navigate("RewardDetail", { rewardId: item.id })}
          >
            <View style={styles.imageWrap}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.image} />
              ) : (
                <Gift size={32} color="#1e3a5f" />
              )}
            </View>
            <Text style={styles.name} numberOfLines={2}>
              {item.name}
            </Text>
            <View style={styles.costRow}>
              <Text style={styles.cost}>{item.pointCost} pts</Text>
              {item.stock !== null && (
                <Text style={styles.stock}>Stok: {item.stock}</Text>
              )}
            </View>
            {balance < item.pointCost && (
              <Text style={styles.disabled}>
                {t("rewards.insufficientPoints")}
              </Text>
            )}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  title: { fontSize: 22, fontWeight: "700", color: "#0f172a" },
  balance: { fontSize: 13, color: "#dc2626", fontWeight: "600", marginTop: 4 },
  list: { padding: 12 },
  row: { gap: 12, marginBottom: 12 },
  card: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardDisabled: { opacity: 0.5 },
  imageWrap: {
    height: 80,
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  image: { width: "100%", height: "100%", borderRadius: 8 },
  name: { fontSize: 13, fontWeight: "600", color: "#0f172a" },
  costRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  cost: { fontSize: 12, fontWeight: "700", color: "#1e3a5f" },
  stock: { fontSize: 10, color: "#64748b" },
  disabled: { fontSize: 10, color: "#dc2626", marginTop: 4 },
});
