"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, GraduationCap, Library, Loader2, Lock, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { Logo } from "@/components/app/logo";
import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import { Label } from "@/components/ui/form/label";
import { api, type CurrentUser } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";
import { toast } from "sonner";

const DEMO_ACCOUNTS = [
  {
    role: "Pustakawan",
    icon: Library,
    email: "pustakawan@jendelailmu.sch.id",
    password: "password123",
    desc: "Akses penuh kelola perpustakaan",
    color: "text-emerald-600",
  },
  {
    role: "Guru",
    icon: GraduationCap,
    email: "budi@jendelailmu.sch.id",
    password: "password123",
    desc: "Pinjam & ajukan buku untuk kelas",
    color: "text-amber-600",
  },
  {
    role: "Siswa",
    icon: BookOpen,
    email: "andini@jendelailmu.sch.id",
    password: "password123",
    desc: "Cari & pinjam buku, lihat kartu digital",
    color: "text-sky-600",
  },
];

export function LoginScreen() {
  const setUser = useAppStore((s) => s.setUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email || !password) {
      toast.error("Mohon isi email dan password");
      return;
    }
    setLoading(true);
    try {
      const user = await api.post<CurrentUser>("/api/auth/login", { email, password });
      setUser(user);
      toast.success(`Selamat datang, ${user.name}!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login gagal");
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (acc: { email: string; password: string }) => {
    setEmail(acc.email);
    setPassword(acc.password);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Panel Kiri - Brand */}
      <div className="relative lg:w-1/2 bg-primary text-primary-foreground overflow-hidden flex flex-col justify-between p-8 lg:p-12">
        {/* Pola jendela dekoratif */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* Lingkaran dekoratif */}
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary-foreground/10 blur-2xl" />
        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />

        <div className="relative z-10">
          <Logo variant="light" />
        </div>

        <div className="relative z-10 max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1 text-xs font-medium backdrop-blur-sm mb-5">
              <Sparkles className="h-3.5 w-3.5" />
              Sistem Manajemen Perpustakaan Modern
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold leading-tight mb-3">
              Membuka Jendela Ilmu
              <br />
              untuk Semua
            </h1>
            <p className="text-primary-foreground/80 text-base leading-relaxed">
              Platform perpustakaan digital yang lengkap dan mudah digunakan untuk
              pustakawan, guru, maupun siswa. Terinspirasi dari SLiMS dengan tampilan
              yang jauh lebih modern.
            </p>
          </motion.div>

          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              { label: "Katalog Buku", value: "15+" },
              { label: "Anggota Aktif", value: "7" },
              { label: "Kategori", value: "8" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl bg-primary-foreground/10 backdrop-blur-sm px-3 py-3 text-center border border-primary-foreground/15"
              >
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-[11px] text-primary-foreground/70 mt-0.5">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-primary-foreground/60">
          &copy; {new Date().getFullYear()} Perpustakaan Jendela Ilmu. Dibuat dengan
          dedikasi untuk literasi.
        </div>
      </div>

      {/* Panel Kanan - Form Login */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-md"
        >
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Masuk ke Akun</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Selamat datang kembali! Silakan masuk untuk melanjutkan.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@jendelailmu.sch.id"
                  className="pl-10 h-11"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline font-medium"
                  onClick={() => toast.info("Hubungi pustakawan untuk reset password")}
                >
                  Lupa password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 h-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full h-11 text-base"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Memproses...
                </>
              ) : (
                "Masuk"
              )}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-3 text-muted-foreground font-medium">
                Coba akun demo cepat
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {DEMO_ACCOUNTS.map((acc) => {
              const Icon = acc.icon;
              return (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => quickFill(acc)}
                  className="w-full flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-all hover:border-primary/40 hover:shadow-sm hover:-translate-y-0.5 group"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                    <Icon className={`h-5 w-5 ${acc.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{acc.role}</span>
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{acc.desc}</div>
                  </div>
                  <div className="text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Isi →
                  </div>
                </button>
              );
            })}
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Klik salah satu akun di atas untuk mengisi otomatis, lalu tekan{" "}
            <span className="font-semibold text-foreground">Masuk</span>.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
