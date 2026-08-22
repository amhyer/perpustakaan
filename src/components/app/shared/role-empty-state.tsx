"use client";

import {
  ArrowRight,
  BookOpen,
  BookHeart,
  Search,
  UserPlus,
  Sparkles,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/layout/card";
import { Button } from "@/components/ui/form/button";
import { useAppStore, type ViewKey } from "@/store/use-app-store";

export type EmptyStateContext =
  | "no-loans"
  | "no-recommendations"
  | "no-wishlist"
  | "no-members"
  | "no-books"
  | "no-proposals"
  | "no-announcements"
  | "no-reservations"
  | "no-active-loans"
  | "no-overdue"
  | "no-classmates"
  | "no-reading-history"
  | "no-class-overview"
  | "no-top-members"
  | "no-recent-loans"
  | "no-stats";

export type UserRole = "LIBRARIAN" | "PUSTAKAWAN_JUNIOR" | "TEACHER" | "STUDENT" | string;

interface EmptyStateContent {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Optional default CTA yang di-navigate via store */
  primaryAction?: { label: string; view: ViewKey; params?: Record<string, string> };
}

interface RoleEmptyStateProps {
  context: EmptyStateContext;
  userRole: UserRole;
  /** Override title/description */
  title?: string;
  description?: string;
  /** Override action label (keep existing view target) */
  primaryActionLabel?: string;
  /** Custom primary action (overrides content default) */
  primaryAction?: { label: string; onClick: () => void };
  /** Secondary action button */
  secondaryAction?: { label: string; onClick: () => void };
  /** Compact mode (no Card wrapper) */
  compact?: boolean;
  className?: string;
}

/**
 * Role-specific empty state generator.
 *
 * Fix #7 dari Sprint 3 — konten berbeda per role agar user langsung
 * tahu harus mulai dari mana.
 *
 * ```tsx
 * <RoleEmptyState context="no-active-loans" userRole={user.role} />
 * ```
 */
const CONTENT: Record<EmptyStateContext, Partial<Record<UserRole, EmptyStateContent>>> = {
  "no-loans": {
    LIBRARIAN: {
      icon: BookOpen,
      title: "Belum ada aktivitas peminjaman",
      description: "Sirkulasi perpustakaan akan tercatat di sini setelah anggota mulai meminjam buku.",
    },
    TEACHER: {
      icon: BookOpen,
      title: "Anda belum meminjam buku",
      description: "Cari referensi mengajar di katalog. Pinjaman gratis untuk guru dengan durasi 30 hari.",
      primaryAction: { label: "Jelajahi Katalog", view: "catalog" },
    },
    STUDENT: {
      icon: BookOpen,
      title: "Yuk, pinjam buku pertamamu! 📚",
      description: "Membaca 15 menit sehari meningkatkan konsentrasi dan kosakata. Mulai dari sini.",
      primaryAction: { label: "Jelajahi Katalog", view: "catalog" },
    },
  },
  "no-recommendations": {
    LIBRARIAN: {
      icon: Sparkles,
      title: "Belum ada rekomendasi",
      description: "Sistem akan membuat rekomendasi otomatis setelah ada cukup data peminjaman anggota.",
    },
    TEACHER: {
      icon: Sparkles,
      title: "Rekomendasi sedang dipersonalisasi",
      description: "Sistem menganalisis buku yang Anda pinjam untuk memberi rekomendasi yang relevan.",
      primaryAction: { label: "Lihat Katalog", view: "catalog" },
    },
    STUDENT: {
      icon: Sparkles,
      title: "Pinjam 3 buku untuk rekomendasi",
      description: "Setelah membaca beberapa buku, kami akan menyarankan bacaan yang cocok untukmu!",
      primaryAction: { label: "Mulai Membaca", view: "catalog" },
    },
  },
  "no-wishlist": {
    TEACHER: {
      icon: BookHeart,
      title: "Wishlist masih kosong",
      description: "Simpan buku yang ingin Anda baca atau pinjam nanti.",
      primaryAction: { label: "Telusuri Katalog", view: "catalog" },
    },
    STUDENT: {
      icon: BookHeart,
      title: "Wishlist kamu masih kosong 💕",
      description: "Tap ikon ❤ di buku yang kamu suka untuk menyimpannya di sini.",
      primaryAction: { label: "Lihat Buku", view: "catalog" },
    },
  },
  "no-members": {
    LIBRARIAN: {
      icon: UserPlus,
      title: "Belum ada anggota terdaftar",
      description: "Daftarkan siswa dan guru sebagai anggota untuk mulai menggunakan layanan sirkulasi.",
      primaryAction: { label: "Tambah Anggota", view: "members" },
    },
  },
  "no-books": {
    LIBRARIAN: {
      icon: BookOpen,
      title: "Katalog perpustakaan masih kosong",
      description: "Tambah buku pertama untuk memulai koleksi perpustakaan.",
      primaryAction: { label: "Tambah Buku", view: "book-form" },
    },
  },
  "no-proposals": {
    LIBRARIAN: {
      icon: Search,
      title: "Tidak ada usulan buku",
      description: "Usulan dari anggota akan muncul di sini untuk Anda review.",
    },
    TEACHER: {
      icon: Search,
      title: "Anda belum mengajukan buku",
      description: "Punya rekomendasi buku yang bermanfaat untuk murid? Ajukan di sini.",
      primaryAction: { label: "Ajukan Buku", view: "proposals" },
    },
  },
  "no-announcements": {
    LIBRARIAN: {
      icon: Search,
      title: "Belum ada pengumuman",
      description: "Buat pengumuman untuk menginformasikan kegiatan perpustakaan ke anggota.",
      primaryAction: { label: "Buat Pengumuman", view: "announcements" },
    },
    TEACHER: {
      icon: Search,
      title: "Belum ada pengumuman",
      description: "Pengumuman dari pustakawan akan muncul di sini.",
    },
    STUDENT: {
      icon: Search,
      title: "Belum ada pengumuman",
      description: "Pengumuman terbaru dari pustakawan akan muncul di sini. Stay tuned!",
    },
  },
  "no-reservations": {
    TEACHER: {
      icon: Search,
      title: "Tidak ada buku yang direservasi",
      description: "Reservasi berguna saat buku yang Anda inginkan sedang dipinjam orang lain.",
      primaryAction: { label: "Cari Buku", view: "catalog" },
    },
    STUDENT: {
      icon: Search,
      title: "Belum ada reservasi 📖",
      description: "Buku yang kamu inginkan sedang dipinjam? Reservasi agar kamu dapat antrian pertama.",
      primaryAction: { label: "Cari Buku", view: "catalog" },
    },
  },
  "no-active-loans": {
    LIBRARIAN: {
      icon: BookOpen,
      title: "Tidak ada peminjaman aktif",
      description: "Daftar peminjaman yang sedang berlangsung akan muncul di sini.",
    },
    TEACHER: {
      icon: BookOpen,
      title: "Tidak ada pinjaman aktif",
      description: "Buku yang sedang Anda pinjam akan muncul di sini.",
    },
    STUDENT: {
      icon: BookOpen,
      title: "Tidak ada pinjaman aktif 📚",
      description: "Saat ini kamu tidak meminjam buku apapun. Yuk, mulai pinjam!",
      primaryAction: { label: "Cari Buku", view: "catalog" },
    },
  },
  "no-overdue": {
    LIBRARIAN: {
      icon: BookOpen,
      title: "Tidak ada buku terlambat 🎉",
      description: "Semua anggota mengembalikan buku tepat waktu. Pertahankan!",
    },
  },
  "no-classmates": {
    STUDENT: {
      icon: Trophy,
      title: "Belum ada aktivitas teman sekelas",
      description: "Leaderboard teman sekelas akan muncul di sini setelah ada yang mulai membaca.",
    },
  },
  "no-reading-history": {
    TEACHER: {
      icon: BookOpen,
      title: "Belum ada riwayat baca",
      description: "Buku yang pernah Anda pinjam akan muncul di sini.",
    },
    STUDENT: {
      icon: BookOpen,
      title: "Belum ada riwayat baca 📖",
      description: "Mulai pinjam buku dan riwayat baca kamu akan tercatat di sini.",
      primaryAction: { label: "Cari Buku", view: "catalog" },
    },
  },
  "no-class-overview": {
    TEACHER: {
      icon: Search,
      title: "Belum ada data kelas",
      description: "Pantau aktivitas siswa di kelas yang Anda ajar di sini.",
    },
  },
  "no-top-members": {
    LIBRARIAN: {
      icon: Trophy,
      title: "Belum ada anggota yang aktif",
      description: "Daftar anggota paling aktif akan muncul setelah ada peminjaman.",
    },
  },
  "no-recent-loans": {
    LIBRARIAN: {
      icon: BookOpen,
      title: "Belum ada peminjaman",
      description: "Riwayat peminjaman 5 transaksi terakhir akan muncul di sini.",
    },
  },
  "no-stats": {
    LIBRARIAN: {
      icon: Search,
      title: "Belum ada data statistik",
      description: "Tambahkan buku dan anggota untuk mulai melihat statistik.",
    },
  },
};

export function RoleEmptyState({
  context,
  userRole,
  title,
  description,
  primaryActionLabel,
  primaryAction,
  secondaryAction,
  compact = false,
  className,
}: RoleEmptyStateProps) {
  // Cari content spesifik role, fallback ke TEACHER -> STUDENT -> LIBRARIAN
  const content =
    CONTENT[context]?.[userRole] ??
    CONTENT[context]?.STUDENT ??
    CONTENT[context]?.LIBRARIAN ??
    CONTENT[context]?.TEACHER;

  if (!content) {
    return (
      <div className={compact ? className : "p-6 text-center text-sm text-muted-foreground"}>
        Tidak ada data.
      </div>
    );
  }

  const Icon = content.icon;
  const finalTitle = title ?? content.title;
  const finalDescription = description ?? content.description;
  const contentPrimary = content.primaryAction
    ? {
        ...content.primaryAction,
        label: primaryActionLabel ?? content.primaryAction.label,
      }
    : undefined;

  const innerContent = (
    <div
      className="flex flex-col items-center justify-center py-10 text-center"
      role="status"
      aria-live="polite"
    >
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4"
        aria-hidden="true"
      >
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="font-semibold text-foreground">{finalTitle}</h3>
      {finalDescription && (
        <p className="text-sm text-muted-foreground mt-1.5 max-w-sm">
          {finalDescription}
        </p>
      )}
      {(contentPrimary || primaryAction || secondaryAction) && (
        <div className="flex items-center gap-2 mt-5 flex-wrap justify-center">
          {primaryAction && (
            <Button onClick={primaryAction.onClick} size="sm">
              {primaryAction.label}
              <ArrowRight className="h-3.5 w-3.5 ml-1" aria-hidden="true" />
            </Button>
          )}
          {!primaryAction && contentPrimary && (
            <PrimaryActionWithView action={contentPrimary} />
          )}
          {secondaryAction && (
            <Button onClick={secondaryAction.onClick} size="sm" variant="outline">
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );

  if (compact) {
    return <div className={className}>{innerContent}</div>;
  }

  return (
    <Card className={className}>
      <div className="flex justify-center">{innerContent}</div>
    </Card>
  );
}

/**
 * Komponen kecil yang handle CTA dengan `view` field via store.
 * Dipisah agar tree-shaking bekerja untuk RoleEmptyState.
 */
function PrimaryActionWithView({
  action,
}: {
  action: { label: string; view: ViewKey; params?: Record<string, string> };
}) {
  const setView = useAppStore((s) => s.setView);
  return (
    <Button
      onClick={() => setView(action.view, action.params)}
      size="sm"
    >
      {action.label}
      <ArrowRight className="h-3.5 w-3.5 ml-1" aria-hidden="true" />
    </Button>
  );
}
