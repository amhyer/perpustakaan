"use client";

import { motion } from "framer-motion";
import { Home, Search, BookOpen, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/form/button";
import { Logo } from "@/components/app/logo";

/**
 * 404 Not Found page — ditunjukkan saat route tidak ditemukan.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="mb-6">
          <Logo />
        </div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="relative inline-block mb-6"
        >
          <div className="text-9xl font-bold text-primary/20">404</div>
          <BookOpen className="absolute inset-0 m-auto h-20 w-20 text-primary" />
        </motion.div>

        <h1 className="text-2xl font-bold text-foreground mb-2">
          Halaman Tidak Ditemukan
        </h1>
        <p className="text-muted-foreground mb-6">
          Maaf, buku yang Anda cari tidak ada di katalog kami. Mungkin halaman ini
          sudah dipindahkan atau tidak pernah ada.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button asChild className="gap-2">
            <Link href="/">
              <Home className="h-4 w-4" />
              Kembali ke Beranda
            </Link>
          </Button>
          <Button variant="outline" onClick={() => history.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Halaman Sebelumnya
          </Button>
        </div>

        <div className="mt-8 pt-6 border-t">
          <p className="text-xs text-muted-foreground mb-3">Coba cari di katalog:</p>
          <Link
            href="/?view=catalog"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Search className="h-4 w-4" />
            Buka Katalog Buku
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
