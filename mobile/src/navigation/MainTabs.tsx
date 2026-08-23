/**
 * Main Tabs — Bottom tab navigation.
 *
 * 5 tabs: Home, Catalog, Scan (center), Rewards, Profile
 * Center Scan tab lebih besar (FAB-style) untuk easy access
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Home, BookOpen, Gift, User, QrCode } from "lucide-react-native";

import HomeScreen from "../screens/HomeScreen";
import CatalogScreen from "../screens/CatalogScreen";
import ScanScreen from "../screens/ScanScreen";
import RewardsScreen from "../screens/RewardsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { t } from "../lib/i18n";

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#1e3a5f",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarStyle: styles.tabBar,
        tabBarLabel: ({ focused, color }) => (
          <Text style={[styles.label, { color }]}>
            {labelForRoute(route.name)}
          </Text>
        ),
        tabBarIcon: ({ color, size, focused }) => {
          if (route.name === "Scan") {
            return (
              <View style={styles.scanButton}>
                <QrCode size={28} color="#ffffff" />
              </View>
            );
          }
          const Icon = iconForRoute(route.name);
          return <Icon size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Catalog" component={CatalogScreen} />
      <Tab.Screen name="Scan" component={ScanScreen} options={{ tabBarLabel: "" }} />
      <Tab.Screen name="Rewards" component={RewardsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function labelForRoute(name: string): string {
  switch (name) {
    case "Home":
      return t("nav.home");
    case "Catalog":
      return t("nav.catalog");
    case "Scan":
      return "";
    case "Rewards":
      return t("nav.rewards");
    case "Profile":
      return t("nav.profile");
    default:
      return name;
  }
}

function iconForRoute(name: string) {
  switch (name) {
    case "Home":
      return Home;
    case "Catalog":
      return BookOpen;
    case "Rewards":
      return Gift;
    case "Profile":
      return User;
    default:
      return Home;
  }
}

const styles = StyleSheet.create({
  tabBar: {
    height: 64,
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  label: {
    fontSize: 11,
    marginTop: 2,
  },
  scanButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1e3a5f",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#1e3a5f",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
});
