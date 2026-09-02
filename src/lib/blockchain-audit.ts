/**
 * Blockchain Audit Trail — Immutable hash-chained audit log.
 *
 * Setiap audit event di-hash menggunakan SHA-256 dan di-link ke
 * previous block (chain). Tampering dengan satu block invalidates
 * seluruh chain ke depannya.
 *
 * Algorithm:
 * 1. Collect unsealed audit events dari database
 * 2. Compute leaf hash untuk setiap event (SHA-256 of event data)
 * 3. Build merkle tree dari leaf hashes
 * 4. Compute block hash: SHA-256(index + timestamp + prevHash + merkleRoot + nonce)
 * 5. Apply proof-of-work (find nonce dengan N leading zero bits) — optional
 * 6. Save block + update AuditLog.blockId
 *
 * Verification:
 * 1. Recompute hash dari block data
 * 2. Compare dengan stored hash
 * 3. Walk chain: ensure each block's prevHash = previous block's hash
 * 4. Verify merkle proof untuk individual events
 *
 * Use cases:
 * - Compliance audit (prove no data was tampered)
 * - Forensics (track who changed what, when)
 * - Legal evidence (immutable record)
 *
 * Note: ini BUKAN real blockchain (no consensus, no distributed nodes).
 * Tapi konsep hash chain yang sama untuk immutability.
 */

import { createHash } from "crypto";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { cache } from "@/lib/cache";

// ===== Types =====

export interface AuditEvent {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  detail: string | null;
  createdAt: string;
}

export interface Block {
  index: number;
  timestamp: string;
  previousHash: string;
  hash: string;
  merkleRoot: string;
  eventCount: number;
  events: AuditEvent[];
  nonce: number;
  difficulty: number;
}

export interface VerificationResult {
  valid: boolean;
  totalBlocks: number;
  totalEvents: number;
  brokenAt: number | null;
  reason?: string;
  verifiedAt: string;
  duration: number;
}

export interface BlockchainStats {
  totalBlocks: number;
  totalEvents: number;
  lastBlockAt: string | null;
  lastBlockHash: string | null;
  chainValid: boolean;
  pendingEvents: number;
}

// ===== Constants =====

const GENESIS_PREV_HASH = "0".repeat(64);
const DEFAULT_DIFFICULTY = 0; // 0 = no PoW, just SHA-256
const BATCH_SIZE = 100;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ===== Hash Functions =====

/**
 * SHA-256 hash of arbitrary content.
 */
function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Compute leaf hash dari audit event.
 * Format: {id}|{userId}|{action}|{entityType}|{entityId}|{detail}|{createdAt}
 */
function leafHash(event: AuditEvent): string {
  const content = [
    event.id,
    event.userId,
    event.action,
    event.entityType,
    event.entityId || "",
    event.detail || "",
    event.createdAt,
  ].join("|");
  return sha256(content);
}

/**
 * Compute hash dari two child hashes (merkle tree).
 */
function hashPair(left: string, right: string): string {
  return sha256(left + right);
}

/**
 * Build merkle tree dari array of leaf hashes.
 * Returns root hash.
 */
export function buildMerkleTree(leaves: string[]): { root: string; tree: string[][] } {
  if (leaves.length === 0) {
    return { root: sha256(""), tree: [] };
  }
  if (leaves.length === 1) {
    return { root: leaves[0], tree: [leaves] };
  }

  const tree: string[][] = [leaves];
  let current = leaves;

  while (current.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < current.length; i += 2) {
      if (i + 1 < current.length) {
        next.push(hashPair(current[i], current[i + 1]));
      } else {
        // Odd one out: promote
        next.push(current[i]);
      }
    }
    tree.push(next);
    current = next;
  }

  return { root: current[0], tree };
}

/**
 * Get merkle proof (sibling hashes) untuk leaf at given index.
 */
export function getMerkleProof(tree: string[][], leafIndex: number): string[] {
  const proof: string[] = [];
  let index = leafIndex;

  for (let level = 0; level < tree.length - 1; level++) {
    const levelNodes = tree[level];
    const isRight = index % 2 === 1;
    const siblingIndex = isRight ? index - 1 : index + 1;
    if (siblingIndex < levelNodes.length) {
      proof.push(levelNodes[siblingIndex]);
    }
    index = Math.floor(index / 2);
  }

  return proof;
}

/**
 * Verify merkle proof.
 */
export function verifyMerkleProof(
  leafHash: string,
  proof: string[],
  root: string,
  leafIndex: number
): boolean {
  let hash = leafHash;
  let index = leafIndex;

  for (const sibling of proof) {
    if (index % 2 === 0) {
      hash = hashPair(hash, sibling);
    } else {
      hash = hashPair(sibling, hash);
    }
    index = Math.floor(index / 2);
  }

  return hash === root;
}

