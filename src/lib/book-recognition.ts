/**
 * Book Cover Recognition — Camera-based book identification.
 *
 * Sprint T - Tier 4 #13: AR Book Discovery.
 *
 * Features:
 * - Scan book cover via device camera
 * - Match against book database (color, ISBN, title OCR)
 * - Suggest similar books (visual similarity)
 * - Virtual bookshelf 3D (preview feature)
 * - AR treasure hunt (find hidden books in library)
 *
 * Architecture:
 * - Browser: WebRTC camera + Image capture
 * - Backend: ISBN lookup + cover hash matching
 * - Client-side: Color histogram + visual fingerprint
 * - Offline-first: cache last N identified books
 *
 * Note: This library provides the data layer. The UI component
 * handles camera capture and image hashing in browser.
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// ===== Types =====

export interface CoverSignature {
  bookId: string;
  title: string;
  author: string;
  /** Base64-encoded perceptual hash of cover (8x8 dHash) */
  perceptualHash: string;
  /** Dominant color palette (5 colors hex) */
  dominantColors: string[];
  /** Aspect ratio of cover */
  aspectRatio: number;
}

export interface BookMatch {
  bookId: string;
  title: string;
  author: string;
  confidence: number; // 0-1
  matchType: "ISBN" | "TITLE_OCR" | "VISUAL_HASH" | "COLOR_SIMILARITY";
  alternativeMatches?: Array<{ bookId: string; title: string; confidence: number }>;
}

export interface ARBookshelfItem {
  bookId: string;
  title: string;
  author: string;
  coverColor: string;
  coverImage: string | null;
  position: { row: number; col: number };
  rotation: number; // -5 to 5 degrees
  /** For 3D effect */
  depth: number; // 0-1
}

export interface ARTreasureHunt {
  id: string;
  name: string;
  description: string;
  hint: string;
  bookId: string;
  rewardPoints: number;
  expiresAt: Date;
  foundBy: string[]; // member IDs
}

export interface ScanResult {
  matches: BookMatch[];
  /** Top match if confidence > 0.7 */
  bestMatch: BookMatch | null;
  scanDurationMs: number;
  suggestions: string[];
}

// ===== ISBN Lookup =====

/**
 * Lookup book by ISBN (most reliable).
 */
export async function lookupByISBN(isbn: string): Promise<BookMatch | null> {
  if (!isbn || isbn.length < 10) return null;

  // Clean ISBN
  const cleanISBN = isbn.replace(/[-\s]/g, "");

  const book = await db.book.findFirst({
    where: {
      OR: [
        { isbn: cleanISBN },
        { isbn: { contains: cleanISBN } },
      ],
    },
    include: { authors: { include: { author: true } } },
  });

  if (!book) return null;

  return {
    bookId: book.id,
    title: book.title,
    author: book.authors.map((ba) => ba.author.name).join(", ") || "Unknown",
    confidence: 0.95,
    matchType: "ISBN",
  };
}

/**
 * Lookup by title (OCR fallback).
 */
export async function lookupByTitle(
  titleText: string
): Promise<BookMatch | null> {
  if (!titleText || titleText.length < 3) return null;

  const normalized = titleText.toLowerCase().trim();

  // Try exact match
  let book = await db.book.findFirst({
    where: { title: { contains: normalized } },
    include: { authors: { include: { author: true } } },
  });

  // Try fuzzy match (first 5 chars)
  if (!book && normalized.length >= 5) {
    const prefix = normalized.slice(0, 5);
    book = await db.book.findFirst({
      where: { title: { contains: prefix } },
      include: { authors: { include: { author: true } } },
    });
  }

  if (!book) return null;

  return {
    bookId: book.id,
    title: book.title,
    author: book.authors.map((ba) => ba.author.name).join(", ") || "Unknown",
    confidence: 0.6,
    matchType: "TITLE_OCR",
  };
}

// ===== Visual Hash Matching =====

/**
 * Match book by perceptual hash.
 * Client sends dHash (8x8 = 16 hex chars), we look up.
 */
export async function lookupByVisualHash(
  perceptualHash: string
): Promise<BookMatch | null> {
  if (!perceptualHash || perceptualHash.length !== 16) return null;

  const allHashes = await db.coverSignature.findMany({
    include: {
      book: { include: { authors: { include: { author: true } } } },
    },
  });

  // Find closest hash using Hamming distance
  let bestMatch: { book: any; distance: number } | null = null;
  for (const sig of allHashes) {
    const distance = hammingDistance(perceptualHash, sig.perceptualHash);
    if (bestMatch === null || distance < bestMatch.distance) {
      bestMatch = { book: sig.book, distance };
    }
  }

  if (!bestMatch) return null;

  // Confidence: 0% distance = 1.0, 32 max distance (16 hex chars × 2) = 0
  const confidence = Math.max(0, 1 - bestMatch.distance / 32);

  return {
    bookId: bestMatch.book.id,
    title: bestMatch.book.title,
    author:
      bestMatch.book.authors.map((ba: any) => ba.author.name).join(", ") ||
      "Unknown",
    confidence,
    matchType: "VISUAL_HASH",
  };
}

