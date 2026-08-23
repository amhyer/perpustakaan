/**
 * Smart Notification Triggers — Event-based automatic notifications.
 *
 * Sprint N - Tier 1 #3: Smart notification system.
 *
 * Triggers:
 * - BOOK_AVAILABLE: Buku yang di-reservasi sudah tersedia
 * - NEW_FAVORITE_AUTHOR: Pengarang favorit Anda merilis buku baru
 * - WISHLIST_AVAILABLE: Buku di wishlist sekarang tersedia
 * - SIMILAR_USERS_LIKE: User dengan profil mirip sedang suka buku ini
 * - DUE_SOON_REMINDER: Buku akan jatuh tempo besok/lusa
 * - OVERDUE_NUDGE: Sudah terlambat X hari
 * - STREAK_REMINDER: Streak Anda akan putus jika tidak membaca hari ini
 * - LEVEL_UP: Naik level! 🎉
 * - BADGE_EARNED: Badge baru!
 * - CHALLENGE_COMPLETE: Challenge selesai!
 * - FRIEND_ACTIVITY: Teman Anda meminjam buku (future)
 * - POPULAR_NOW: Buku sedang populer di sekolah
 * - RECOMMENDATION: "Karena Anda pinjam X, mungkin Anda suka Y"
 *
 * Architecture:
 * - Event bus integration (lib/event-bus.ts)
 * - Idempotent: same event not fired twice
 * - Throttled: max N notifications per user per day
 * - Personal: based on user's loan history, preferences, behavior
 *
 * Privacy:
 * - User can disable any trigger
 * - Aggregate only (no PII shared)
 * - LocalStorage for client-side opt-out
 */

import { db } from "@/lib/db";
import { notify } from "@/lib/notification-service";
import { logger } from "@/lib/logger";

// ===== Types =====

export type SmartNotificationType =
  | "BOOK_AVAILABLE"
  | "NEW_FAVORITE_AUTHOR"
  | "WISHLIST_AVAILABLE"
  | "SIMILAR_USERS_LIKE"
  | "DUE_SOON_REMINDER"
  | "OVERDUE_NUDGE"
  | "STREAK_REMINDER"
  | "LEVEL_UP"
  | "BADGE_EARNED"
  | "CHALLENGE_COMPLETE"
  | "POPULAR_NOW"
  | "RECOMMENDATION";

export interface SmartNotificationPreferences {
  // Master switch
  enabled: boolean;
  // Per-trigger toggle
  triggers: Partial<Record<SmartNotificationType, boolean>>;
  // Rate limit
  maxPerDay: number;
  // Quiet hours
  quietHoursEnabled: boolean;
  quietHoursStart: number; // 0-23
  quietHoursEnd: number; // 0-23
}

export const DEFAULT_PREFERENCES: SmartNotificationPreferences = {
  enabled: true,
  triggers: {
    BOOK_AVAILABLE: true,
    NEW_FAVORITE_AUTHOR: true,
    WISHLIST_AVAILABLE: true,
    SIMILAR_USERS_LIKE: true,
    DUE_SOON_REMINDER: true,
    OVERDUE_NUDGE: true,
    STREAK_REMINDER: true,
    LEVEL_UP: true,
    BADGE_EARNED: true,
    CHALLENGE_COMPLETE: true,
    POPULAR_NOW: false, // opt-in (can be noisy)
    RECOMMENDATION: true,
  },
  maxPerDay: 10,
  quietHoursEnabled: false,
  quietHoursStart: 22,
  quietHoursEnd: 7,
};

// ===== Throttle Tracking =====

interface ThrottleRecord {
  userId: string;
  date: string; // YYYY-MM-DD
  count: number;
}

const throttleMap = new Map<string, ThrottleRecord>();

function getThrottleKey(userId: string): string {
  const today = new Date().toISOString().split("T")[0];
  return `${userId}:${today}`;
}

function getTodayCount(userId: string): number {
  const key = getThrottleKey(userId);
  return throttleMap.get(key)?.count ?? 0;
}

function incrementTodayCount(userId: string): number {
  const key = getThrottleKey(userId);
  const current = throttleMap.get(key) ?? { userId, date: key.split(":")[1], count: 0 };
  current.count++;
  throttleMap.set(key, current);
  return current.count;
}

