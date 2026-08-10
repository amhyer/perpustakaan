"use client";

import { forwardRef } from "react";
import { QrCode } from "@/components/app/shared/qr-code";
import { Logo } from "@/components/app/logo";
import { formatDate, HEAD_LIBRARIAN_NAME, LIBRARY_NAME, LIBRARY_TAGLINE } from "@/lib/constants";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface MemberCardData {
  id: string;
  memberNumber: string;
  fullName: string;
  category: string;
  photo: string | null;
  classGrade: string | null;
  joinDate: string | Date;
  expiryDate: string | Date | null;
  gender?: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  LIBRARIAN: "Pustakawan",
  TEACHER: "Guru",
  STUDENT: "Siswa",
};

const CATEGORY_COLORS: Record<string, string> = {
  LIBRARIAN: "from-emerald-600 to-emerald-800",
  TEACHER: "from-amber-600 to-amber-800",
  STUDENT: "from-sky-700 to-blue-900",
};

export const MemberCardPrint = forwardRef<HTMLDivElement, { member: MemberCardData; single?: boolean }>(
  ({ member, single = true }, ref) => {
    const qrValue = JSON.stringify({
      t: "JENDela-ILMU-MEMBER",
      id: member.id,
      no: member.memberNumber,
      name: member.fullName,
      cat: member.category,
    });
    const gradient = CATEGORY_COLORS[member.category] ?? "from-blue-700 to-blue-900";
    const initials = member.fullName
      .split(" ")
      .slice(0, 2)
      .map((w) => w.charAt(0))
      .join("")
      .toUpperCase();

    return (
      <div ref={ref} className={single ? "print-area" : "print-area"}>
        <div
          className={`relative w-[340px] h-[210px] rounded-2xl overflow-hidden shadow-xl bg-gradient-to-br ${gradient} text-white`}
        >
          {/* Pola dekoratif */}
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/10 blur-xl" />

          {/* Header */}
          <div className="relative z-10 px-4 pt-3 pb-2 flex items-center justify-between border-b border-white/20">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 48 48" className="h-7 w-7" fill="none">
                <rect x="6" y="4" width="36" height="32" rx="3" stroke="white" strokeWidth="2.5" />
                <line x1="24" y1="4" x2="24" y2="36" stroke="white" strokeWidth="2.5" />
                <line x1="6" y1="20" x2="42" y2="20" stroke="white" strokeWidth="2.5" />
                <path d="M8 40 Q8 37 11 37 L37 37 Q40 37 40 40 L40 44 Q40 42 37 42 L11 42 Q8 42 8 44 Z" fill="white" opacity="0.95" />
              </svg>
              <div className="leading-none">
                <div className="text-[11px] font-bold">{LIBRARY_NAME}</div>
                <div className="text-[7px] text-white/70">{LIBRARY_TAGLINE}</div>
              </div>
            </div>
            <div className="text-[8px] font-semibold uppercase tracking-wider bg-white/15 px-2 py-0.5 rounded-full">
              {CATEGORY_LABELS[member.category] ?? member.category}
            </div>
          </div>

          {/* Body */}
          <div className="relative z-10 px-4 py-3 flex gap-3">
            {/* Foto */}
            <div className="shrink-0">
              <Avatar className="h-16 w-16 rounded-lg border-2 border-white/40">
                <AvatarFallback className="rounded-lg bg-white/20 text-white font-bold text-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="text-[8px] text-white/60 uppercase tracking-wide">Nama Anggota</div>
              <div className="text-sm font-bold leading-tight truncate">{member.fullName}</div>
              <div className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5">
                <div>
                  <div className="text-[7px] text-white/60 uppercase">No. Induk</div>
                  <div className="text-[10px] font-semibold font-mono">{member.memberNumber}</div>
                </div>
                <div>
                  <div className="text-[7px] text-white/60 uppercase">
                    {member.category === "STUDENT" ? "Kelas" : "Bidang"}
                  </div>
                  <div className="text-[10px] font-semibold">{member.classGrade || "-"}</div>
                </div>
                <div>
                  <div className="text-[7px] text-white/60 uppercase">Berlaku s/d</div>
                  <div className="text-[10px] font-semibold">
                    {member.expiryDate ? formatDate(member.expiryDate) : "Tanpa batas"}
                  </div>
                </div>
                <div>
                  <div className="text-[7px] text-white/60 uppercase">Bergabung</div>
                  <div className="text-[10px] font-semibold">{formatDate(member.joinDate)}</div>
                </div>
              </div>
            </div>

            {/* QR */}
            <div className="shrink-0 bg-white p-1 rounded-md">
              <QrCode value={qrValue} size={56} fgColor="#1e3a5f" />
            </div>
          </div>

          {/* Footer tanda tangan */}
          <div className="absolute bottom-0 left-0 right-0 px-4 py-1.5 bg-black/20 backdrop-blur-sm flex items-center justify-between">
            <div className="text-[7px] text-white/70">
              Kartu ini sah digunakan untuk transaksi perpustakaan
            </div>
            <div className="text-right">
              <div className="text-[6px] text-white/60 uppercase">Kepala Perpustakaan</div>
              <div className="text-[9px] font-semibold italic" style={{ fontFamily: "Georgia, serif" }}>
                {HEAD_LIBRARIAN_NAME}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

MemberCardPrint.displayName = "MemberCardPrint";
