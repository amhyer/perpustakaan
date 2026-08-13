"use client";

import {
  CreditCard,
  Printer,
  QrCode as QrCodeIcon,
  Hash,
  Users,
  CalendarPlus,
  CalendarClock,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { PageHeader, EmptyState } from "@/components/app/shared/page-header";
import { Spinner } from "@/components/app/shared/loading";
import { MemberCardPrint } from "@/components/app/shared/member-card-print";
import { QrCode } from "@/components/app/shared/qr-code";

import { useFetch } from "@/hooks/use-fetch";
import { useAppStore } from "@/store/use-app-store";
import {
  ROLE_LABELS,
  formatDate,
  LIBRARY_NAME,
} from "@/lib/constants";

interface MyCardUser {
  id: string;
  email: string;
  role: string;
  name: string | null;
}
interface MyCardMember {
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
  user: MyCardUser;
}

export function MyCardView() {
  const user = useAppStore((s) => s.user);

  const memberId = user?.member?.id ?? null;
  const { data: member, loading, error } = useFetch<MyCardMember>(
    memberId ? `/api/members/${memberId}` : null
  );
  const { data: settings } = useFetch<Record<string, string>>(`/api/settings`);

  if (!user || !user.member) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Kartu Anggota Digital"
          description="Tunjukkan kartu ini ke pustakawan untuk transaksi cepat"
          icon={CreditCard}
        />
        <EmptyState
          icon={CreditCard}
          title="Anda belum terdaftar sebagai anggota"
          description="Akun Anda belum dikaitkan dengan data anggota perpustakaan. Silakan hubungi pustakawan."
        />
      </div>
    );
  }

  const isActive = member?.status === "ACTIVE";
  const qrValue = member
    ? JSON.stringify({
        t: "JENDELA-ILMU-MEMBER",
        id: member.id,
        no: member.memberNumber,
        name: member.fullName,
        cat: member.category,
      })
    : "";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kartu Anggota Digital"
        description="Tunjukkan kartu ini ke pustakawan untuk transaksi cepat"
        icon={CreditCard}
        actions={
          <Button
            onClick={() => window.print()}
            className="gap-2 no-print"
            disabled={!member}
          >
            <Printer className="h-4 w-4" />
            Cetak Kartu
          </Button>
        }
      />

      {loading ? (
        <Spinner />
      ) : error || !member ? (
        <EmptyState
          icon={CreditCard}
          title="Gagal memuat kartu"
          description={error ?? "Data anggota tidak dapat dimuat"}
        />
      ) : (
        <div className="space-y-6">
          {/* Status aktif banner */}
          <div
            className={`no-print flex items-center gap-3 rounded-xl border px-4 py-3 ${
              isActive
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            {isActive ? (
              <ShieldCheck className="h-5 w-5 shrink-0" />
            ) : (
              <ShieldAlert className="h-5 w-5 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">
                {isActive
                  ? "Keanggotaan Anda Aktif"
                  : "Keanggotaan Anda Sedang Nonaktif"}
              </p>
              <p className="text-xs opacity-80">
                {isActive
                  ? "Kartu ini sah digunakan untuk seluruh transaksi perpustakaan."
                  : "Silakan hubungi pustakawan untuk mengaktifkan kembali keanggotaan."}
              </p>
            </div>
            <span className="relative flex h-3 w-3 shrink-0">
              {isActive && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              )}
              <span
                className={`relative inline-flex h-3 w-3 rounded-full ${
                  isActive ? "bg-emerald-600" : "bg-amber-500"
                }`}
              />
            </span>
          </div>

          {/* Kartu digital dengan glow */}
          <div className="no-print relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/5 via-primary/10 to-emerald-100/40 p-6 sm:p-10">
            <div
              className="absolute inset-0 opacity-50 bg-window-pattern"
              style={{ ["--pattern-color" as string]: "oklch(0.34 0.09 245 / 0.06)" }}
            />
            <div className="relative flex flex-col items-center gap-5">
              {/* Glow di belakang kartu */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[230px] w-[360px] rounded-full bg-primary/20 blur-3xl" />
              <div className="relative shadow-2xl shadow-primary/30 rounded-2xl">
                <MemberCardPrint member={member} headLibrarian={settings?.head_librarian} />
              </div>
              <p className="text-xs text-muted-foreground text-center max-w-sm">
                Kartu Anggota Perpustakaan {LIBRARY_NAME}
              </p>
            </div>
          </div>

          {/* QR Code besar + info scan */}
          <Card className="no-print p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="shrink-0 flex flex-col items-center gap-2">
                <div className="rounded-2xl border-2 border-primary/15 bg-white p-3 shadow-md">
                  <QrCode value={qrValue} size={200} fgColor="#1e3a5f" />
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                  <QrCodeIcon className="h-3.5 w-3.5" />
                  Kode Verifikasi
                </div>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="font-semibold text-foreground">
                  Scan QR ini di perpustakaan
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tunjukkan kode QR di atas ke pustakawan atau arahkan ke
                  pemindai di gerai layanan untuk verifikasi cepat tanpa perlu
                  mengetik nomor anggota.
                </p>
                <div className="mt-4 inline-flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                  <Smartphone className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-foreground">Simpan ke HP:</strong>{" "}
                    Screenshot kartu ini dan simpan di galeri HP Anda untuk akses
                    cepat.
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Info cards row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 no-print">
            <InfoTile
              icon={Hash}
              label="Nomor Anggota"
              value={
                <span className="font-mono">{member.memberNumber}</span>
              }
            />
            <InfoTile
              icon={Users}
              label="Kategori"
              value={ROLE_LABELS[member.category] ?? member.category}
            />
            <InfoTile
              icon={CalendarPlus}
              label="Bergabung"
              value={formatDate(member.joinDate)}
            />
            <InfoTile
              icon={CalendarClock}
              label="Berlaku s/d"
              value={
                member.expiryDate
                  ? formatDate(member.expiryDate)
                  : "Tanpa batas"
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-foreground break-words">
        {value}
      </div>
    </Card>
  );
}
