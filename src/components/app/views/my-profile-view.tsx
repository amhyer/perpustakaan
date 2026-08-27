"use client";

import { useState, useEffect } from "react";
import {
  User,
  Save,
  Lock,
  Loader2,
  ShieldCheck,
  Mail,
  Hash,
  CalendarDays,
  GraduationCap,
  Settings,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/layout/card";
import { Input } from "@/components/ui/form/input";
import { Button } from "@/components/ui/form/button";
import { Label } from "@/components/ui/form/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/form/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/overlay/dialog";
import { PageHeader } from "@/components/app/shared/page-header";
import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";
import {
  ROLE_LABELS,
  formatDate,
} from "@/lib/constants";

interface MemberProfile {
  id: string;
  memberNumber: string;
  fullName: string;
  phone: string | null;
  address: string | null;
  photo: string | null;
  gender: string | null;
  birthDate: string | null;
  classGrade: string | null;
  taughtClasses?: string | null;
  category: string;
  status: string;
  expiryDate: string | null;
  userId: string;
  user: { id: string; email: string; role: string; name: string };
}

export function MyProfileView({ variant = "profile" }: { variant?: "profile" | "settings" }) {
  return <MyProfileContent variant={variant} />;
}

function MyProfileContent({ variant }: { variant: "profile" | "settings" }) {
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const isTeacher = user?.role === "TEACHER";
  const isSettings = variant === "settings";
  const pageTitle = isSettings ? "Pengaturan" : "Profil Saya";
  const pageDescription = isSettings
    ? "Kelola profil dan kelas yang Anda ajar"
    : "Kelola informasi akun Anda";
  const PageIcon = isSettings ? Settings : User;
  const { data: profile, loading, error, refetch } = useFetch<MemberProfile>(
    user?.member ? `/api/members/${user.member.id}` : null,
    { deps: [user?.member?.id] }
  );

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    address: "",
    gender: "",
    birthDate: "",
    classGrade: "",
    taughtClasses: "",
  });
  const [saving, setSaving] = useState(false);

  // Password change
  const [pwOpen, setPwOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", new: "", confirm: "" });
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        fullName: profile.fullName || "",
        phone: profile.phone || "",
        address: profile.address || "",
        gender: profile.gender || "",
        birthDate: profile.birthDate ? profile.birthDate.slice(0, 10) : "",
        classGrade: profile.classGrade || "",
        taughtClasses: profile.taughtClasses || "",
      });
    }
  }, [profile]);

  async function handleSave() {
    if (!profile) return;
    if (!form.fullName.trim()) {
      toast.error("Nama lengkap wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      await api.put(`/api/members/${profile.id}`, {
        fullName: form.fullName.trim(),
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        gender: form.gender || null,
        birthDate: form.birthDate || null,
        classGrade: form.classGrade.trim() || null,
        ...(isTeacher ? { taughtClasses: form.taughtClasses } : {}),
      });
      toast.success("Profil berhasil diperbarui.");
      if (user) {
        setUser({
          ...user,
          name: form.fullName.trim(),
          member: user.member
            ? {
                ...user.member,
                fullName: form.fullName.trim(),
                classGrade: form.classGrade.trim() || null,
                taughtClasses: isTeacher ? form.taughtClasses.trim() || null : user.member.taughtClasses,
              }
            : user.member,
        });
      }
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan profil");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    if (!pwForm.current || !pwForm.new) {
      toast.error("Semua field wajib diisi.");
      return;
    }
    if (pwForm.new.length < 6) {
      toast.error("Password baru minimal 6 karakter.");
      return;
    }
    if (pwForm.new !== pwForm.confirm) {
      toast.error("Konfirmasi password tidak cocok.");
      return;
    }
    setChangingPw(true);
    try {
      await api.put("/api/auth/change-password", {
        currentPassword: pwForm.current,
        newPassword: pwForm.new,
      });
      toast.success("Password berhasil diubah.");
      setPwOpen(false);
      setPwForm({ current: "", new: "", confirm: "" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengubah password");
    } finally {
      setChangingPw(false);
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title={pageTitle} description={pageDescription} icon={PageIcon} />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div>
        <PageHeader title={pageTitle} description={pageDescription} icon={PageIcon} />
        <Card className="p-6 text-center text-sm text-destructive">
          {error || "Gagal memuat data profil."}
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={pageTitle} description={pageDescription} icon={PageIcon} />

      {/* Account info (read-only) */}
      <Card className="p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold">Informasi Akun</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <div className="text-[11px] text-muted-foreground">Email</div>
              <div className="text-sm font-medium">{profile.user.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <div className="text-[11px] text-muted-foreground">No. Anggota</div>
              <div className="text-sm font-medium">{profile.memberNumber}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <GraduationCap className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <div className="text-[11px] text-muted-foreground">Kategori</div>
              <div className="text-sm font-medium">{ROLE_LABELS[profile.category] ?? profile.category}</div>
            </div>
          </div>
          {profile.expiryDate && (
            <div className="flex items-center gap-3">
              <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <div className="text-[11px] text-muted-foreground">Berlaku Hingga</div>
                <div className="text-sm font-medium">{formatDate(profile.expiryDate)}</div>
              </div>
            </div>
          )}
        </div>
        <div className="mt-4 pt-4 border-t">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setPwOpen(true)}>
            <Lock className="h-3.5 w-3.5" />
            Ubah Password
          </Button>
        </div>
      </Card>

      {/* Profile edit form */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold">Data Diri</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label htmlFor="fullName" className="text-xs">Nama Lengkap *</Label>
            <Input
              id="fullName"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="Nama lengkap"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="phone" className="text-xs">No. Telepon</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="08xxxxxxxxxx"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Jenis Kelamin</Label>
            <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Pilih" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">Laki-laki</SelectItem>
                <SelectItem value="FEMALE">Perempuan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="birthDate" className="text-xs">Tanggal Lahir</Label>
            <Input
              id="birthDate"
              type="date"
              value={form.birthDate}
              onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="classGrade" className="text-xs">
              {isTeacher ? "Mata Pelajaran" : "Kelas"}
            </Label>
            <Input
              id="classGrade"
              value={form.classGrade}
              onChange={(e) => setForm({ ...form, classGrade: e.target.value })}
              placeholder={isTeacher ? "contoh: Matematika" : "contoh: IX-A"}
              className="mt-1"
            />
          </div>
          {isTeacher && (
            <div className="sm:col-span-2">
              <Label htmlFor="taughtClasses" className="text-xs flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Kelas yang Diajar
              </Label>
              <Input
                id="taughtClasses"
                value={form.taughtClasses}
                onChange={(e) => setForm({ ...form, taughtClasses: e.target.value })}
                placeholder="contoh: IX-A, IX-B"
                className="mt-1"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Pisahkan dengan koma. Hanya siswa di kelas ini yang tampil di beranda Anda.
              </p>
            </div>
          )}
          <div className="sm:col-span-2">
            <Label htmlFor="address" className="text-xs">Alamat</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Alamat lengkap"
              className="mt-1"
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Simpan Perubahan
          </Button>
        </div>
      </Card>

      {/* Change password dialog */}
      <Dialog open={pwOpen} onOpenChange={(o) => { if (!o) setPwOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Ubah Password
            </DialogTitle>
            <DialogDescription>
              Masukkan password lama dan password baru Anda.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="pw-current" className="text-xs">Password Lama *</Label>
              <Input
                id="pw-current"
                type="password"
                value={pwForm.current}
                onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                placeholder="Masukkan password lama"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="pw-new" className="text-xs">Password Baru * (minimal 6 karakter)</Label>
              <Input
                id="pw-new"
                type="password"
                value={pwForm.new}
                onChange={(e) => setPwForm({ ...pwForm, new: e.target.value })}
                placeholder="Masukkan password baru"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="pw-confirm" className="text-xs">Konfirmasi Password Baru *</Label>
              <Input
                id="pw-confirm"
                type="password"
                value={pwForm.confirm}
                onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                placeholder="Ulangi password baru"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwOpen(false)} disabled={changingPw}>
              Batal
            </Button>
            <Button onClick={handleChangePassword} disabled={changingPw} className="gap-1.5">
              {changingPw ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Ubah Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
