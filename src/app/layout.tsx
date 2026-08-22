import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { SonnerToaster } from "@/components/ui/feedback/sonner";
import { PwaInit } from "@/components/pwa-init";
import { WebVitalsInit } from "@/components/web-vitals-init";
import { SkipLink } from "@/components/app/shared/skip-link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

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
      { url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/icon-192.svg", sizes: "192x192" },
    ],
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
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Jendela Ilmu" />
      </head>
      <body className={`${geistSans.variable} antialiased bg-background text-foreground`}>
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
