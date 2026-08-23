import type { Metadata } from "next";
import "./globals.css";
import { SonnerToaster } from "@/components/ui/feedback/sonner";
import { PwaInit } from "@/components/pwa-init";
import { WebVitalsInit } from "@/components/web-vitals-init";
import { SkipLink } from "@/components/app/shared/skip-link";

export const metadata: Metadata = {
  title: "Jendela Ilmu — Perpustakaan Digital",
  description:
    "Perpustakaan Jendela Ilmu: sistem manajemen perpustakaan modern untuk pustakawan, guru, dan siswa. Membuka Jendela Ilmu untuk Semua.",
  keywords: ["perpustakaan", "jendela ilmu", "SLiMS", "perpustakaan digital", "OPAC", "peminjaman buku"],
  authors: [{ name: "Perpustakaan Jendela Ilmu" }],
  manifest: "/manifest.json",
  themeColor: "#1e3a5f",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Jendela Ilmu",
  },
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/icons/icon-72.png", sizes: "72x72", type: "image/png" },
      { url: "/icons/icon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/icon-128.png", sizes: "128x128", type: "image/png" },
      { url: "/icons/icon-144.png", sizes: "144x144", type: "image/png" },
      { url: "/icons/icon-152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-384.png", sizes: "384x384", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "application-name": "Jendela Ilmu",
    "apple-mobile-web-app-title": "Jendela Ilmu",
    "msapplication-TileColor": "#1e3a5f",
    "msapplication-config": "/browserconfig.xml",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1e3a5f" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Jendela Ilmu" />
        <meta name="application-name" content="Jendela Ilmu" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-startup-image" href="/icons/icon-512.png" />
      </head>
      <body className="antialiased bg-background text-foreground">
        <SkipLink />
        <PwaInit />
        <WebVitalsInit />
        {children}
        <SonnerToaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast: "rounded-lg",
            },
          }}
        />
      </body>
    </html>
  );
}
