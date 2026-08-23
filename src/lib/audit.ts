import { db } from "@/lib/db";

export const AUDIT_ACTIONS = {
  LOAN_CREATE: "Peminjaman",
  LOAN_RETURN: "Pengembalian",
  LOAN_RENEW: "Perpanjangan",
  LOAN_DELETE: "Hapus Peminjaman",
  FINE_PAY: "Pembayaran Denda",
  RESERVATION_CREATE: "Reservasi",
  RESERVATION_FULFILL: "Reservasi Diambil",
  RESERVATION_CANCEL: "Reservasi Dibatalkan",
  MEMBER_CREATE: "Anggota Baru",
  MEMBER_UPDATE: "Update Anggota",
  MEMBER_DEACTIVATE: "Nonaktifkan Anggota",
  MEMBER_IMPORT: "Import Anggota",
  BOOK_CREATE: "Buku Baru",
  BOOK_UPDATE: "Update Buku",
  BOOK_DELETE: "Hapus Buku",
  BOOK_IMPORT: "Import Buku",
  PROPOSAL_CREATE: "Usulan Buku",
  PROPOSAL_REVIEW: "Review Usulan",
  SETTING_CHANGE: "Ubah Pengaturan",
  ANNOUNCEMENT_CREATE: "Pengumuman Baru",
  ANNOUNCEMENT_UPDATE: "Update Pengumuman",
  ANNOUNCEMENT_DELETE: "Hapus Pengumuman",
  REPORT_DAMAGE: "Lapor Kerusakan",
  BATCH_CHECKOUT: "Peminjaman Massal",
  BATCH_RETURN: "Pengembalian Massal",
  BOOK_TRANSFER: "Pemindahan Rak",
  BULK_RETURN_LOANS: "Pengembalian Massal",
  BULK_SEND_NOTIFICATIONS: "Notifikasi Massal",
  BULK_APPROVE_RESERVATIONS: "Persetujuan Reservasi Massal",
  EXPORT_DATA: "Ekspor Data",
  DAPODIK_SYNC: "Sinkronisasi Dapodik",
  REWARD_CREATE: "Buat Hadiah",
  REWARD_UPDATE: "Update Hadiah",
  REWARD_DEACTIVATE: "Nonaktifkan Hadiah",
  REWARD_CLAIM: "Klaim Hadiah",
  REWARD_APPROVE: "Setujui Klaim Hadiah",
  REWARD_REJECT: "Tolak Klaim Hadiah",
  REWARD_DELIVER: "Kirim Hadiah",
  SEMESTER_ARCHIVE: "Arsip Semester",
  POINTS_ADJUST_UP: "Penyesuaian Poin Naik",
  POINTS_ADJUST_DOWN: "Penyesuaian Poin Turun",
} as const;

export type AuditAction = keyof typeof AUDIT_ACTIONS;

export async function logAudit(
  userId: string,
  action: AuditAction,
  entityType: string,
  entityId?: string,
  detail?: string
) {
  try {
    await db.auditLog.create({
      data: { userId, action, entityType, entityId: entityId ?? null, detail: detail ?? null },
    });
  } catch {
    // Silently fail — audit logging should never block the main operation
  }
}
