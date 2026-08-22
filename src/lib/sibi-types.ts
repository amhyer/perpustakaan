// src/lib/sibi-types.ts
// Tipe berdasarkan observasi respons API SIBI (api.buku.cloudapp.web.id)

/** Sumber katalog SIBI yang didukung client. */
export type SibiSourceType = "text-k13" | "penggerak" | "non-teks" | "tag";

/** Satu item buku dari API SIBI. Field mengikuti respons aktual (diverifikasi live). */
export interface SibiBook {
  id: string;
  het_id: string | null;
  title: string;
  slug: string | null;
  image: string; // cover thumbnail
  attachment: string; // URL file digital (PDF)
  description: string;
  published_year: string | number | null;
  class: string | null;
  level: string | null;
  writer: string | null;
  reviewer: string | null;
  translator: string | null;
  adapter: string | null;
  designer: string | null;
  cover_designer: string | null;
  ilustrator: string | null;
  editor: string | null;
  aligner: string | null;
  publisher: string;
  contributor: string | null;
  language: string | null;
  context: string | null;
  subject: string | null;
  format: string | null;
  isbn: string | null;
  curriculum: string | null;
  collation: string | null;
  type: string | null;
  edition: string | null; // biasanya tahun terbit (mis. "2018")
  unit: string | null;
  status: string | null;
  category: string | null;
  book_type: string | null;
  version: string | null;
  price_zone_1: string | number | null;
  price_zone_2: string | number | null;
  price_zone_3: string | number | null;
  price_zone_4: string | number | null;
  price_zone_5A: string | number | null;
  price_zone_5B: string | number | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
}

/** Bentuk umum respons daftar dari API SIBI. */
export interface SibiListResponse {
  status: string;
  results: SibiBook[];
  totalSize?: number;
  pagination?: {
    total_items?: number;
    page?: number;
    per_page?: number;
  } | null;
}