function isInQuietHours(prefs: SmartNotificationPreferences, now: Date = new Date()): boolean {
  if (!prefs.quietHoursEnabled) return false;
  const hour = now.getHours();
  const { quietHoursStart, quietHoursEnd } = prefs;
  if (quietHoursStart < quietHoursEnd) {
    return hour >= quietHoursStart && hour < quietHoursEnd;
  } else {
    // wraps midnight (e.g., 22-7)
    return hour >= quietHoursStart || hour < quietHoursEnd;
  }
}

// ===== Idempotency (Prevent Duplicate Notifications) =====

const sentKeyMap = new Map<string, number>();
const DEDUPE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function wasRecentlySent(userId: string, type: SmartNotificationType, key: string): boolean {
  const fullKey = `${userId}:${type}:${key}`;
  const lastSent = sentKeyMap.get(fullKey);
  if (!lastSent) return false;
  if (Date.now() - lastSent > DEDUPE_TTL_MS) {
    sentKeyMap.delete(fullKey);
    return false;
  }
  return true;
}

function markSent(userId: string, type: SmartNotificationType, key: string): void {
  const fullKey = `${userId}:${type}:${key}`;
  sentKeyMap.set(fullKey, Date.now());
}

// Cleanup expired entries periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of sentKeyMap.entries()) {
      if (now - v > DEDUPE_TTL_MS) sentKeyMap.delete(k);
    }
  }, 60 * 60 * 1000); // hourly
}

// ===== Main Send Function =====

export interface SmartSendOptions {
  userId: string;
  type: SmartNotificationType;
  dedupeKey: string;
  title: string;
  message: string;
  relatedId?: string;
  preferences?: SmartNotificationPreferences;
}

/**
 * Send a smart notification with throttling, dedup, and quiet hours.
 */
export async function sendSmartNotification(options: SmartSendOptions): Promise<{
  sent: boolean;
  reason?: string;
}> {
  const prefs = options.preferences ?? DEFAULT_PREFERENCES;

  // Master switch
  if (!prefs.enabled) {
    return { sent: false, reason: "notifications_disabled" };
  }

  // Per-trigger switch
  if (prefs.triggers[options.type] === false) {
    return { sent: false, reason: "trigger_disabled" };
  }

  // Quiet hours
  if (isInQuietHours(prefs)) {
    return { sent: false, reason: "quiet_hours" };
  }

  // Dedupe
  if (wasRecentlySent(options.userId, options.type, options.dedupeKey)) {
    return { sent: false, reason: "duplicate" };
  }

  // Rate limit
  const todayCount = getTodayCount(options.userId);
  if (todayCount >= prefs.maxPerDay) {
    return { sent: false, reason: "rate_limited" };
  }

  // Map type to notification type
  const notifType: "INFO" | "WARNING" | "DUE_DATE" | "OVERDUE" | "ANNOUNCEMENT" =
    options.type === "OVERDUE_NUDGE" || options.type === "DUE_SOON_REMINDER"
      ? options.type === "OVERDUE_NUDGE" ? "OVERDUE" : "DUE_DATE"
      : options.type === "STREAK_REMINDER" || options.type === "LEVEL_UP" || options.type === "BADGE_EARNED" || options.type === "CHALLENGE_COMPLETE"
      ? "ANNOUNCEMENT"
      : "INFO";

  await notify({
    userId: options.userId,
    title: options.title,
    message: options.message,
    type: notifType,
    relatedId: options.relatedId,
    channels: ["in_app"], // smart notifications are in-app only by default
  });

  incrementTodayCount(options.userId);
  markSent(options.userId, options.type, options.dedupeKey);

  logger.info("Smart notification sent", {
    userId: options.userId,
    type: options.type,
    dedupeKey: options.dedupeKey,
  });

  return { sent: true };
}

// ===== Trigger Functions =====

/**
 * Trigger when a reserved book becomes available.
 */
