"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Printer,
  Users,
  Search,
  Loader2,
  CheckCircle2,
  X,
  Filter,
} from "lucide-react";

import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import { Badge } from "@/components/ui/data-display/badge";
import { Card } from "@/components/ui/layout/card";
import { Checkbox } from "@/components/ui/form/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/data-display/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/form/select";

import { PageHeader, EmptyState } from "@/components/app/shared/page-header";
import { MemberCardPrint, type PrintSide } from "@/components/app/shared/member-card-print";
import { useFetch } from "@/hooks/use-fetch";
import { useAppStore } from "@/store/use-app-store";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/constants";

interface BatchMemberUser {
  email: string;
  role: string;
}
interface BatchMember {
  id: string;
  memberNumber: string;
  fullName: string;
  category: string;
  status: string;
  gender: string | null;
  photo: string | null;
  classGrade: string | null;
  joinDate: string;
  expiryDate: string | null;
  user: BatchMemberUser;
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

export function BatchCardsView() {
  const user = useAppStore((s) => s.user);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [printing, setPrinting] = useState(false);
  const [batchPrintSide, setBatchPrintSide] = useState<PrintSide>("front");

  const membersUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (category !== "all") params.set("category", category);
    const qs = params.toString();
    return `/api/members${qs ? `?${qs}` : ""}`;
  }, [search, category]);

  const { data: settings } = useFetch<Record<string, string>>(`/api/settings`);
  const { data: members, loading, error, refetch } = useFetch<BatchMember[]>(
    membersUrl,
    { deps: [membersUrl] }
  );

  if (user?.role !== "LIBRARIAN" && user?.role !== "PUSTAKAWAN_JUNIOR") {
    return (
      <Card className="p-6">
        <EmptyState
          icon={Printer}
          title="Akses Ditolak"
          description="Halaman ini hanya tersedia untuk pustakawan."
        />
      </Card>
    );
  }

  const filtered = (members ?? []).filter((m) => m.status === "ACTIVE");
  const selectedMembers = filtered.filter((m) => selectedIds.has(m.id));

  function toggleMember(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelectedIds(new Set(filtered.map((m) => m.id)));
    toast.success(`${filtered.length} anggota dipilih`);
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function handlePrint() {
    if (selectedMembers.length === 0) {
      toast.error("Pilih minimal satu anggota untuk dicetak");
      return;
    }
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 300);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cetak Kartu Massal"
        description="Cetak beberapa kartu anggota sekaligus dalam satu halaman"
        icon={Printer}
        actions={
          <div className="flex items-center gap-2 no-print">
            <Select value={batchPrintSide} onValueChange={(v) => setBatchPrintSide(v as PrintSide)}>
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
              onClick={handlePrint}
              className="gap-2"
              disabled={selectedMembers.length === 0 || printing}
            >
              {printing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Printer className="h-4 w-4" />
              )}
              Cetak {selectedMembers.length > 0 ? `(${selectedMembers.length})` : ""}
            </Button>
          </div>
        }
      />

      {/* Filter & Search */}
      <Card className="p-4 no-print">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama atau nomor anggota..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Hapus pencarian"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full md:w-44 gap-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              <SelectItem value="LIBRARIAN">Pustakawan</SelectItem>
              <SelectItem value="PUSTAKAWAN_JUNIOR">Pustakawan Junior</SelectItem>
              <SelectItem value="TEACHER">Guru</SelectItem>
              <SelectItem value="STUDENT">Siswa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="secondary">
              {filtered.length} anggota aktif
            </Badge>
            {selectedIds.size > 0 && (
              <Badge className="bg-primary text-primary-foreground">
                {selectedIds.size} dipilih
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={selectAllVisible}
              disabled={filtered.length === 0}
            >
              <CheckCircle2 className="h-4 w-4" />
              Pilih Semua
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              disabled={selectedIds.size === 0}
            >
              Bersihkan
            </Button>
          </div>
        </div>
      </Card>

      {/* Members list */}
      {error ? (
        <Card className="p-6">
          <EmptyState
            icon={Users}
            title="Gagal memuat data"
            description={error}
            action={{ label: "Coba lagi", onClick: refetch }}
          />
        </Card>
      ) : loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={Users}
            title="Belum ada anggota aktif"
            description="Tambahkan anggota baru untuk mulai mencetak kartu."
          />
        </Card>
      ) : (
        <Card className="p-0 no-print overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto scrollbar-thin">
            <div className="divide-y">
              {filtered.map((m) => {
                const isSelected = selectedIds.has(m.id);
                return (
                  <label
                    key={m.id}
                    htmlFor={`batch-${m.id}`}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                      isSelected ? "bg-primary/5" : "hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox
                      id={`batch-${m.id}`}
                      checked={isSelected}
                      onCheckedChange={() => toggleMember(m.id)}
                    />
                    <Avatar className="h-10 w-10">
                      {m.photo ? <AvatarImage src={m.photo} alt={m.fullName} /> : null}
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {getInitials(m.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">
                        {m.fullName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        <span className="font-mono">{m.memberNumber}</span>
                        {m.classGrade ? ` · ${m.classGrade}` : ""}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={ROLE_COLORS[m.category] ?? ""}
                    >
                      {ROLE_LABELS[m.category] ?? m.category}
                    </Badge>
                  </label>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Print area: grid of MemberCardPrint */}
      {selectedMembers.length > 0 && (
        <div className="print-area hidden print:block">
          {batchPrintSide === "both" ? (
            <>
              {/* Cetak SEMUA sisi depan dulu */}
              <div className="grid grid-cols-2 gap-4 p-4">
                {selectedMembers.map((m) => (
                  <div key={`front-${m.id}`} style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                    <MemberCardPrint
                      member={m}
                      single={false}
                      headLibrarian={settings?.head_librarian}
                      cardBackText={settings?.card_back_text}
                      side="front"
                    />
                  </div>
                ))}
              </div>
              {/* Page break, baru SEMUA sisi belakang */}
              <div
                className="grid grid-cols-2 gap-4 p-4"
                style={{ breakBefore: "page", pageBreakBefore: "always" }}
              >
                {selectedMembers.map((m) => (
                  <div key={`back-${m.id}`} style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                    <MemberCardPrint
                      member={m}
                      single={false}
                      headLibrarian={settings?.head_librarian}
                      cardBackText={settings?.card_back_text}
                      side="back"
                    />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-4 p-4">
              {selectedMembers.map((m) => (
                <div key={m.id} style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                  <MemberCardPrint
                    member={m}
                    single={false}
                    headLibrarian={settings?.head_librarian}
                    cardBackText={settings?.card_back_text}
                    side={batchPrintSide}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
