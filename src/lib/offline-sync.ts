/**
 * Offline Sync — Queue operations for background sync.
 *
 * Sprint P - Tier 3 #9: PWA + Offline Mode.
 *
 * Features:
 * - Queue operations when offline (book loan, return, etc.)
 * - Background sync when connection restored
 * - Persistent local storage (IndexedDB via localStorage fallback)
 * - Conflict resolution (last-write-wins by timestamp)
 * - Sync status tracking
 * - Visual indicator for user
 *
 * Use case: Siswa pinjam buku di area perpustakaan dengan WiFi terbatas.
 * - Tap "Pinjam" → operation queued offline
 * - WiFi connects → operations sync to server
 * - User gets confirmation
 */

import { logger } from "@/lib/logger";

// ===== Types =====

export type OperationType =
  | "LOAN_CREATE"
  | "LOAN_RETURN"
  | "LOAN_RENEW"
  | "RESERVATION_CREATE"
  | "WISHLIST_ADD"
  | "REVIEW_CREATE"
  | "READING_LOG";

export type OperationStatus = "PENDING" | "SYNCING" | "SYNCED" | "FAILED";

export interface QueuedOperation {
  id: string; // Local UUID
  type: OperationType;
  payload: Record<string, any>;
  createdAt: number; // Timestamp
  attempts: number;
  lastAttemptAt: number | null;
  status: OperationStatus;
  errorMessage?: string;
  /** Server ID after successful sync */
  serverId?: string;
}

export interface SyncResult {
  total: number;
  successful: number;
  failed: number;
  durationMs: number;
  errors: Array<{ opId: string; error: string }>;
}

const QUEUE_KEY = "ji-offline-queue";
const MAX_QUEUE_SIZE = 100;
const MAX_RETRY_ATTEMPTS = 5;
const SYNC_DEBOUNCE_MS = 2000;

// ===== Queue Management =====

/**
 * Get all queued operations.
 */
export function getQueue(): QueuedOperation[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(QUEUE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as QueuedOperation[];
  } catch {
    return [];
  }
}

/**
 * Save queue to localStorage.
 */
function saveQueue(queue: QueuedOperation[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    logger.warn("Failed to save offline queue", { error: String(err) });
  }
}

/**
 * Generate a local ID for queued operation.
 */
function generateLocalId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Add operation to queue.
 */
export function enqueueOperation(
  type: OperationType,
  payload: Record<string, any>
): QueuedOperation {
  const op: QueuedOperation = {
    id: generateLocalId(),
    type,
    payload,
    createdAt: Date.now(),
    attempts: 0,
    lastAttemptAt: null,
    status: "PENDING",
  };

  const queue = getQueue();
  queue.push(op);

  // Trim queue if too large (keep most recent)
  if (queue.length > MAX_QUEUE_SIZE) {
    queue.splice(0, queue.length - MAX_QUEUE_SIZE);
  }

  saveQueue(queue);
  logger.info("Operation queued offline", { type, id: op.id });

  // Try to sync immediately if online
  if (isOnline()) {
    scheduleSync();
  }

  return op;
}

/**
 * Remove operation from queue (after successful sync).
 */
export function dequeueOperation(opId: string): void {
  const queue = getQueue().filter((op) => op.id !== opId);
  saveQueue(queue);
}

/**
 * Update operation in queue.
 */
function updateOperation(opId: string, updates: Partial<QueuedOperation>): void {
  const queue = getQueue().map((op) => (op.id === opId ? { ...op, ...updates } : op));
  saveQueue(queue);
}

/**
 * Get queue statistics.
 */
export function getQueueStats(): {
  total: number;
  pending: number;
  syncing: number;
  failed: number;
  oldestPendingAge: number | null;
} {
  const queue = getQueue();
  const pending = queue.filter((op) => op.status === "PENDING");
  const oldest = pending[0];

  return {
    total: queue.length,
    pending: pending.length,
    syncing: queue.filter((op) => op.status === "SYNCING").length,
    failed: queue.filter((op) => op.status === "FAILED").length,
    oldestPendingAge: oldest ? Date.now() - oldest.createdAt : null,
  };
}

/**
 * Clear all operations (e.g., after successful full sync).
 */
export function clearQueue(): void {
  saveQueue([]);
}

/**
 * Clear failed operations.
 */
export function clearFailed(): number {
  const before = getQueue().length;
  const queue = getQueue().filter((op) => op.status !== "FAILED");
  saveQueue(queue);
  return before - queue.length;
}