/**
 * Compute block hash.
 * Format: index|timestamp|previousHash|merkleRoot|nonce
 */
export function computeBlockHash(
  index: number,
  timestamp: string,
  previousHash: string,
  merkleRoot: string,
  nonce: number
): string {
  const content = [index, timestamp, previousHash, merkleRoot, nonce].join("|");
  return sha256(content);
}

/**
 * Proof of work: find nonce such that hash has N leading zero bits.
 * Untuk difficulty 0, langsung return 0.
 */
function proofOfWork(
  index: number,
  timestamp: string,
  previousHash: string,
  merkleRoot: string,
  difficulty: number
): number {
  if (difficulty === 0) return 0;

  const target = "0".repeat(Math.ceil(difficulty / 4));
  let nonce = 0;
  const maxIterations = 1_000_000; // safety limit

  while (nonce < maxIterations) {
    const hash = computeBlockHash(index, timestamp, previousHash, merkleRoot, nonce);
    if (hash.startsWith(target)) return nonce;
    nonce++;
  }

  logger.warn("PoW exceeded max iterations", { difficulty, maxIterations });
  return nonce;
}

// ===== Get Last Block =====

/**
 * Get the latest block in chain (or null if no blocks).
 */
export async function getLastBlock(): Promise<{
  index: number;
  hash: string;
  timestamp: string;
  eventCount: number;
} | null> {
  try {
    const last = await db.auditBlock.findFirst({
      orderBy: { index: "desc" },
      select: { index: true, hash: true, timestamp: true, eventCount: true },
    });
    return last
      ? {
          ...last,
          timestamp: last.timestamp.toISOString(),
        }
      : null;
  } catch (e) {
    logger.warn("Gagal ambil block terakhir", { error: String(e) });
    return null;
  }
}

/**
 * Get pending (unsealed) audit events count.
 */
export async function getPendingEventCount(): Promise<number> {
  try {
    return await db.auditLog.count({ where: { blockId: null } });
  } catch (e) {
    logger.warn("Gagal hitung event pending", { error: String(e) });
    return 0;
  }
}

// ===== Seal Block =====

/**
 * Seal a new block dengan pending audit events.
 * Returns the new block.
 */
export async function sealBlock(options: {
  reason?: "AUTO_INTERVAL" | "MANUAL" | "BATCH_SIZE";
  sealedBy?: string;
  batchSize?: number;
  difficulty?: number;
} = {}): Promise<{
  block: {
    index: number;
    hash: string;
    eventCount: number;
    merkleRoot: string;
    timestamp: string;
  };
  sealed: number;
} | null> {
  const batchSize = options.batchSize || BATCH_SIZE;
  const difficulty = options.difficulty ?? DEFAULT_DIFFICULTY;
  const reason = options.reason || "MANUAL";
  const sealedBy = options.sealedBy || null;

  try {
    // 1. Get pending events
    const events = await db.auditLog.findMany({
      where: { blockId: null },
      orderBy: { createdAt: "asc" },
      take: batchSize,
    });

    if (events.length === 0) {
      logger.info("No pending events to seal");
      return null;
    }

    // 2. Get last block
    const last = await getLastBlock();
    const newIndex = (last?.index ?? -1) + 1;
    const previousHash = last?.hash ?? GENESIS_PREV_HASH;
    const timestamp = new Date().toISOString();

    // 3. Compute leaf hashes
    const auditEvents: AuditEvent[] = events.map((e) => ({
      id: e.id,
      userId: e.userId,
      action: e.action,
      entityType: e.entityType,
      entityId: e.entityId,
      detail: e.detail,
      createdAt: e.createdAt.toISOString(),
    }));
    const leaves = auditEvents.map(leafHash);

    // 4. Build merkle tree
    const { root: merkleRoot, tree } = buildMerkleTree(leaves);

    // 5. Find nonce (proof of work)
    const nonce = proofOfWork(newIndex, timestamp, previousHash, merkleRoot, difficulty);

    // 6. Compute block hash
    const hash = computeBlockHash(newIndex, timestamp, previousHash, merkleRoot, nonce);

    // 7. Create block
    const block = await db.auditBlock.create({
      data: {
        index: newIndex,
        timestamp: new Date(timestamp),
        previousHash,
        hash,
        merkleRoot,
        eventCount: events.length,
        firstEventId: events[0].id,
        lastEventId: events[events.length - 1].id,
        nonce,
        difficulty,
        sealedBy,
        sealReason: reason,
        size: hash.length + merkleRoot.length,
      },
    });

    // 8. Update audit logs with block reference
    await db.auditLog.updateMany({
      where: { id: { in: events.map((e) => e.id) } },
      data: { blockId: block.id },
    });

    // 9. Create AuditLogBlockchain records with merkle proofs
    const proofRecords = auditEvents.map((event, idx) => {
      const leaf = leaves[idx];
      const proof = getMerkleProof(tree, idx);
      return {
        auditLogId: event.id,
        blockId: block.id,
        merkleProof: JSON.stringify(proof),
        leafHash: leaf,
      };
    });

    // Batch insert (SQLite supports batch via createMany)
    await db.auditLogBlockchain.createMany({
      data: proofRecords,
    });

    // Invalidate cache
    cache.invalidate("blockchain:stats");

    logger.info("Block sealed", {
      index: newIndex,
      hash: hash.slice(0, 12) + "...",
      eventCount: events.length,
      reason,
    });

    return {
      block: {
        index: newIndex,
        hash,
        eventCount: events.length,
        merkleRoot,
        timestamp,
      },
      sealed: events.length,
    };
  } catch (err) {
    logger.error("Failed to seal block", { error: String(err) });
    return null;
  }
}

