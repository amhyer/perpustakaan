/**
 * Client untuk mengambil data katalog dari SIBI (Pusat Perbukuan Kemendikdasmen).
 *
 * PENTING: panggil ini HANYA dari server (Route Handler / Server Component),
 * jangan dari client component -- supaya base URL tidak berubah sewaktu-waktu
 * tanpa kamu sadari dan supaya bisa ditambah caching/rate-limit di proxy-mu.
 *
 * Catatan dari observasi: parameter `q` / `search` / `title` di API SIBI
 * DIABAIKAN oleh server (selalu balikin hasil default). Jadi pencarian judul
 * harus dilakukan di sisi kita sendiri: fetch dengan limit besar, lalu filter
 * lokal (lihat searchSibiBooks di bawah).
 */

import type { SibiListResponse, SibiBook, SibiSourceType } from './sibi-types';

const BASE_URL = 'https://api.buku.cloudapp.web.id/api/catalogue';

const ENDPOINTS: Record<SibiSourceType, string> = {
  'text-k13': '/getTextBooks',
  penggerak: '/getPenggerakTextBooks',
  'non-teks': '/getNonTextBooks',
  tag: '/getBooksByTag',
};

async function fetchSibi(
  path: string,
  params: Record<string, string | number> = {}
): Promise<SibiListResponse> {
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)])
  );
  const url = `${BASE_URL}${path}?${qs.toString()}`;

  const res = await fetch(url, {
    // katalog SIBI jarang berubah -- cache 6 jam cukup aman
    next: { revalidate: 21600 },
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`SIBI API error ${res.status} pada ${path}`);
  }

  return res.json();
}

export const sibi = {
  /** Ambil daftar buku teks K-13 */
  getTextBooks: (limit = 100) =>
    fetchSibi(ENDPOINTS['text-k13'], { limit, order_by: 'updated_at' }),

  /** Ambil daftar buku Kurikulum Merdeka (Buku Sekolah Penggerak) */
  getPenggerakTextBooks: (limit = 100) =>
    fetchSibi(ENDPOINTS.penggerak, { limit, order_by: 'updated_at' }),

  /** Ambil daftar buku non-teks */
  getNonTextBooks: (limit = 100) =>
    fetchSibi(ENDPOINTS['non-teks'], { limit, order_by: 'updated_at' }),

  /** Ambil buku berdasarkan tag/tema, mis. "STEM" */
  getBooksByTag: (tag: string, limit = 100) =>
    fetchSibi(ENDPOINTS.tag, { Tag: tag, limit }),

  /**
   * Cari buku berdasarkan kata kunci judul, penulis, atau ISBN.
   * Karena API SIBI tidak mendukung search server-side, kita ambil
   * dataset (dibatasi `poolLimit`) lalu filter di sini.
   */
  async search(
    keyword: string,
    source: SibiSourceType = 'text-k13',
    poolLimit = 2000
  ): Promise<SibiBook[]> {
    const data =
      source === 'penggerak'
        ? await sibi.getPenggerakTextBooks(poolLimit)
        : source === 'non-teks'
        ? await sibi.getNonTextBooks(poolLimit)
        : await sibi.getTextBooks(poolLimit);

    const kw = keyword.trim().toLowerCase();
    if (!kw) return data.results;

    return data.results.filter(
      (b) =>
        b.title.toLowerCase().includes(kw) ||
        b.writer?.toLowerCase().includes(kw) ||
        b.isbn?.toLowerCase().includes(kw)
    );
  },
};