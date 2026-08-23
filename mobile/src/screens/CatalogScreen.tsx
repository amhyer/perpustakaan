import React from "react";
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { apiGet } from "../lib/api";
import { t } from "../lib/i18n";

interface Book {
  id: string;
  title: string;
  author: string;
  coverColor?: string;
  coverImage?: string;
  available: number;
}

export default function CatalogScreen() {
  const navigation = useNavigation<any>();
  const [query, setQuery] = React.useState("");
  const { data: books, isLoading } = useQuery<Book[]>({
    queryKey: ["catalog", query],
    queryFn: () => apiGet<Book[]>(`/api/books?q=${encodeURIComponent(query)}&limit=50`),
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("catalog.title")}</Text>
        <View style={styles.searchBox}>
          <Search size={18} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={t("catalog.search")}
            placeholderTextColor="#94a3b8"
          />
        </View>
      </View>

      <FlatList
        data={books || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          isLoading ? null : (
            <Text style={styles.empty}>{t("catalog.noResults")}</Text>
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.bookCard}
            onPress={() => navigation.navigate("BookDetail", { bookId: item.id })}
          >
            <View style={[styles.cover, { backgroundColor: item.coverColor || "#1e3a5f" }]}>
              {item.coverImage ? (
                <Image source={{ uri: item.coverImage }} style={styles.coverImage} />
              ) : (
                <Text style={styles.coverText}>{item.title.charAt(0)}</Text>
              )}
            </View>
            <View style={styles.bookInfo}>
              <Text style={styles.bookTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.bookAuthor} numberOfLines={1}>
                {item.author}
              </Text>
              <Text style={styles.bookStatus}>
                {item.available > 0 ? `✓ ${item.available} tersedia` : "✗ Dipinjam semua"}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: { padding: 16, backgroundColor: "#ffffff", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  title: { fontSize: 22, fontWeight: "700", color: "#0f172a", marginBottom: 12 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#0f172a", paddingVertical: 10 },
  list: { padding: 12, gap: 8 },
  bookCard: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cover: {
    width: 56,
    height: 80,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  coverImage: { width: "100%", height: "100%", borderRadius: 6 },
  coverText: { color: "#ffffff", fontSize: 22, fontWeight: "700" },
  bookInfo: { flex: 1, marginLeft: 12, justifyContent: "center" },
  bookTitle: { fontSize: 14, fontWeight: "600", color: "#0f172a" },
  bookAuthor: { fontSize: 12, color: "#64748b", marginTop: 2 },
  bookStatus: { fontSize: 11, marginTop: 6, color: "#10b981" },
  empty: { textAlign: "center", padding: 32, color: "#94a3b8" },
});