// ===== Verify Chain =====

/**
 * Verify the entire chain integrity.
 * Returns detailed verification result.
 */
export async function verifyChain(): Promise<VerificationResult> {
  const start = Date.now();

  try {
    const blocks = await db.auditBlock.findMany({
      orderBy: { index: "asc" },
    });

    if (blocks.length === 0) {
      return {
        valid: true,
        totalBlocks: 0,
        totalEvents: 0,
        brokenAt: null,
        verifiedAt: new Date().toISOString(),
        duration: Date.now() - start,
      };
    }

    let totalEvents = 0;
    let prevHash = GENESIS_PREV_HASH;

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];

      // Check index sequence
      if (block.index !== i) {
        return {
          valid: false,
          totalBlocks: blocks.length,
          totalEvents,
          brokenAt: i,
          reason: `Block ${i} has wrong index ${block.index}`,
          verifiedAt: new Date().toISOString(),
          duration: Date.now() - start,
        };
      }

      // Check previous hash linkage
      if (block.previousHash !== prevHash) {
        return {
          valid: false,
          totalBlocks: blocks.length,
          totalEvents,
          brokenAt: i,
          reason: `Block ${i} previousHash doesn't match previous block's hash`,
          verifiedAt: new Date().toISOString(),
          duration: Date.now() - start,
        };
      }

      // Recompute block hash
      const recomputed = computeBlockHash(
        block.index,
        block.timestamp.toISOString(),
        block.previousHash,
        block.merkleRoot,
        block.nonce
      );

      if (recomputed !== block.hash) {
        return {
          valid: false,
          totalBlocks: blocks.length,
          totalEvents,
          brokenAt: i,
          reason: `Block ${i} hash mismatch (tampered!)`,
          verifiedAt: new Date().toISOString(),
          duration: Date.now() - start,
        };
      }

      prevHash = block.hash;
      totalEvents += block.eventCount;
    }

    return {
      valid: true,
      totalBlocks: blocks.length,
      totalEvents,
      brokenAt: null,
      verifiedAt: new Date().toISOString(),
      duration: Date.now() - start,
    };
  } catch (err) {
    logger.error("Chain verification error", { error: String(err) });
    return {
      valid: false,
      totalBlocks: 0,
      totalEvents: 0,
      brokenAt: null,
      reason: `Verification failed: ${err}`,
      verifiedAt: new Date().toISOString(),
      duration: Date.now() - start,
    };
  }
}

/**
 * Verify a single audit event by merkle proof.
 */
export async function verifyAuditEvent(auditLogId: string): Promise<{
  valid: boolean;
  blockIndex?: number;
  blockHash?: string;
  reason?: string;
}> {
  try {
    const record = await db.auditLogBlockchain.findUnique({
      where: { auditLogId },
    });
    if (!record) {
      return { valid: false, reason: "Audit log not in any block" };
    }

    const block = await db.auditBlock.findUnique({
      where: { id: record.blockId },
    });
    if (!block) {
      return { valid: false, reason: "Block not found" };
    }

    // Find leaf index
    const allInBlock = await db.auditLogBlockchain.findMany({
      where: { blockId: record.blockId },
      orderBy: { sealedAt: "asc" },
    });
    const leafIndex = allInBlock.findIndex((r) => r.auditLogId === auditLogId);
    if (leafIndex === -1) {
      return { valid: false, reason: "Leaf index not found" };
    }

    // Recompute leaves and merkle root
    const leaves = allInBlock.map((r) => r.leafHash);
    const { root } = buildMerkleTree(leaves);

    if (root !== block.merkleRoot) {
      return {
        valid: false,
        blockIndex: block.index,
        blockHash: block.hash,
        reason: "Merkle root mismatch (data tampered!)",
      };
    }

    // Verify merkle proof
    const proof = JSON.parse(record.merkleProof) as string[];
    const proofValid = verifyMerkleProof(record.leafHash, proof, root, leafIndex);

    return {
      valid: proofValid,
      blockIndex: block.index,
      blockHash: block.hash,
      reason: proofValid ? undefined : "Merkle proof verification failed",
    };
  } catch (err) {
    return { valid: false, reason: String(err) };
  }
}

