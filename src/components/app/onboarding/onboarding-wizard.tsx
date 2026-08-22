"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Users,
  Calendar,
  BarChart3,
  Settings,
  Check,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  Shield,
  Bell,
  Building2,
  Award,
  PartyPopper,
} from "lucide-react";
import { Button } from "@/components/ui/form/button";
import { Card, CardContent } from "@/components/ui/layout/card";
import { useAppStore } from "@/store/use-app-store";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  category: "intro" | "feature" | "setup" | "done";
  estimatedTime: string;
  action?: {
    label: string;
    view?: string;
  };
}

const STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Selamat Datang di Jendela Ilmu!",
    description:
      "Sistem manajemen perpustakaan modern yang akan membantu Anda mengelola koleksi, anggota, dan sirkulasi dengan mudah. Mari kita mulai tur singkat untuk mengenal fitur-fitur utamanya.",
    icon: PartyPopper,
    color: "bg-gradient-to-br from-amber-400 to-orange-500",
    category: "intro",
    estimatedTime: "1 menit",
  },
  {
    id: "catalog",
    title: "Kelola Koleksi Buku",
    description:
      "Tambah buku, kategorikan, dan atur lokasi rak. Anda bisa mengimpor dari SIBI atau memasukkan satu per satu. Setiap buku bisa punya banyak eksemplar fisik.",
    icon: BookOpen,
    color: "bg-gradient-to-br from-sky-400 to-blue-500",
    category: "feature",
    estimatedTime: "5 menit",
    action: { label: "Buka Katalog", view: "catalog" },
  },
  {
    id: "members",
    title: "Daftarkan Anggota",
    description:
      "Import sekaligus dari CSV atau tambah satu per satu. Sistem akan otomatis generate kartu anggota digital dengan QR code. Bisa juga kirim email/WhatsApp selamat datang.",
    icon: Users,
    color: "bg-gradient-to-br from-emerald-400 to-green-500",
    category: "feature",
    estimatedTime: "3 menit",
    action: { label: "Buka Manajemen Anggota", view: "members" },
  },
  {
    id: "circulation",
    title: "Sirkulasi & Peminjaman",
    description:
      "Scan barcode atau cari manual untuk pinjam/kembalikan buku. Sistem otomatis hitung denda keterlambatan, support perpanjangan, reservasi, dan notifikasi WhatsApp.",
    icon: Calendar,
    color: "bg-gradient-to-br from-violet-400 to-purple-500",
    category: "feature",
    estimatedTime: "4 menit",
    action: { label: "Buka Sirkulasi", view: "circulation" },
  },
  {
    id: "rooms",
    title: "Manajemen Ruangan & Aset",
    description:
      "Sekolah punya ruang baca atau diskusi? Izinkan anggota booking ruangan. Kelola juga proyektor, laptop, dan aset non-buku lainnya dengan tracking otomatis.",
    icon: Building2,
    color: "bg-gradient-to-br from-rose-400 to-pink-500",
    category: "feature",
    estimatedTime: "2 menit",
    action: { label: "Lihat Ruangan", view: "rooms" },
  },
  {
    id: "reports",
    title: "Laporan & Dashboard",
    description:
      "Pantau aktivitas perpustakaan via dashboard. Lihat buku terpopuler, anggota paling aktif, statistik kunjungan, dan laporan lainnya. Export ke CSV atau PDF siap cetak.",
    icon: BarChart3,
    color: "bg-gradient-to-br from-cyan-400 to-teal-500",
    category: "feature",
    estimatedTime: "2 menit",
    action: { label: "Buka Laporan", view: "reports" },
  },
  {
    id: "notifications",
    title: "Notifikasi Otomatis",
    description:
      "Aktifkan email & WhatsApp untuk kirim reminder jatuh tempo, notifikasi keterlambatan, dan pengumuman. Pengaturan ada di Settings → Channel Notifikasi.",
    icon: Bell,
    color: "bg-gradient-to-br from-yellow-400 to-amber-500",
    category: "setup",
    estimatedTime: "3 menit",
  },
  {
    id: "security",
    title: "Aktifkan 2FA",
    description:
      "Tingkatkan keamanan akun Anda dengan Two-Factor Authentication. Scan QR code dengan Google Authenticator. Backup codes akan ditampilkan sekali — simpan baik-baik!",
    icon: Shield,
    color: "bg-gradient-to-br from-red-400 to-rose-500",
    category: "setup",
    estimatedTime: "2 menit",
    action: { label: "Buka Pengaturan", view: "settings" },
  },
  {
    id: "gamification",
    title: "Gamifikasi untuk Siswa",
    description:
      "Siswa bisa set target baca tahunan, dapat badge, dan masuk leaderboard. Meningkatkan motivasi membaca dengan cara yang menyenangkan.",
    icon: Award,
    color: "bg-gradient-to-br from-indigo-400 to-blue-500",
    category: "feature",
    estimatedTime: "1 menit",
  },
  {
    id: "done",
    title: "Anda Siap Mengelola Perpustakaan!",
    description:
      "Anda sudah mengenal fitur-fitur utama. Mulai tambahkan koleksi dan anggota, lalu biarkan sistem bekerja untuk Anda. Selamat bertugas! 📚",
    icon: Sparkles,
    color: "bg-gradient-to-br from-emerald-500 to-teal-600",
    category: "done",
    estimatedTime: "Selesai!",
  },
];

