"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Users,
  Printer,
  Pencil,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  IdCard,
  GraduationCap,
  Power,
  BookOpen,
  Clock,
  RotateCw,
} from "lucide-react";

import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import { Label } from "@/components/ui/form/label";
import { Badge } from "@/components/ui/data-display/badge";
import { Card } from "@/components/ui/layout/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/overlay/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/data-display/avatar";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/disclosure/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/data-display/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/overlay/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/form/select";
import { Textarea } from "@/components/ui/form/textarea";

import { PageHeader, EmptyState } from "@/components/app/shared/page-header";
import { Spinner } from "@/components/app/shared/loading";
import { MemberCardPrint, type PrintSide } from "@/components/app/shared/member-card-print";

import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";
import {
  ROLE_LABELS,
  ROLE_COLORS,
  MEMBER_STATUS_LABELS,
  LOAN_STATUS_LABELS,
  LOAN_STATUS_COLORS,
  formatDate,
  formatRupiah,
} from "@/lib/constants";

interface MemberUser {
  id: string;
  email: string;
  role: string;
  name: string | null;
}
interface MemberLoanBookItem {
  book: {
    id: string;
    title: string;
    author: string;
    coverColor: string | null;
    coverImage: string | null;
  };
}
interface MemberLoan {
  id: string;
  loanDate: string;
  dueDate: string;
  returnDate: string | null;
  status: string;
  fineAmount: number;
  finePaid: boolean;
  renewedCount: number;
  bookItem: MemberLoanBookItem;
}
interface MemberDetail {
  id: string;
  memberNumber: string;
  fullName: string;
  category: string;
  status: string;
  gender: string | null;
  birthDate: string | null;
  phone: string | null;
  address: string | null;
  photo: string | null;
  classGrade: string | null;
  joinDate: string;
  expiryDate: string | null;
  user: MemberUser;
  loans: MemberLoan[];
  _count: { loans: number; reservations: number };
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

function toInputDate(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

interface EditForm {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  classGrade: string;
  gender: string;
  birthDate: string;
  expiryDate: string;
  category: string;
}

export function MemberDetailView({ memberId }: { memberId: string }) {
  const setView = useAppStore((s) => s.setView);
  const { data: member, loading, error, refetch } = useFetch<MemberDetail>(
    `/api/members/${memberId}`
  );
  const { data: settings } = useFetch<Record<string, string>>(`/api/settings`);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [pwdOpen, setPwdOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [pwdSubmitting, setPwdSubmitting] = useState(false);

  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [cardShowBack, setCardShowBack] = useState(false);
  const [cardPrintSide, setCardPrintSide] = useState<PrintSide>("front");

  function openEditDialog() {
    if (!member) return;
    setEditForm({
      fullName: member.fullName,
      email: member.user.email,
      phone: member.phone ?? "",
      address: member.address ?? "",
      classGrade: member.classGrade ?? "",
      gender: member.gender ?? "L",
      birthDate: toInputDate(member.birthDate),
      expiryDate: toInputDate(member.expiryDate),
      category: member.category,
    });
    setEditOpen(true);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!member || !editForm) return;
    setEditSubmitting(true);
    try {
      await api.put(`/api/members/${member.id}`, {
        fullName: editForm.fullName,
        email: editForm.email,
        phone: editForm.phone || null,
        address: editForm.address || null,
        classGrade: editForm.classGrade || null,
        gender: editForm.gender || null,
        birthDate: editForm.birthDate || null,
        expiryDate: editForm.expiryDate || null,
        category: editForm.category,
      });
      toast.success("Data anggota berhasil diperbarui");
      setEditOpen(false);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui data");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!member) return;
    if (newPassword.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }
    setPwdSubmitting(true);
    try {
      await api.put(`/api/members/${member.id}`, { password: newPassword });
      toast.success("Password berhasil direset");
      setPwdOpen(false);
      setNewPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal reset password");
    } finally {
      setPwdSubmitting(false);
    }
  }

  async function handleToggleStatus() {
    if (!member) return;
    const next = member.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setStatusSubmitting(true);
    try {
      await api.put(`/api/members/${member.id}`, { status: next });
      toast.success(
        next === "ACTIVE"
          ? "Anggota diaktifkan kembali"
          : "Anggota dinonaktifkan"
      );
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah status");
    } finally {
      setStatusSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => setView("members")}
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Daftar Anggota
        </Button>
        <Spinner />
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => setView("members")}
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Daftar Anggota
        </Button>
        <EmptyState
          icon={Users}
          title="Anggota tidak ditemukan"
          description={error ?? "Data anggota tidak dapat dimuat"}
          action={{ label: "Kembali", onClick: () => setView("members") }}
        />
      </div>
    );
  }

  const role = member.user.role;
  const initials = getInitials(member.fullName);

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 -ml-2"
        onClick={() => setView("members")}
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Daftar Anggota
      </Button>

      <PageHeader
        title={member.fullName}
        description={member.user.email}
        icon={Users}
        actions={
          <Button
            onClick={() => window.print()}
            className="gap-2 no-print"
          >
            <Printer className="h-4 w-4" />
            Cetak Kartu
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="font-mono">
          {member.memberNumber}
        </Badge>
        <Badge variant="outline" className={ROLE_COLORS[role] ?? ""}>
          {ROLE_LABELS[role] ?? role}
        </Badge>
        <Badge
          variant="outline"
          className={
            member.status === "ACTIVE"
              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
              : "bg-zinc-100 text-zinc-600 border-zinc-200"
          }
        >
          {MEMBER_STATUS_LABELS[member.status] ?? member.status}
        </Badge>
      </div>

      <Tabs defaultValue="profil" className="w-full">
        <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:flex">
          <TabsTrigger value="profil" className="gap-1.5">
            <IdCard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Profil</span>
          </TabsTrigger>
          <TabsTrigger value="riwayat" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Riwayat Pinjam</span>
          </TabsTrigger>
          <TabsTrigger value="kartu" className="gap-1.5">
            <IdCard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Kartu Anggota</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB PROFIL */}
        <TabsContent value="profil">
          <Card className="p-6">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex flex-col items-center gap-3 sm:w-44">
                <Avatar className="h-32 w-32 rounded-2xl border-4 border-background shadow-md">
                  {member.photo ? (
                    <AvatarImage src={member.photo} alt={member.fullName} />
                  ) : null}
                  <AvatarFallback className="rounded-2xl bg-primary/10 text-primary text-3xl font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <Badge variant="outline" className={ROLE_COLORS[role] ?? ""}>
                  {ROLE_LABELS[role] ?? role}
                </Badge>
              </div>

              <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <InfoItem
                  icon={IdCard}
                  label="Nomor Anggota"
                  value={
                    <span className="font-mono">{member.memberNumber}</span>
                  }
                />
                <InfoItem
                  icon={Mail}
                  label="Email"
                  value={member.user.email}
                />
                <InfoItem
                  icon={Power}
                  label="Status"
                  value={
                    <Badge
                      variant="outline"
                      className={
                        member.status === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                          : "bg-zinc-100 text-zinc-600 border-zinc-200"
                      }
                    >
                      {MEMBER_STATUS_LABELS[member.status] ?? member.status}
                    </Badge>
                  }
                />
                <InfoItem
                  icon={Users}
                  label="Jenis Kelamin"
                  value={
                    member.gender === "P" ? "Perempuan" : "Laki-laki"
                  }
                />
                <InfoItem
                  icon={Calendar}
                  label="Tanggal Lahir"
                  value={
                    member.birthDate ? formatDate(member.birthDate) : "-"
                  }
                />
                <InfoItem
                  icon={GraduationCap}
                  label="Kelas / Bidang"
                  value={member.classGrade || "-"}
                />
                <InfoItem
                  icon={Phone}
                  label="Telepon"
                  value={member.phone || "-"}
                />
                <InfoItem
                  icon={Calendar}
                  label="Bergabung"
                  value={formatDate(member.joinDate)}
                />
                <InfoItem
                  icon={Calendar}
                  label="Berlaku s/d"
                  value={
                    member.expiryDate
                      ? formatDate(member.expiryDate)
                      : "Tanpa batas"
                  }
                />
                <InfoItem
                  icon={BookOpen}
                  label="Total Peminjaman"
                  value={`${member._count?.loans ?? 0} buku`}
                />
                <div className="sm:col-span-2">
                  <InfoItem
                    icon={MapPin}
                    label="Alamat"
                    value={member.address || "-"}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 border-t pt-6 no-print">
              <Button
                variant="default"
                className="gap-2"
                onClick={openEditDialog}
              >
                <Pencil className="h-4 w-4" />
                Edit Data
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setPwdOpen(true)}
              >
                <KeyRound className="h-4 w-4" />
                Reset Password
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant={member.status === "ACTIVE" ? "destructive" : "default"}
                    className="gap-2"
                    disabled={statusSubmitting}
                  >
                    {statusSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Power className="h-4 w-4" />
                    )}
                    {member.status === "ACTIVE"
                      ? "Nonaktifkan"
                      : "Aktifkan Kembali"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {member.status === "ACTIVE" ? "Nonaktifkan Anggota?" : "Aktifkan Kembali Anggota?"}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {member.status === "ACTIVE"
                        ? `Anggota "${member.fullName}" tidak akan bisa login atau meminjam buku setelah dinonaktifkan. Anda bisa mengaktifkan kembali nanti.`
                        : `Anggota "${member.fullName}" akan bisa login dan meminjam buku lagi setelah diaktifkan.`}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={statusSubmitting}
                      onClick={(e) => {
                        e.preventDefault();
                        handleToggleStatus();
                      }}
                      className={member.status === "ACTIVE" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
                    >
                      {statusSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                      {member.status === "ACTIVE" ? "Ya, Nonaktifkan" : "Ya, Aktifkan"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </Card>
        </TabsContent>

        {/* TAB RIWAYAT PEMINJAMAN */}
        <TabsContent value="riwayat">
          <Card className="p-0 overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-foreground">
                  Riwayat Peminjaman
                </h3>
              </div>
              <Badge variant="secondary">
                {member.loans?.length ?? 0} transaksi
              </Badge>
            </div>
            {!member.loans || member.loans.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={BookOpen}
                  title="Belum ada riwayat"
                  description="Anggota ini belum pernah melakukan peminjaman."
                />
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto scrollbar-thin">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead className="min-w-[220px]">Judul Buku</TableHead>
                      <TableHead className="min-w-[110px]">Tgl Pinjam</TableHead>
                      <TableHead className="min-w-[110px]">Jatuh Tempo</TableHead>
                      <TableHead className="min-w-[110px]">Dikembalikan</TableHead>
                      <TableHead className="min-w-[100px]">Status</TableHead>
                      <TableHead className="min-w-[110px] text-right">Denda</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {member.loans.map((loan) => (
                      <TableRow key={loan.id}>
                        <TableCell>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate max-w-[260px]">
                              {loan.bookItem?.book?.title ?? "—"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate max-w-[260px]">
                              {loan.bookItem?.book?.author ?? ""}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(loan.loanDate)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(loan.dueDate)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {loan.returnDate ? (
                            formatDate(loan.returnDate)
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-600">
                              <Clock className="h-3 w-3" />
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={LOAN_STATUS_COLORS[loan.status] ?? ""}
                          >
                            {LOAN_STATUS_LABELS[loan.status] ?? loan.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {loan.fineAmount > 0 ? (
                            <span
                              className={
                                loan.finePaid
                                  ? "text-emerald-600 font-medium"
                                  : "text-destructive font-medium"
                              }
                            >
                              {formatRupiah(loan.fineAmount)}
                              <span className="block text-[10px] font-normal text-muted-foreground">
                                {loan.finePaid ? "Lunas" : "Belum bayar"}
                              </span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* TAB KARTU ANGGOTA */}
        <TabsContent value="kartu">
          <Card className="p-6">
            <div className="flex flex-col items-center gap-4">
              <MemberCardPrint
                member={member}
                headLibrarian={settings?.head_librarian}
                cardBackText={settings?.card_back_text}
                side={cardShowBack ? "back" : "front"}
              />
              <Button
                variant="outline"
                size="sm"
                className="gap-2 no-print"
                onClick={() => setCardShowBack(!cardShowBack)}
              >
                <RotateCw className="h-3.5 w-3.5" />
                {cardShowBack ? "Lihat Sisi Depan" : "Lihat Sisi Belakang"}
              </Button>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Kartu anggota resmi Perpustakaan {`Jendela Ilmu`}. Tunjukkan
                kartu ini saat transaksi di perpustakaan.
              </p>
              <div className="flex items-center gap-2 no-print">
                <Select value={cardPrintSide} onValueChange={(v) => setCardPrintSide(v as PrintSide)}>
                  <SelectTrigger className="h-9 w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="front">Depan saja</SelectItem>
                    <SelectItem value="back">Belakang saja</SelectItem>
                    <SelectItem value="both">Depan + Belakang</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => window.print()}
                  className="gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Cetak Kartu
                </Button>
              </div>
            </div>
          </Card>
          {/* Print area (hidden on screen) */}
          <div className="print-area hidden print:block">
            <MemberCardPrint
              member={member}
              headLibrarian={settings?.head_librarian}
              cardBackText={settings?.card_back_text}
              side={cardPrintSide}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* DIALOG EDIT */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle>Edit Data Anggota</DialogTitle>
            <DialogDescription>
              Perbarui informasi anggota. Perubahan akan disimpan ke basis data.
            </DialogDescription>
          </DialogHeader>
          {editForm && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-fullName">Nama Lengkap</Label>
                  <Input
                    id="edit-fullName"
                    value={editForm.fullName}
                    onChange={(e) =>
                      setEditForm({ ...editForm, fullName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm({ ...editForm, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-category">Kategori</Label>
                  <Select
                    value={editForm.category}
                    onValueChange={(v) =>
                      setEditForm({ ...editForm, category: v })
                    }
                  >
                    <SelectTrigger id="edit-category" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LIBRARIAN">Pustakawan</SelectItem>
                      <SelectItem value="TEACHER">Guru</SelectItem>
                      <SelectItem value="STUDENT">Siswa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-gender">Jenis Kelamin</Label>
                  <Select
                    value={editForm.gender}
                    onValueChange={(v) =>
                      setEditForm({ ...editForm, gender: v })
                    }
                  >
                    <SelectTrigger id="edit-gender" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L">Laki-laki</SelectItem>
                      <SelectItem value="P">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-phone">Telepon</Label>
                  <Input
                    id="edit-phone"
                    value={editForm.phone}
                    onChange={(e) =>
                      setEditForm({ ...editForm, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-classGrade">Kelas / Bidang</Label>
                  <Input
                    id="edit-classGrade"
                    value={editForm.classGrade}
                    onChange={(e) =>
                      setEditForm({ ...editForm, classGrade: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-birthDate">Tanggal Lahir</Label>
                  <Input
                    id="edit-birthDate"
                    type="date"
                    value={editForm.birthDate}
                    onChange={(e) =>
                      setEditForm({ ...editForm, birthDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-expiryDate">Berlaku s/d</Label>
                  <Input
                    id="edit-expiryDate"
                    type="date"
                    value={editForm.expiryDate}
                    onChange={(e) =>
                      setEditForm({ ...editForm, expiryDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="edit-address">Alamat</Label>
                  <Textarea
                    id="edit-address"
                    value={editForm.address}
                    onChange={(e) =>
                      setEditForm({ ...editForm, address: e.target.value })
                    }
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditOpen(false)}
                  disabled={editSubmitting}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={editSubmitting} className="gap-2">
                  {editSubmitting && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {editSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG RESET PASSWORD */}
      <Dialog open={pwdOpen} onOpenChange={setPwdOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password Anggota</DialogTitle>
            <DialogDescription>
              Masukkan password baru untuk {member.fullName}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-password">Password Baru</Label>
              <Input
                id="new-password"
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Password akan langsung aktif. Pastikan untuk menyampaikan ke
                anggota.
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPwdOpen(false)}
                disabled={pwdSubmitting}
              >
                Batal
              </Button>
              <Button type="submit" disabled={pwdSubmitting} className="gap-2">
                {pwdSubmitting && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {pwdSubmitting ? "Menyimpan..." : "Reset Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-foreground break-words">
        {value}
      </div>
    </div>
  );
}
