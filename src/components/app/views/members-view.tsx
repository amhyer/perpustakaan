"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Users,
  GraduationCap,
  BookMarked,
  UserCheck,
  UserPlus,
  Search,
  Eye,
  Loader2,
  Filter,
  ShieldAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { PageHeader, EmptyState } from "@/components/app/shared/page-header";
import { StatCard } from "@/components/app/shared/stat-card";
import { Spinner } from "@/components/app/shared/loading";

import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";
import {
  ROLE_LABELS,
  ROLE_COLORS,
  MEMBER_STATUS_LABELS,
  type Role,
} from "@/lib/constants";

interface MemberListUser {
  email: string;
  role: string;
}
interface MemberListItem {
  id: string;
  memberNumber: string;
  fullName: string;
  category: string;
  status: string;
  gender: string | null;
  phone: string | null;
  address: string | null;
  photo: string | null;
  classGrade: string | null;
  joinDate: string;
  expiryDate: string | null;
  user: MemberListUser;
  _count: { loans: number };
}

interface StatsResponse {
  overview: {
    totalMembers: number;
    activeMembers: number;
    studentMembers: number;
    teacherMembers: number;
  };
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase();
}

function suggestMemberNumber(role: Role): string {
  const year = new Date().getFullYear();
  const prefix =
    role === "LIBRARIAN" ? "LIB" : role === "PUSTAKAWAN_JUNIOR" ? "PJR" : role === "TEACHER" ? "TCH" : "STD";
  const rand = Math.floor(Math.random() * 900 + 100);
  return `${prefix}-${year}-${rand}`;
}

interface AddFormState {
  email: string;
  password: string;
  name: string;
  fullName: string;
  memberNumber: string;
  role: Role;
  gender: string;
  phone: string;
  address: string;
  classGrade: string;
  birthDate: string;
  expiryDate: string;
}

const EMPTY_FORM: AddFormState = {
  email: "",
  password: "",
  name: "",
  fullName: "",
  memberNumber: "",
  role: "STUDENT",
  gender: "L",
  phone: "",
  address: "",
  classGrade: "",
  birthDate: "",
  expiryDate: "",
};

export function MembersView() {
  const user = useAppStore((s) => s.user);

  if (user?.role !== "LIBRARIAN" && user?.role !== "PUSTAKAWAN_JUNIOR") {
    return (
      <Card className="p-6">
        <EmptyState
          icon={ShieldAlert}
          title="Akses Ditolak"
          description="Halaman ini hanya tersedia untuk pustakawan."
        />
      </Card>
    );
  }

  return <MembersViewContent />;
}