const STORAGE_KEY = "onboarding:completed";
const STORAGE_KEY_STEP = "onboarding:step";

export function OnboardingWizard() {
  const user = useAppStore((s) => s.user);
  const setView = useAppStore((s) => s.setView);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check apakah user adalah pustakawan & belum completed
    const isLibrarian = user?.role === "LIBRARIAN" || user?.role === "PUSTAKAWAN_JUNIOR";
    const completed = localStorage.getItem(STORAGE_KEY);
    const savedStep = parseInt(localStorage.getItem(STORAGE_KEY_STEP) || "0");

    if (isLibrarian && !completed) {
      setStep(savedStep);
      setOpen(true);
    }
  }, [user]);

  // Save progress
  useEffect(() => {
    if (open) {
      localStorage.setItem(STORAGE_KEY_STEP, String(step));
    }
  }, [step, open]);

  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;
  const progress = ((step + 1) / STEPS.length) * 100;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }
  };

  const handlePrev = () => {
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setOpen(false);
    toast.success("Onboarding selesai! Selamat datang di Jendela Ilmu 🎉");
  };

  const handleAction = () => {
    if (currentStep.action?.view) {
      setView(currentStep.action.view as any);
      setOpen(false);
      // Don't mark complete — user can resume later
    }
  };

  if (!open || !user) return null;

  const Icon = currentStep.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={handleSkip}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl"
        >
          <Card className="overflow-hidden">
            {/* Progress bar */}
            <div className="h-1 bg-muted">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>

            <button
              onClick={handleSkip}
              className="absolute top-3 right-3 p-2 rounded-full hover:bg-muted text-muted-foreground z-10"
              aria-label="Lewati on-boarding"
            >
              <X className="h-4 w-4" />
            </button>

            <CardContent className="p-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="p-8"
                >
                  {/* Icon header */}
                  <div className={`inline-flex h-20 w-20 items-center justify-center rounded-2xl ${currentStep.color} text-white shadow-lg mb-4`}>
                    <Icon className="h-10 w-10" />
                  </div>

                  {/* Category badge */}
                  {currentStep.category !== "intro" && currentStep.category !== "done" && (
                    <div className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {currentStep.category === "feature" ? "Fitur" : "Setup"}
                    </div>
                  )}

                  <h2 className="text-2xl font-bold text-foreground mb-3">
                    {currentStep.title}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed mb-6">
                    {currentStep.description}
                  </p>

                  {/* Meta info */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-6">
                    <div className="flex items-center gap-1.5">
                      <span>⏱ {currentStep.estimatedTime}</span>
                    </div>
                    <div>
                      Langkah {step + 1} dari {STEPS.length}
                    </div>
                  </div>

                  {/* Action button */}
                  {currentStep.action && (
                    <Button
                      onClick={handleAction}
                      variant="outline"
                      className="mb-4 gap-2"
                    >
                      {currentStep.action.label}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                </motion.div>
              </AnimatePresence>
            </CardContent>

            {/* Footer navigation */}
            <div className="border-t bg-muted/30 px-8 py-4 flex items-center justify-between">
              <Button
                onClick={handlePrev}
                disabled={step === 0}
                variant="ghost"
                size="sm"
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Sebelumnya
              </Button>

              <div className="flex items-center gap-1">
                {STEPS.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setStep(idx)}
                    className={`h-2 rounded-full transition-all ${
                      idx === step
                        ? "w-8 bg-primary"
                        : idx < step
                        ? "w-2 bg-primary/50"
                        : "w-2 bg-muted-foreground/20"
                    }`}
                    aria-label={`Ke langkah ${idx + 1}`}
                  />
                ))}
              </div>

              <Button onClick={handleNext} size="sm" className="gap-2">
                {isLastStep ? (
                  <>
                    <Check className="h-4 w-4" />
                    Selesai
                  </>
                ) : (
                  <>
                    Lanjut
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Hook untuk reset onboarding (untuk testing atau "tampilkan ulang" dari settings)
 */
export function useOnboarding() {
  return {
    isCompleted: () =>
      typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "true",
    reset: () => {
      if (typeof window === "undefined") return;
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY_STEP);
    },
    start: () => {
      if (typeof window === "undefined") return;
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(STORAGE_KEY_STEP, "0");
    },
  };
}
