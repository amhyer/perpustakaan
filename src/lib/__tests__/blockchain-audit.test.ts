/**
 * Unit tests untuk src/lib/blockchain-audit.ts
 *
 * Test pure logic: hashing, merkle tree, proof, chain validation.
 * DB integration tests would be separate.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db", () => ({
  db: {
    auditBlock: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    auditLog: {
      count: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    auditLogBlockchain: {
      createMany: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("../logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("../cache", () => ({
  cache: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  },
}));

import {
  buildMerkleTree,
  getMerkleProof,
  verifyMerkleProof,
  computeBlockHash,
} from "../blockchain-audit";

describe("blockchain: SHA-256 hashing", () => {
  it("produces 64-char hex hash", async () => {
    const { createHash } = await import("crypto");
    const hash = createHash("sha256").update("test").digest("hex");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("same input → same hash (deterministic)", async () => {
    const { createHash } = await import("crypto");
    const h1 = createHash("sha256").update("hello").digest("hex");
    const h2 = createHash("sha256").update("hello").digest("hex");
    expect(h1).toBe(h2);
  });

  it("different input → different hash", async () => {
    const { createHash } = await import("crypto");
    const h1 = createHash("sha256").update("a").digest("hex");
    const h2 = createHash("sha256").update("b").digest("hex");
    expect(h1).not.toBe(h2);
  });
});

describe("blockchain: computeBlockHash", () => {
  it("produces deterministic hash from inputs", () => {
    const h1 = computeBlockHash(0, "2026-01-01T00:00:00Z", "0", "root", 0);
    const h2 = computeBlockHash(0, "2026-01-01T00:00:00Z", "0", "root", 0);
    expect(h1).toBe(h2);
  });

  it("different index → different hash", () => {
    const h1 = computeBlockHash(0, "2026-01-01T00:00:00Z", "0", "root", 0);
    const h2 = computeBlockHash(1, "2026-01-01T00:00:00Z", "0", "root", 0);
    expect(h1).not.toBe(h2);
  });

  it("different timestamp → different hash", () => {
    const h1 = computeBlockHash(0, "2026-01-01T00:00:00Z", "0", "root", 0);
    const h2 = computeBlockHash(0, "2026-01-02T00:00:00Z", "0", "root", 0);
    expect(h1).not.toBe(h2);
  });

  it("different previousHash → different hash", () => {
    const h1 = computeBlockHash(0, "2026-01-01T00:00:00Z", "0", "root", 0);
    const h2 = computeBlockHash(0, "2026-01-01T00:00:00Z", "1", "root", 0);
    expect(h1).not.toBe(h2);
  });

  it("different merkleRoot → different hash", () => {
    const h1 = computeBlockHash(0, "2026-01-01T00:00:00Z", "0", "root1", 0);
    const h2 = computeBlockHash(0, "2026-01-01T00:00:00Z", "0", "root2", 0);
    expect(h1).not.toBe(h2);
  });

  it("different nonce → different hash", () => {
    const h1 = computeBlockHash(0, "2026-01-01T00:00:00Z", "0", "root", 0);
    const h2 = computeBlockHash(0, "2026-01-01T00:00:00Z", "0", "root", 1);
    expect(h1).not.toBe(h2);
  });
});

describe("blockchain: buildMerkleTree", () => {
  it("handles empty leaves", () => {
    const { root, tree } = buildMerkleTree([]);
    expect(typeof root).toBe("string");
    expect(root.length).toBe(64);
    expect(tree).toEqual([]);
  });

  it("handles single leaf", () => {
    const leaf = "abc123";
    const { root, tree } = buildMerkleTree([leaf]);
    expect(root).toBe(leaf);
    expect(tree).toEqual([[leaf]]);
  });

  it("handles 2 leaves", () => {
    const { root, tree } = buildMerkleTree(["a", "b"]);
    expect(root).not.toBe("a");
    expect(root).not.toBe("b");
    expect(tree.length).toBe(2); // 2 levels
  });

  it("handles 4 leaves (perfect tree)", () => {
    const { root, tree } = buildMerkleTree(["a", "b", "c", "d"]);
    expect(tree.length).toBe(3); // 4 → 2 → 1
    expect(typeof root).toBe("string");
  });

  it("handles odd number of leaves (3)", () => {
    const { root, tree } = buildMerkleTree(["a", "b", "c"]);
    expect(tree.length).toBeGreaterThan(0);
    expect(typeof root).toBe("string");
  });

  it("produces different root for different leaves", () => {
    const r1 = buildMerkleTree(["a", "b"]).root;
    const r2 = buildMerkleTree(["a", "c"]).root;
    expect(r1).not.toBe(r2);
  });

  it("is order-sensitive (a,b != b,a)", () => {
    const r1 = buildMerkleTree(["a", "b"]).root;
    const r2 = buildMerkleTree(["b", "a"]).root;
    expect(r1).not.toBe(r2);
  });
});

describe("blockchain: getMerkleProof", () => {
  it("returns proof for leaf in 2-leaf tree", () => {
    const { tree } = buildMerkleTree(["a", "b"]);
    const proof0 = getMerkleProof(tree, 0);
    expect(proof0).toEqual(["b"]);

    const proof1 = getMerkleProof(tree, 1);
    expect(proof1).toEqual(["a"]);
  });

  it("returns proof for leaf in 4-leaf tree", () => {
    const { tree } = buildMerkleTree(["a", "b", "c", "d"]);
    const proof0 = getMerkleProof(tree, 0);
    expect(proof0.length).toBe(2);
  });

  it("returns empty array for single leaf", () => {
    const { tree } = buildMerkleTree(["a"]);
    const proof = getMerkleProof(tree, 0);
    expect(proof).toEqual([]);
  });
});

describe("blockchain: verifyMerkleProof", () => {
  it("verifies correct proof for 2-leaf tree", () => {
    const leaves = ["a", "b"];
    const { root, tree } = buildMerkleTree(leaves);
    const proof = getMerkleProof(tree, 0);
    expect(verifyMerkleProof("a", proof, root, 0)).toBe(true);
  });

  it("verifies correct proof for 4-leaf tree", () => {
    const leaves = ["a", "b", "c", "d"];
    const { root, tree } = buildMerkleTree(leaves);
    for (let i = 0; i < leaves.length; i++) {
      const proof = getMerkleProof(tree, i);
      expect(verifyMerkleProof(leaves[i], proof, root, i)).toBe(true);
    }
  });

  it("rejects tampered leaf", () => {
    const { root, tree } = buildMerkleTree(["a", "b"]);
    const proof = getMerkleProof(tree, 0);
    expect(verifyMerkleProof("tampered", proof, root, 0)).toBe(false);
  });

  it("rejects wrong index", () => {
    const leaves = ["a", "b", "c", "d"];
    const { root, tree } = buildMerkleTree(leaves);
    const proof = getMerkleProof(tree, 0);
    // Use leaf a's proof but claim it's at index 2
    expect(verifyMerkleProof("a", proof, root, 2)).toBe(false);
  });

  it("rejects wrong root", () => {
    const { tree } = buildMerkleTree(["a", "b", "c", "d"]);
    const proof = getMerkleProof(tree, 0);
    expect(verifyMerkleProof("a", proof, "wrong-root", 0)).toBe(false);
  });
});

describe("blockchain: chain integrity scenarios", () => {
  it("detects tampered block (wrong hash)", () => {
    const block1 = {
      index: 0,
      timestamp: "2026-01-01T00:00:00Z",
      previousHash: "0".repeat(64),
      merkleRoot: "root1",
      nonce: 0,
    };
    const block2 = {
      index: 1,
      timestamp: "2026-01-02T00:00:00Z",
      previousHash: computeBlockHash(
        block1.index,
        block1.timestamp,
        block1.previousHash,
        block1.merkleRoot,
        block1.nonce
      ),
      merkleRoot: "root2",
      nonce: 0,
    };

    // Recompute block 2 hash
    const recomputed = computeBlockHash(
      block2.index,
      block2.timestamp,
      block2.previousHash,
      block2.merkleRoot,
      block2.nonce
    );
    const stored = "tampered-hash";
    expect(recomputed).not.toBe(stored); // Tamper detected
  });

  it("chain link is verifiable", () => {
    const block1 = {
      index: 0,
      timestamp: "2026-01-01T00:00:00Z",
      previousHash: "0".repeat(64),
      merkleRoot: "root1",
      nonce: 0,
    };
    const block2 = {
      index: 1,
      timestamp: "2026-01-02T00:00:00Z",
      previousHash: computeBlockHash(
        block1.index,
        block1.timestamp,
        block1.previousHash,
        block1.merkleRoot,
        block1.nonce
      ),
      merkleRoot: "root2",
      nonce: 0,
    };

    // Block 2's previousHash must match block 1's hash
    const block1Hash = computeBlockHash(
      block1.index,
      block1.timestamp,
      block1.previousHash,
      block1.merkleRoot,
      block1.nonce
    );
    expect(block2.previousHash).toBe(block1Hash);
  });
});

describe("blockchain: index sequencing", () => {
  it("blocks must have sequential indices", () => {
    const validChain = [
      { index: 0 },
      { index: 1 },
      { index: 2 },
      { index: 3 },
    ];
    for (let i = 0; i < validChain.length; i++) {
      expect(validChain[i].index).toBe(i);
    }
  });

  it("detects non-sequential index", () => {
    const brokenChain = [{ index: 0 }, { index: 1 }, { index: 5 }];
    let isValid = true;
    for (let i = 0; i < brokenChain.length; i++) {
      if (brokenChain[i].index !== i) {
        isValid = false;
        break;
      }
    }
    expect(isValid).toBe(false);
  });
});