function MembersViewContent() {
  const setView = useAppStore((s) => s.setView);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<AddFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const membersUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (category !== "all") params.set("category", category);
    if (status !== "all") params.set("status", status);
    const qs = params.toString();
    return `/api/members${qs ? `?${qs}` : ""}`;
  }, [search, category, status]);

  const { data: members, loading, error, refetch } = useFetch<MemberListItem[]>(
    membersUrl,
    { deps: [membersUrl] }
  );

  const { data: stats } = useFetch<StatsResponse>(`/api/stats`);
  const overview = stats?.overview;

  function openAddDialog() {
    const initialForm: AddFormState = {
      ...EMPTY_FORM,
      memberNumber: suggestMemberNumber("STUDENT"),
    };
    setForm(initialForm);
    setDialogOpen(true);
  }

  function updateField<K extends keyof AddFormState>(key: K, value: AddFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleRoleChange(role: Role) {
    setForm((prev) => ({
      ...prev,
      role,
      memberNumber: suggestMemberNumber(role),
    }));
  }

  async function handleSubmitAdd(e: React.FormEvent) {
    e.preventDefault();
    if (
      !form.email ||
      !form.password ||
      !form.name ||
      !form.fullName ||
      !form.memberNumber
    ) {
      toast.error("Email, password, nama, dan nomor anggota wajib diisi");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/api/members", {
        email: form.email,
        password: form.password,
        name: form.name,
        fullName: form.fullName,
        memberNumber: form.memberNumber,
        role: form.role,
        category: form.role,
        gender: form.gender || null,
        phone: form.phone || null,
        address: form.address || null,
        classGrade: form.classGrade || null,
        birthDate: form.birthDate || null,
        expiryDate: form.expiryDate || null,
      });
      toast.success("Anggota baru berhasil ditambahkan");
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menambah anggota";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Anggota"
        description="Kelola data anggota perpustakaan"
        icon={Users}
        actions={
          <Button onClick={openAddDialog} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Tambah Anggota
          </Button>
        }
      />

      {/* Statistik */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Anggota"
          value={overview?.totalMembers ?? "-"}
          icon={Users}
          color="bg-primary/10 text-primary"
        />
        <StatCard
          label="Siswa"
          value={overview?.studentMembers ?? "-"}
          icon={GraduationCap}
          color="bg-sky-100 text-sky-700"
        />
        <StatCard
          label="Guru"
          value={overview?.teacherMembers ?? "-"}
          icon={BookMarked}
          color="bg-amber-100 text-amber-700"
        />
        <StatCard
          label="Anggota Aktif"
          value={overview?.activeMembers ?? "-"}
          icon={UserCheck}
          color="bg-emerald-100 text-emerald-700"
        />
      </div>

      {/* Filter & Search */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama, nomor anggota, telepon, atau kelas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full sm:w-44 gap-2">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                <SelectItem value="LIBRARIAN">Pustakawan</SelectItem>
                <SelectItem value="TEACHER">Guru</SelectItem>
                <SelectItem value="STUDENT">Siswa</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="ACTIVE">Aktif</SelectItem>
                <SelectItem value="INACTIVE">Nonaktif</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Tabel Anggota */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-6">
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="h-10 w-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-1/3 rounded bg-muted" />
                    <div className="h-3 w-1/4 rounded bg-muted" />
                  </div>
                  <div className="h-6 w-20 rounded bg-muted" />
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="p-6">
            <EmptyState
              icon={Users}
              title="Gagal memuat data"
              description={error}
              action={{ label: "Coba lagi", onClick: refetch }}
            />
          </div>
        ) : !members || members.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Users}
              title="Belum ada anggota"
              description="Tambahkan anggota baru untuk mulai mengelola data perpustakaan."
              action={{ label: "Tambah Anggota", onClick: openAddDialog }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[220px]">Anggota</TableHead>
                  <TableHead className="min-w-[140px]">No. Anggota</TableHead>
                  <TableHead className="min-w-[120px]">Kategori</TableHead>
                  <TableHead className="min-w-[120px]">Kelas/Bidang</TableHead>
                  <TableHead className="min-w-[110px]">Status</TableHead>
                  <TableHead className="min-w-[90px] text-center">Pinjam</TableHead>
                  <TableHead className="min-w-[110px] text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                            {getInitials(m.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {m.fullName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {m.user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">
                        {m.memberNumber}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={ROLE_COLORS[m.category] ?? ""}
                      >
                        {ROLE_LABELS[m.category] ?? m.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-foreground">
                        {m.classGrade || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          m.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : "bg-zinc-100 text-zinc-600 border-zinc-200"
                        }
                      >
                        {MEMBER_STATUS_LABELS[m.status] ?? m.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-muted px-2 text-xs font-semibold text-foreground">
                        {m._count?.loans ?? 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => setView("member-detail", { id: m.id })}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Lihat Detail
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Dialog Tambah Anggota */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle>Tambah Anggota Baru</DialogTitle>
            <DialogDescription>
              Isi data anggota perpustakaan. Field bertanda * wajib diisi.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitAdd} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="add-email">Email *</Label>
                <Input
                  id="add-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="nama@jendelailmu.sch.id"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-password">Password *</Label>
                <Input
                  id="add-password"
                  type="text"
                  required
                  value={form.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  placeholder="Minimal 6 karakter"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-name">Nama Pendek *</Label>
                <Input
                  id="add-name"
                  required
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Budi"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-fullName">Nama Lengkap *</Label>
                <Input
                  id="add-fullName"
                  required
                  value={form.fullName}
                  onChange={(e) => updateField("fullName", e.target.value)}
                  placeholder="Budi Santoso"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-memberNumber">Nomor Anggota *</Label>
                <Input
                  id="add-memberNumber"
                  required
                  value={form.memberNumber}
                  onChange={(e) => updateField("memberNumber", e.target.value)}
                  placeholder="STD-2025-001"
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-role">Role / Kategori</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => handleRoleChange(v as Role)}
                >
                  <SelectTrigger id="add-role" className="w-full">
                    <SelectValue placeholder="Pilih role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LIBRARIAN">Pustakawan (Penuh)</SelectItem>
                    <SelectItem value="PUSTAKAWAN_JUNIOR">Pustakawan Junior</SelectItem>
                    <SelectItem value="TEACHER">Guru</SelectItem>
                    <SelectItem value="STUDENT">Siswa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-gender">Jenis Kelamin</Label>
                <Select
                  value={form.gender}
                  onValueChange={(v) => updateField("gender", v)}
                >
                  <SelectTrigger id="add-gender" className="w-full">
                    <SelectValue placeholder="Pilih jenis kelamin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">Laki-laki</SelectItem>
                    <SelectItem value="P">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-phone">Telepon</Label>
                <Input
                  id="add-phone"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="08xxxxxxxxxx"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-classGrade">Kelas / Bidang</Label>
                <Input
                  id="add-classGrade"
                  value={form.classGrade}
                  onChange={(e) => updateField("classGrade", e.target.value)}
                  placeholder={form.role === "STUDENT" ? "Kelas IX-A" : "Bahasa Indonesia"}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-birthDate">Tanggal Lahir</Label>
                <Input
                  id="add-birthDate"
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => updateField("birthDate", e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="add-expiryDate">Berlaku s/d</Label>
                <Input
                  id="add-expiryDate"
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) => updateField("expiryDate", e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="add-address">Alamat</Label>
                <Textarea
                  id="add-address"
                  value={form.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  placeholder="Alamat tempat tinggal"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                Batal
              </Button>
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? "Menyimpan..." : "Simpan Anggota"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
