import { READING_LIST_KEY_PREFIX } from "@/lib/reading-list";

export interface QueueMember {
  id: string;
  fullName: string;
  memberNumber: string;
  category: string;
}

export interface QueueReservation {
  id: string;
  status: string;
  queueOrder: number;
  member: QueueMember;
}

/** Setting daftar bacaan guru bukan konfigurasi yang boleh dilist ke klien. */
export function isExposedSettingKey(key: string): boolean {
  return !key.startsWith(READING_LIST_KEY_PREFIX);
}

/** Sembunyikan nama/nomor anggota di antrian reservasi untuk orang lain. */
export function sanitizeReservationQueue(
  reservations: QueueReservation[],
  opts: { isStaff: boolean; memberId?: string | null }
): QueueReservation[] {
  if (opts.isStaff) return reservations;
  return reservations.map((r) => {
    if (r.member.id === opts.memberId) return r;
    return {
      ...r,
      member: {
        id: `queue-${r.queueOrder}`,
        fullName: `Antrian #${r.queueOrder}`,
        memberNumber: "",
        category: r.member.category,
      },
    };
  });
}
