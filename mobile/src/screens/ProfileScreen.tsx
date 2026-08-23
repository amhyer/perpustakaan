import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LogOut, Globe, Bell, Info, ChevronRight } from "lucide-react-native";
import { useAuthStore } from "../store/useAuthStore";
import { t, setLocale, getLocale } from "../lib/i18n";

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const [locale, setLocaleState] = React.useState(getLocale());

  const handleLogout = async () => {
    Alert.alert("Keluar", "Yakin ingin keluar?", [
      { text: "Batal", style: "cancel" },
      { text: "Keluar", onPress: logout, style: "destructive" },
    ]);
  };

  const changeLocale = (newLocale: "id" | "en" | "ar") => {
    setLocale(newLocale);
    setLocaleState(newLocale);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </Text>
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          {user?.member?.memberNumber && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {t("profile.memberNumber")}: {user.member.memberNumber}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("profile.settings")}</Text>

          {/* Language switcher */}
          <View style={styles.menuGroup}>
            <View style={styles.menuItem}>
              <Globe size={18} color="#64748b" />
              <Text style={styles.menuLabel}>{t("profile.language")}</Text>
            </View>
            <View style={styles.localeRow}>
              {(["id", "en", "ar"] as const).map((l) => (
                <TouchableOpacity
                  key={l}
                  style={[
                    styles.localeBtn,
                    locale === l && styles.localeBtnActive,
                  ]}
                  onPress={() => changeLocale(l)}
                >
                  <Text
                    style={[
                      styles.localeText,
                      locale === l && styles.localeTextActive,
                    ]}
                  >
                    {l.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.menuItem}>
            <Bell size={18} color="#64748b" />
            <Text style={styles.menuLabel}>{t("profile.notifications")}</Text>
            <ChevronRight size={16} color="#94a3b8" style={{ marginLeft: "auto" }} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Info size={18} color="#64748b" />
            <Text style={styles.menuLabel}>{t("profile.about")}</Text>
            <ChevronRight size={16} color="#94a3b8" style={{ marginLeft: "auto" }} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={18} color="#dc2626" />
          <Text style={styles.logoutText}>{t("auth.logout")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  content: { paddingBottom: 24 },
  header: {
    alignItems: "center",
    padding: 24,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#1e3a5f",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: { color: "#ffffff", fontSize: 32, fontWeight: "700" },
  name: { fontSize: 18, fontWeight: "700", color: "#0f172a" },
  email: { fontSize: 13, color: "#64748b", marginTop: 4 },
  badge: {
    marginTop: 12,
    backgroundColor: "#eff6ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: { fontSize: 12, color: "#1e3a5f", fontWeight: "500" },
  section: { marginTop: 16, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  menuGroup: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    gap: 12,
  },
  menuLabel: { fontSize: 14, color: "#0f172a" },
  localeRow: {
    flexDirection: "row",
    padding: 8,
    gap: 8,
  },
  localeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  localeBtnActive: { backgroundColor: "#1e3a5f" },
  localeText: { fontSize: 12, fontWeight: "600", color: "#64748b" },
  localeTextActive: { color: "#ffffff" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    margin: 16,
    padding: 14,
    backgroundColor: "#fef2f2",
    borderRadius: 10,
  },
  logoutText: { color: "#dc2626", fontSize: 14, fontWeight: "600" },
});
