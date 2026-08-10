import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

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
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${geistSans.variable} antialiased bg-background text-foreground`}>
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
