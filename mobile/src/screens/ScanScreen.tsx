import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { QrCode, Camera, Search } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { t } from "../lib/i18n";
import { apiGet } from "../lib/api";

/**
 * ScanScreen — Center tab for ISBN scanning.
 *
 * Note: Full camera implementation requires native module setup.
 * For now: provide manual input fallback that uses same lookup API.
 *
 * Setup for full camera:
 * 1. npm install react-native-vision-camera
 * 2. Update Info.plist (iOS) and AndroidManifest.xml with camera permission
 * 3. Implement <Camera> component with barcode scanner
 */
export default function ScanScreen() {
  const navigation = useNavigation<any>();
  const [manualISBN, setManualISBN] = useState("");

  const handleManualLookup = async () => {
    if (!manualISBN.trim()) return;
    try {
      const result = await apiGet(`/api/books/lookup?isbn=${encodeURIComponent(manualISBN)}`);
      if (result.status === "FOUND") {
        navigation.navigate("BookDetail", { bookId: result.data?.bookId || manualISBN });
      } else if (result.status === "DUPLICATE") {
        Alert.alert("Buku Sudah Ada", result.message);
      } else {
        Alert.alert("Tidak Ditemukan", `ISBN ${manualISBN} tidak ada di database`);
      }
    } catch {
      Alert.alert("Error", "Gagal mencari ISBN");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <QrCode size={48} color="#1e3a5f" />
        </View>
        <Text style={styles.title}>Scan ISBN</Text>
        <Text style={styles.subtitle}>
          Arahkan kamera ke barcode ISBN di belakang buku
        </Text>

        {/* Camera placeholder (full implementation requires vision-camera) */}
        <View style={styles.cameraPlaceholder}>
          <Camera size={48} color="#94a3b8" />
          <Text style={styles.cameraText}>
            Kamera akan aktif di sini (perlu permission)
          </Text>
        </View>

        <Text style={styles.divider}>atau</Text>

        {/* Manual input */}
        <TouchableOpacity
          style={styles.button}
          onPress={handleManualLookup}
        >
          <Search size={18} color="#ffffff" />
          <Text style={styles.buttonText}>Input ISBN Manual</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  content: { flex: 1, padding: 24, justifyContent: "center", alignItems: "center" },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: "700", color: "#0f172a" },
  subtitle: { fontSize: 13, color: "#64748b", textAlign: "center", marginTop: 8, marginBottom: 24 },
  cameraPlaceholder: {
    width: "100%",
    aspectRatio: 1.6,
    backgroundColor: "#0f172a",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  cameraText: { color: "#94a3b8", fontSize: 12, marginTop: 12, textAlign: "center" },
  divider: { color: "#94a3b8", fontSize: 12, marginBottom: 16 },
  button: {
    flexDirection: "row",
    backgroundColor: "#1e3a5f",
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: "center",
    gap: 8,
  },
  buttonText: { color: "#ffffff", fontSize: 14, fontWeight: "600" },
});
