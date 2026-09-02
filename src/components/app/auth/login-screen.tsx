"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  GraduationCap,
  Library,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  KeyRound,
  ArrowLeft,
} from "lucide-react";
import { Logo } from "@/components/app/logo";
import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import { Label } from "@/components/ui/form/label";
import { api, type CurrentUser } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";
import { toast } from "sonner";

interface DemoAccount {
  role: string;
  email: string;
  password: string;
}

const DEMO_ICONS: Record<string, { icon: typeof Library; desc: string; color: string }> = {
  Pustakawan: { icon: Library, desc: "Akses penuh kelola perpustakaan", color: "text-emerald-600" },
  Guru: { icon: GraduationCap, desc: "Pinjam & ajukan buku untuk kelas", color: "text-amber-600" },
  Siswa: { icon: BookOpen, desc: "Cari & pinjam buku, lihat kartu digital", color: "text-sky-600" },
};

type LoginMode = "LOGIN" | "2FA" | "FORGOT_PASSWORD";

interface TwoFactorResponse {
  status: "2FA_REQUIRED";
  tempToken: string;
  message: string;
}

function isTwoFactorResponse(x: unknown): x is TwoFactorResponse {
  return typeof x === "object" && x !== null && (x as any).status === "2FA_REQUIRED" && typeof (x as any).tempToken === "string";
}

export function LoginScreen() {
  const setUser = useAppStore((s) => s.setUser);
  const [mode, setMode] = useState<LoginMode>("LOGIN");

  // Demo accounts (fetched from API in development only)
  const [demoAccounts, setDemoAccounts] = useState<(DemoAccount & { icon: typeof Library; desc: string; color: string })[]>([]);

  useEffect(() => {
    fetch("/api/auth/demo-accounts")
      .then((r) => r.json())
      .then((data) => {
        const accounts = (data.accounts || []).map((acc: DemoAccount) => ({
          ...acc,
          ...DEMO_ICONS[acc.role],
        }));
        setDemoAccounts(accounts);
      })
      .catch(() => {});
  }, []);

  // Login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // 2FA state
  const [tempToken, setTempToken] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState("");

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email || !password) {
      toast.error("Mohon isi email dan password");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Login gagal");
      }

      const data = await res.json();

      // Cek 2FA
      if (isTwoFactorResponse(data)) {
        setTempToken(data.tempToken);
        setMode("2FA");
        toast.info("Masukkan kode 2FA dari authenticator app");
        return;
      }

      setUser(data as CurrentUser);
      toast.success(`Selamat datang, ${(data as CurrentUser).name}!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login gagal");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!twoFactorCode || twoFactorCode.length < 6) {
      toast.error("Masukkan kode 6 digit (atau backup code 8 karakter)");
      return;
    }
    setLoading(true);
    try {
      const user = await api.post<CurrentUser>("/api/auth/2fa/verify", {
        tempToken,
        code: twoFactorCode,
      });
      setUser(user);
      toast.success(`Selamat datang, ${user.name}!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verifikasi gagal");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!forgotEmail) {
      toast.error("Mohon masukkan email Anda");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/auth/forgot-password", { email: forgotEmail });
      toast.success("Jika email terdaftar, link reset telah dikirim. Cek inbox Anda.");
      setMode("LOGIN");
      setForgotEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengirim permintaan");
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
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
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

      {/* Panel Kanan - Form */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-md"
        >
          {mode === "LOGIN" && (
            <>
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
                      onClick={() => {
                        setForgotEmail(email);
                        setMode("FORGOT_PASSWORD");
                      }}
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

                <Button type="submit" size="lg" className="w-full h-11 text-base" disabled={loading}>
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
                {demoAccounts.map((acc) => {
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
            </>
          )}

          {mode === "2FA" && (
            <>
              <button
                type="button"
                onClick={() => {
                  setMode("LOGIN");
                  setTwoFactorCode("");
                  setTempToken("");
                }}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Kembali ke login
              </button>
              <div className="mb-8">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <KeyRound className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Verifikasi 2FA</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Masukkan kode 6 digit dari Google Authenticator / Authy, atau salah
                  satu backup code 8 karakter.
                </p>
              </div>

              <form onSubmit={handleVerify2FA} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="2fa-code">Kode Verifikasi</Label>
                  <Input
                    id="2fa-code"
                    type="text"
                    placeholder="123456 atau BACKUPCODE"
                    className="h-11 text-center text-lg font-mono tracking-widest"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
                    maxLength={9}
                    autoComplete="one-time-code"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    Kode TOTP berubah setiap 30 detik. Backup code hanya bisa dipakai sekali.
                  </p>
                </div>

                <Button type="submit" size="lg" className="w-full h-11 text-base" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Memverifikasi...
                    </>
                  ) : (
                    "Verifikasi"
                  )}
                </Button>
              </form>
            </>
          )}

          {mode === "FORGOT_PASSWORD" && (
            <>
              <button
                type="button"
                onClick={() => setMode("LOGIN")}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Kembali ke login
              </button>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-foreground">Lupa Password?</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Masukkan email Anda. Kami akan mengirim link untuk reset password.
                </p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="nama@jendelailmu.sch.id"
                      className="pl-10 h-11"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                </div>

                <Button type="submit" size="lg" className="w-full h-11 text-base" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Mengirim...
                    </>
                  ) : (
                    "Kirim Link Reset"
                  )}
                </Button>
              </form>

              <p className="mt-4 text-center text-xs text-muted-foreground">
                Link reset berlaku selama 1 jam. Cek folder spam jika tidak ada di inbox.
              </p>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