/**
 * Save a cover signature for future matching.
 */
export async function saveCoverSignature(
  bookId: string,
  signature: Omit<CoverSignature, "bookId" | "title" | "author">
): Promise<void> {
  try {
    await db.coverSignature.upsert({
      where: { bookId },
      create: {
        bookId,
        perceptualHash: signature.perceptualHash,
        dominantColors: JSON.stringify(signature.dominantColors),
        aspectRatio: signature.aspectRatio,
      },
      update: {
        perceptualHash: signature.perceptualHash,
        dominantColors: JSON.stringify(signature.dominantColors),
        aspectRatio: signature.aspectRatio,
      },
    });
  } catch (err) {
    logger.warn("Failed to save cover signature", { error: String(err) });
  }
}

// ===== Color Similarity =====

/**
 * Match by dominant colors.
 * Returns book with most similar color palette.
 */
export async function lookupByColors(
  colors: string[]
): Promise<BookMatch | null> {
  if (!colors || colors.length === 0) return null;

  const allHashes = await db.coverSignature.findMany({
    include: {
      book: { include: { authors: { include: { author: true } } } },
    },
  });

  let bestMatch: { book: any; similarity: number } | null = null;
  for (const sig of allHashes) {
    const sigColors = JSON.parse(sig.dominantColors) as string[];
    const similarity = colorSimilarity(colors, sigColors);
    if (bestMatch === null || similarity > bestMatch.similarity) {
      bestMatch = { book: sig.book, similarity };
    }
  }

  if (!bestMatch || bestMatch.similarity < 0.3) return null;

  return {
    bookId: bestMatch.book.id,
    title: bestMatch.book.title,
    author:
      bestMatch.book.authors.map((ba: any) => ba.author.name).join(", ") ||
      "Unknown",
    confidence: bestMatch.similarity * 0.5, // Colors are weaker signal
    matchType: "COLOR_SIMILARITY",
  };
}

// ===== Combined Scan =====

/**
 * Combined scan using all available signals.
 * Returns the best match.
 */
export async function scanBook(input: {
  isbn?: string;
  ocrText?: string;
  perceptualHash?: string;
  colors?: string[];
}): Promise<ScanResult> {
  const start = Date.now();
  const matches: BookMatch[] = [];

  // Try ISBN first (most reliable)
  if (input.isbn) {
    const m = await lookupByISBN(input.isbn);
    if (m) matches.push(m);
  }

  // Try title OCR
  if (input.ocrText) {
    const m = await lookupByTitle(input.ocrText);
    if (m) matches.push(m);
  }

  // Try visual hash
  if (input.perceptualHash) {
    const m = await lookupByVisualHash(input.perceptualHash);
    if (m) matches.push(m);
  }

  // Try colors (weakest signal)
  if (input.colors && input.colors.length > 0) {
    const m = await lookupByColors(input.colors);
    if (m) matches.push(m);
  }

  // Sort by confidence
  matches.sort((a, b) => b.confidence - a.confidence);

  // Generate suggestions
  const suggestions: string[] = [];
  if (matches.length === 0) {
    suggestions.push("Coba scan barcode di belakang buku");
    suggestions.push("Pastikan pencahayaan cukup");
    suggestions.push("Atau gunakan pencarian manual");
  } else if (matches[0].confidence < 0.6) {
    suggestions.push("Confidence rendah, coba lebih dekat");
    suggestions.push("Atau gunakan pencarian manual");
  }

  return {
    matches,
    bestMatch: matches[0]?.confidence > 0.6 ? matches[0] : null,
    scanDurationMs: Date.now() - start,
    suggestions,
  };
}

// ===== AR Bookshelf =====

/**
 * Generate virtual bookshelf layout for a list of books.
 * Creates 3D-ready positions.
 */