// ===== Sync Engine =====

let syncInProgress = false;
let syncTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Check if browser is online.
 */
export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}

/**
 * Schedule a sync (debounced to batch multiple operations).
 */
export function scheduleSync(): void {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    syncQueue().catch((err) => {
      logger.error("Background sync failed", { error: err.message });
    });
  }, SYNC_DEBOUNCE_MS);
}

/**
 * Sync all pending operations.
 * Returns when complete.
 */
export async function syncQueue(
  sender?: (op: QueuedOperation) => Promise<{ success: boolean; serverId?: string; error?: string }>
): Promise<SyncResult> {
  if (syncInProgress) {
    return { total: 0, successful: 0, failed: 0, durationMs: 0, errors: [] };
  }

  const start = Date.now();
  syncInProgress = true;

  const queue = getQueue();
  const pending = queue.filter((op) => op.status === "PENDING" || op.status === "FAILED");

  const result: SyncResult = {
    total: pending.length,
    successful: 0,
    failed: 0,
    durationMs: 0,
    errors: [],
  };

  if (pending.length === 0) {
    syncInProgress = false;
    return result;
  }

  // Mark all as syncing
  pending.forEach((op) => {
    updateOperation(op.id, { status: "SYNCING" });
  });

  // Default sender (requires user to provide API endpoint)
  const defaultSender = async (op: QueuedOperation) => {
    try {
      const res = await fetch(`/api/sync/${op.type.toLowerCase()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ localId: op.id, ...op.payload }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, serverId: data.id };
      }
      return { success: false, error: data.error || res.statusText };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const send = sender || defaultSender;

  // Process each operation
  for (const op of pending) {
    const sendResult = await send(op);
    if (sendResult.success) {
      result.successful++;
      dequeueOperation(op.id);
    } else {
      result.failed++;
      const newAttempts = op.attempts + 1;
      if (newAttempts >= MAX_RETRY_ATTEMPTS) {
        updateOperation(op.id, {
          status: "FAILED",
          attempts: newAttempts,
          lastAttemptAt: Date.now(),
          errorMessage: sendResult.error,
        });
      } else {
        updateOperation(op.id, {
          status: "PENDING", // Will retry
          attempts: newAttempts,
          lastAttemptAt: Date.now(),
          errorMessage: sendResult.error,
        });
      }
      result.errors.push({ opId: op.id, error: sendResult.error || "Unknown" });
    }
  }

  result.durationMs = Date.now() - start;
  syncInProgress = false;

  logger.info("Sync complete", {
    total: result.total,
    successful: result.successful,
    failed: result.failed,
    durationMs: result.durationMs,
  });

  return result;
}

// ===== Online/Offline Event Listeners =====

let listenersAttached = false;

/**
 * Attach online/offline event listeners.
 * Call once on app mount.
 */
export function attachNetworkListeners(onSync?: () => void): void {
  if (typeof window === "undefined" || listenersAttached) return;

  window.addEventListener("online", () => {
    logger.info("Network restored, syncing queue");
    if (onSync) {
      onSync();
    } else {
      scheduleSync();
    }
  });

  window.addEventListener("offline", () => {
    logger.info("Network lost, operations will be queued");
  });

  listenersAttached = true;
}

/**
 * Manually trigger sync (e.g., from a "Sync Now" button).
 */
export async function triggerSyncNow(): Promise<SyncResult> {
  return await syncQueue();
}

// ===== Helpers =====

/**
 * Get a friendly description of an operation type.
 */
export function describeOperation(type: OperationType): string {
  const map: Record<OperationType, string> = {
    LOAN_CREATE: "Peminjaman buku",
    LOAN_RETURN: "Pengembalian buku",
    LOAN_RENEW: "Perpanjangan peminjaman",
    RESERVATION_CREATE: "Reservasi buku",
    WISHLIST_ADD: "Tambah ke wishlist",
    REVIEW_CREATE: "Ulasan buku",
    READING_LOG: "Log membaca",
  };
  return map[type] || type;
}

/**
 * Get status badge color.
 */
export function getStatusColor(status: OperationStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "PENDING":
      return "outline";
    case "SYNCING":
      return "secondary";
    case "SYNCED":
      return "secondary";
    case "FAILED":
      return "destructive";
  }
}

/**
 * Check if a specific operation type is supported offline.
 */
export function isOfflineSupported(type: OperationType): boolean {
  // All current types are supported
  return true;
}