export async function triggerBookAvailable(reservationId: string): Promise<void> {
  const reservation = await db.reservation.findUnique({
    where: { id: reservationId },
    include: {
      member: { include: { user: true } },
      book: true,
    },
  });
  if (!reservation) return;

  await sendSmartNotification({
    userId: reservation.member.user.id,
    type: "BOOK_AVAILABLE",
    dedupeKey: `reservation-${reservationId}`,
    title: `📚 Buku Tersedia!`,
    message: `"${reservation.book.title}" yang Anda reservasi sudah tersedia untuk dipinjam. Segera ambil sebelum ${reservation.expiresAt ? new Date(reservation.expiresAt).toLocaleDateString("id-ID") : "batas waktu"}.`,
    relatedId: reservationId,
  });
}

/**
 * Trigger when a book in member's wishlist becomes available.
 */
export async function triggerWishlistAvailable(memberId: string, bookId: string): Promise<void> {
  const member = await db.member.findUnique({
    where: { id: memberId },
    include: { user: true },
  });
  if (!member) return;
  const book = await db.book.findUnique({ where: { id: bookId } });
  if (!book) return;

  await sendSmartNotification({
    userId: member.user.id,
    type: "WISHLIST_AVAILABLE",
    dedupeKey: `wishlist-${memberId}-${bookId}`,
    title: `💝 Wishlist Tersedia!`,
    message: `"${book.title}" dari wishlist Anda sekarang tersedia. Jangan sampai kehabisan!`,
    relatedId: bookId,
  });
}

/**
 * Trigger when similar users like a book (collaborative filter).
 */
export async function triggerSimilarUsersLike(
  memberId: string,
  bookId: string,
  similarCount: number
): Promise<void> {
  if (similarCount < 2) return; // Skip if too few similar users

  const member = await db.member.findUnique({
    where: { id: memberId },
    include: { user: true },
  });
  if (!member) return;
  const book = await db.book.findUnique({ where: { id: bookId } });
  if (!book) return;

  await sendSmartNotification({
    userId: member.user.id,
    type: "SIMILAR_USERS_LIKE",
    dedupeKey: `similar-${memberId}-${bookId}`,
    title: `👥 Rekomendasi Teman`,
    message: `${similarCount} siswa yang sering pinjam buku serupa menyukai "${book.title}". Mungkin Anda juga akan suka!`,
    relatedId: bookId,
  });
}

/**
 * Trigger when streak is at risk of breaking.
 * (e.g., user has 5+ day streak but hasn't read today)
 */
export async function triggerStreakReminder(
  memberId: string,
  currentStreak: number
): Promise<{ sent: boolean; reason?: string }> {
  if (currentStreak < 3) return { sent: false, reason: "low_streak" };

  const member = await db.member.findUnique({
    where: { id: memberId },
    include: { user: true },
  });
  if (!member) return { sent: false, reason: "member_not_found" };

  return await sendSmartNotification({
    userId: member.user.id,
    type: "STREAK_REMINDER",
    dedupeKey: `streak-${memberId}-${new Date().toISOString().split("T")[0]}`,
    title: `🔥 Pertahankan Streak!`,
    message: `Streak ${currentStreak} hari Anda akan putus! Pinjam atau baca buku hari ini untuk mempertahankan.`,
    relatedId: memberId,
  });
}

/**
 * Trigger when user levels up.
 */
export async function triggerLevelUp(memberId: string, newLevelName: string, perks: string[]): Promise<void> {
  const member = await db.member.findUnique({
    where: { id: memberId },
    include: { user: true },
  });
  if (!member) return;

  await sendSmartNotification({
    userId: member.user.id,
    type: "LEVEL_UP",
    dedupeKey: `levelup-${memberId}-${newLevelName}`,
    title: `🎉 Selamat! Anda Naik Level!`,
    message: `Anda sekarang ${newLevelName}! Keuntungan baru: ${perks.slice(0, 2).join(", ")}.`,
    relatedId: memberId,
  });
}

/**
 * Trigger when a new badge is earned.
 */
export async function triggerBadgeEarned(memberId: string, badgeName: string): Promise<void> {
  const member = await db.member.findUnique({
    where: { id: memberId },
    include: { user: true },
  });
  if (!member) return;

  await sendSmartNotification({
    userId: member.user.id,
    type: "BADGE_EARNED",
    dedupeKey: `badge-${memberId}-${badgeName}`,
    title: `🏆 Badge Baru!`,
    message: `Anda mendapatkan badge "${badgeName}"! Terus membaca untuk membuka lebih banyak.`,
    relatedId: memberId,
  });
}

