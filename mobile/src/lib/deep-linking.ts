/**
 * Deep linking configuration untuk mobile app.
 *
 * Universal/App Links scheme: https://perpustakaan.sekolah.sch.id/*
 * Custom scheme: jendela-ilmu://
 *
 * Examples:
 * - jendela-ilmu://book/abc-123
 * - https://perpustakaan.sekolah.sch.id/book/abc-123
 * - jendela-ilmu://loan/active
 * - jendela-ilmu://reward/xyz
 */

import { Linking } from "react-native";

export const APP_SCHEME = "jendela-ilmu";
export const WEB_URL = "https://perpustakaan.sekolah.sch.id";

export const deepLinkConfig = {
  prefixes: [APP_SCHEME + "://", WEB_URL + "/"],
  config: {
    screens: {
      MainTabs: {
        screens: {
          Home: "home",
          Catalog: "catalog",
          Scan: "scan",
          Rewards: "rewards",
          Profile: "profile",
        },
      },
      // Modal screens
      BookDetail: "book/:bookId",
      RewardDetail: "reward/:rewardId",
      LoanDetail: "loan/:loanId",
      MyLoans: "my-loans",
      MyRedemptions: "my-redemptions",
    },
  },
};

/**
 * Setup deep linking.
 * Call once on app start.
 */
export function setupDeepLinking() {
  // Listen for incoming links (cold start or background)
  Linking.getInitialURL().then((url) => {
    if (url) {
      // App opened from deep link
      handleDeepLink(url);
    }
  });

  // Listen for runtime links
  const subscription = Linking.addEventListener("url", ({ url }) => {
    handleDeepLink(url);
  });

  return subscription;
}

function handleDeepLink(url: string) {
  // Custom processing
  // For now, just log — react-navigation will auto-route
  console.log("[DeepLink]", url);
}

/**
 * Generate deep link URL for sharing.
 */
export function getBookLink(bookId: string): string {
  return `${APP_SCHEME}://book/${bookId}`;
}

export function getRewardLink(rewardId: string): string {
  return `${APP_SCHEME}://reward/${rewardId}`;
}

export function getLoanLink(loanId: string): string {
  return `${APP_SCHEME}://loan/${loanId}`;
}