// ===== Get Stats =====

/**
 * Get blockchain statistics.
 */
export async function getBlockchainStats(): Promise<BlockchainStats> {
  const cacheKey = "blockchain:stats";
  const cached = cache.get<BlockchainStats>(cacheKey);
  if (cached) return cached;

  try {
    const [totalBlocks, totalEvents, lastBlock, pendingEvents, verification] =
      await Promise.all([
        db.auditBlock.count(),
        db.auditLog.count(),
        db.auditBlock.findFirst({
          orderBy: { index: "desc" },
          select: { timestamp: true, hash: true },
        }),
        db.auditLog.count({ where: { blockId: null } }),
        verifyChain(),
      ]);

    const stats: BlockchainStats = {
      totalBlocks,
      totalEvents,
      lastBlockAt: lastBlock?.timestamp.toISOString() || null,
      lastBlockHash: lastBlock?.hash || null,
      chainValid: verification.valid,
      pendingEvents,
    };

    cache.set(cacheKey, stats, CACHE_TTL_MS);
    return stats;
  } catch (e) {
    logger.warn("Gagal ambil statistik blockchain", { error: String(e) });
    return {
      totalBlocks: 0,
      totalEvents: 0,
      lastBlockAt: null,
      lastBlockHash: null,
      chainValid: true,
      pendingEvents: 0,
    };
  }
}

// ===== Get Block Details =====

export interface BlockDetails {
  id: string;
  index: number;
  timestamp: string;
  previousHash: string;
  hash: string;
  merkleRoot: string;
  eventCount: number;
  nonce: number;
  difficulty: number;
  sealedBy: string | null;
  sealReason: string | null;
  events: AuditEvent[];
}

/**
 * Get full block details dengan audit events.
 */
export async function getBlockDetails(
  identifier: string | number
): Promise<BlockDetails | null> {
  try {
    const where = typeof identifier === "number" ? { index: identifier } : { hash: identifier };
    const block = await db.auditBlock.findFirst({
      where,
      include: {
        events: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            userId: true,
            action: true,
            entityType: true,
            entityId: true,
            detail: true,
            createdAt: true,
          },
        },
      },
    });
    if (!block) return null;
    return {
      id: block.id,
      index: block.index,
      timestamp: block.timestamp.toISOString(),
      previousHash: block.previousHash,
      hash: block.hash,
      merkleRoot: block.merkleRoot,
      eventCount: block.eventCount,
      nonce: block.nonce,
      difficulty: block.difficulty,
      sealedBy: block.sealedBy,
      sealReason: block.sealReason,
      events: block.events.map((e) => ({
        ...e,
        createdAt: e.createdAt.toISOString(),
      })),
    };
  } catch (e) {
    logger.warn("Gagal ambil detail block", { error: String(e) });
    return null;
  }
}

/**
 * Get all blocks (paginated).
 */
export async function getBlocks(limit = 20, offset = 0): Promise<
  Array<{
    id: string;
    index: number;
    hash: string;
    eventCount: number;
    timestamp: string;
    sealReason: string | null;
  }>
> {
  try {
    const blocks = await db.auditBlock.findMany({
      orderBy: { index: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true,
        index: true,
        hash: true,
        eventCount: true,
        timestamp: true,
        sealReason: true,
      },
    });
    return blocks.map((b) => ({
      ...b,
      timestamp: b.timestamp.toISOString(),
    }));
  } catch (e) {
    logger.warn("Gagal ambil daftar block", { error: String(e) });
    return [];
  }
}

// ===== Helper: Hook into logAudit =====

/**
 * Helper untuk integrate blockchain dengan existing logAudit.
 * Adds audit events to blockchain automatically setiap kali ada perubahan.
 *
 * Note: block sealing dilakukan async (cron atau batch) untuk avoid blocking
 * main flow. Immediate sealing juga available via sealBlock().
 */
export async function scheduleBlockSeal() {
  const pending = await getPendingEventCount();
  if (pending >= BATCH_SIZE) {
    await sealBlock({ reason: "BATCH_SIZE" });
  }
}