/**
 * Trigger when a popular book is trending in the school.
 */
export async function triggerPopularNow(
  memberId: string,
  bookId: string,
  loanCount: number,
  preferences?: SmartNotificationPreferences
): Promise<void> {
  if (loanCount < 5) return; // Need significant popularity

  const member = await db.member.findUnique({
    where: { id: memberId },
    include: { user: true },
  });
  if (!member) return;
  const book = await db.book.findUnique({ where: { id: bookId } });
  if (!book) return;

  await sendSmartNotification({
    userId: member.user.id,
    type: "POPULAR_NOW",
    dedupeKey: `popular-${memberId}-${bookId}`,
    title: `📈 Sedang Populer!`,
    message: `"${book.title}" sedang tren — ${loanCount} siswa meminjamnya bulan ini.`,
    relatedId: bookId,
    preferences,
  });
}

/**
 * Trigger for new book by favorite author.
 */
export async function triggerNewFavoriteAuthor(
  memberId: string,
  bookId: string,
  authorName: string
): Promise<void> {
  const member = await db.member.findUnique({
    where: { id: memberId },
    include: { user: true },
  });
  if (!member) return;
  const book = await db.book.findUnique({ where: { id: bookId } });
  if (!book) return;

  await sendSmartNotification({
    userId: member.user.id,
    type: "NEW_FAVORITE_AUTHOR",
    dedupeKey: `newauthor-${memberId}-${bookId}`,
    title: `✍ Pengarang Favorit!`,
    message: `${authorName} merilis buku baru: "${book.title}". Tersedia di katalog!`,
    relatedId: bookId,
  });
}

// ===== Detection Helpers (called from cron / events) =====

/**
 * Detect users at risk of breaking their streak and notify.
 * Run daily (e.g., 8 PM).
 */
export async function detectStreakAtRisk(): Promise<{ notified: number }> {
  // Get all members with active streaks ≥ 3
  const members = await db.member.findMany({
    where: { status: "ACTIVE" },
    include: {
      user: { select: { id: true } },
    },
    take: 500, // safety cap
  });

  let notified = 0;
  for (const member of members) {
    // Check if member has any LOAN_RETURNED txn today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayTxn = await db.pointTransaction.findFirst({
      where: {
        memberId: member.id,
        type: "EARN",
        source: "LOAN_RETURNED",
        createdAt: { gte: todayStart },
      },
    });

    if (todayTxn) continue; // Already active today

    // Calculate streak
    const txns = await db.pointTransaction.findMany({
      where: {
        memberId: member.id,
        type: "EARN",
        source: "LOAN_RETURNED",
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { createdAt: true },
    });

    if (txns.length === 0) continue;

    const days = new Set<string>();
    for (const t of txns) {
      days.add(t.createdAt.toISOString().split("T")[0]);
    }
    const sortedDays = Array.from(days).sort((a, b) => b.localeCompare(a));

    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    if (sortedDays[0] !== yesterday) continue; // Not an active streak

    // Calculate streak length
    let streak = 1;
    for (let i = 1; i < sortedDays.length; i++) {
      const prev = new Date(sortedDays[i - 1]);
      const curr = new Date(sortedDays[i]);
      const diff = Math.floor((prev.getTime() - curr.getTime()) / 86400000);
      if (diff === 1) streak++;
      else break;
    }

    if (streak >= 3) {
      const result = await triggerStreakReminder(member.id, streak);
      if (result.sent) notified++;
    }
  }

  return { notified };
}

/**
 * Get user's current smart notification preferences.
 */
export function getUserPreferences(
  stored?: Partial<SmartNotificationPreferences>
): SmartNotificationPreferences {
  return {
    ...DEFAULT_PREFERENCES,
    ...stored,
    triggers: {
      ...DEFAULT_PREFERENCES.triggers,
      ...(stored?.triggers || {}),
    },
  };
}

/**
 * Test helper: clear throttle/dedupe state (for tests).
 */
export function _resetState(): void {
  throttleMap.clear();
  sentKeyMap.clear();
}
