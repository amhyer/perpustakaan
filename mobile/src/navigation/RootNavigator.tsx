/**
 * Root Navigator — Main app navigation.
 *
 * If not authenticated: show Login screen
 * If authenticated: show MainTabs + modal screens
 */

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabs from "./MainTabs";
import LoginScreen from "../screens/LoginScreen";
import BookDetailScreen from "../screens/BookDetailScreen";
import RewardDetailScreen from "../screens/RewardDetailScreen";
import MyLoansScreen from "../screens/MyLoansScreen";
import MyRedemptionsScreen from "../screens/MyRedemptionsScreen";
import { deepLinkConfig } from "../lib/deep-linking";

const Stack = createNativeStackNavigator();

interface Props {
  isAuthenticated: boolean;
}

export default function RootNavigator({ isAuthenticated }: Props) {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      linking={deepLinkConfig}
    >
      {!isAuthenticated ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen
            name="BookDetail"
            component={BookDetailScreen}
            options={{ headerShown: true, title: "Detail Buku" }}
          />
          <Stack.Screen
            name="RewardDetail"
            component={RewardDetailScreen}
            options={{ headerShown: true, title: "Detail Hadiah" }}
          />
          <Stack.Screen
            name="MyLoans"
            component={MyLoansScreen}
            options={{ headerShown: true, title: "Peminjaman Saya" }}
          />
          <Stack.Screen
            name="MyRedemptions"
            component={MyRedemptionsScreen}
            options={{ headerShown: true, title: "Klaim Saya" }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