export function generateBookshelf(
  books: Array<{ id: string; title: string; author: string; coverColor: string; coverImage: string | null }>,
  options: { shelfWidth?: number; rowsPerShelf?: number } = {}
): ARBookshelfItem[] {
  const { shelfWidth = 8, rowsPerShelf = 4 } = options;
  const items: ARBookshelfItem[] = [];

  books.forEach((book, idx) => {
    const row = Math.floor(idx / shelfWidth);
    const col = idx % shelfWidth;
    // Slight random rotation for natural look
    const rotation = ((idx * 7) % 11) - 5;
    items.push({
      bookId: book.id,
      title: book.title,
      author: book.author,
      coverColor: book.coverColor,
      coverImage: book.coverImage,
      position: { row, col },
      rotation,
      depth: 0.5 + (col % 3) * 0.15,
    });
  });

  return items;
}

// ===== AR Treasure Hunt =====

/**
 * Create an AR treasure hunt for a book.
 */
export async function createARTreasureHunt(
  bookId: string,
  name: string,
  hint: string,
  rewardPoints: number,
  expiresAt: Date
): Promise<string> {
  const hunt = await db.aRTreasureHunt.create({
    data: {
      bookId,
      name,
      description: hint,
      hint,
      rewardPoints,
      expiresAt,
    },
  });
  return hunt.id;
}

/**
 * Mark treasure hunt as found by member.
 */
export async function markTreasureFound(
  huntId: string,
  memberId: string
): Promise<{ success: boolean; alreadyFound: boolean; rewardPoints: number }> {
  const hunt = await db.aRTreasureHunt.findUnique({ where: { id: huntId } });
  if (!hunt) {
    return { success: false, alreadyFound: false, rewardPoints: 0 };
  }

  const found = (hunt.foundBy as string[]) || [];
  if (found.includes(memberId)) {
    return { success: true, alreadyFound: true, rewardPoints: 0 };
  }

  // Add to found list
  const updatedFound = [...found, memberId];
  await db.aRTreasureHunt.update({
    where: { id: huntId },
    data: { foundBy: JSON.stringify(updatedFound) },
  });

  // Award points
  return { success: true, alreadyFound: false, rewardPoints: hunt.rewardPoints };
}

/**
 * Get active treasure hunts.
 */
export async function getActiveTreasureHunts(): Promise<ARTreasureHunt[]> {
  const hunts = await db.aRTreasureHunt.findMany({
    where: { expiresAt: { gt: new Date() } },
    include: { book: { select: { id: true, title: true } } },
  });

  return hunts.map((h) => ({
    id: h.id,
    name: h.name,
    description: h.description,
    hint: h.hint,
    bookId: h.bookId,
    rewardPoints: h.rewardPoints,
    expiresAt: h.expiresAt,
    foundBy: JSON.parse((h.foundBy as string) || "[]"),
  }));
}

// ===== Pure Helper Functions =====

/**
 * Calculate Hamming distance between two hex strings.
 */
export function hammingDistance(hex1: string, hex2: string): number {
  if (hex1.length !== hex2.length) return Infinity;

  let distance = 0;
  for (let i = 0; i < hex1.length; i++) {
    const a = parseInt(hex1[i], 16);
    const b = parseInt(hex2[i], 16);
    let xor = a ^ b;
    while (xor > 0) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
}

/**
 * Calculate color palette similarity (0-1).
 * Higher = more similar.
 */
export function colorSimilarity(colors1: string[], colors2: string[]): number {
  if (!colors1.length || !colors2.length) return 0;

  let totalSimilarity = 0;
  let comparisons = 0;

  for (const c1 of colors1) {
    let bestMatch = 0;
    for (const c2 of colors2) {
      // Similarity = 1 - distance
      const sim = 1 - colorDistance(c1, c2);
      bestMatch = Math.max(bestMatch, sim);
    }
    totalSimilarity += bestMatch;
    comparisons++;
  }

  return comparisons > 0 ? totalSimilarity / comparisons : 0;
}

/**
 * Distance between two hex colors (0-1).
 * 0 = same, 1 = opposite
 */
export function colorDistance(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return 1;

  // Weighted Euclidean distance
  const rMean = (rgb1.r + rgb2.r) / 2;
  const dr = rgb1.r - rgb2.r;
  const dg = rgb1.g - rgb2.g;
  const db = rgb1.b - rgb2.b;
  const distance = Math.sqrt(
    (2 + rMean / 256) * dr * dr +
      4 * dg * dg +
      (2 + (255 - rMean) / 256) * db * db
  );
  return Math.min(1, distance / 764.83);
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return null;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return { r, g, b };
}

/**
 * Generate perceptual hash (dHash) for testing.
 * In real usage, this happens client-side.
 */
export function generateDHashPlaceholder(width: number = 8, height: number = 8): string {
  // Random 16-char hex (in real usage, computed from image)
  return Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
}
