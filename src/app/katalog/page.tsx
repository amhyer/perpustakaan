import { PublicCatalog } from "@/components/app/public/public-catalog";

export const metadata = {
  title: "Katalog Umum — Jendela Ilmu",
  description: "Cari koleksi Perpustakaan Jendela Ilmu tanpa perlu masuk.",
};

export default function KatalogPage() {
  return <PublicCatalog />;
}
