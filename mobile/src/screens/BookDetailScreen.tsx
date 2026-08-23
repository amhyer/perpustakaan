import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "@react-navigation/native";
import { apiGet } from "../lib/api";

export default function BookDetailScreen() {
  const route = useRoute<any>();
  const { bookId } = route.params;

  const { data: book, isLoading } = useQuery({
    queryKey: ["book", bookId],
    queryFn: () => apiGet(`/api/books/${bookId}`),
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.cover, { backgroundColor: book?.coverColor || "#1e3a5f" }]}>
        <Text style={styles.coverText}>{book?.title?.charAt(0)}</Text>
      </View>
      <Text style={styles.title}>{book?.title}</Text>
      <Text style={styles.author}>{book?.author}</Text>
      {book?.publisher && (
        <Text style={styles.meta}>
          {book.publisher} {book.year ? `· ${book.year}` : ""}
        </Text>
      )}
      {book?.synopsis && (
        <>
          <Text style={styles.sectionTitle}>Sinopsis</Text>
          <Text style={styles.synopsis}>{book.synopsis}</Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  content: { padding: 24 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  cover: {
    width: 160,
    height: 240,
    borderRadius: 12,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  coverText: { color: "#ffffff", fontSize: 64, fontWeight: "700" },
  title: { fontSize: 22, fontWeight: "700", color: "#0f172a" },
  author: { fontSize: 15, color: "#64748b", marginTop: 6 },
  meta: { fontSize: 12, color: "#94a3b8", marginTop: 4 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0f172a",
    marginTop: 24,
    marginBottom: 8,
  },
  synopsis: { fontSize: 14, color: "#475569", lineHeight: 22 },
});
