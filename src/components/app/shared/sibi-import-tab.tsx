// src/components/app/shared/sibi-import-tab.tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/form/input";
import { Button } from "@/components/ui/form/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/form/select";
import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api-client";
import { SibiBook, SibiSourceType } from "@/lib/sibi-types";
import { toast } from "sonner";
import { BookPlus, Check, Loader2 } from "lucide-react";

type SibiSource = Exclude<SibiSourceType, "tag">;

export function SibiImportTab({ onImportSuccess }: { onImportSuccess: () => void }) {
  const [search, setSearch] = useState("");
  const [source, setSource] = useState<SibiSource>("text-k13");
const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SibiBook[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const handleSearch = async () => {
    if (!search) return;
    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/books/import-sibi?q=${search}&source=${source}`
      );
      const data = await response.json();
      setResults(data);
    } catch (error) {
      toast.error("Gagal mencari buku di SIBI.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleImport = async (sibiId: string) => {
    setIsImporting(true);
    try {
      await api.post(`/api/books/import-sibi`, { sibiId, source });
      toast.success("Buku berhasil diimpor!");
      setResults(results.filter(r => r.id !== sibiId));
      onImportSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengimpor buku.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Cari judul, penulis, ISBN..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Select value={source} onValueChange={(v) => setSource(v as SibiSource)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Pilih sumber" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text-k13">Teks K-13</SelectItem>
            <SelectItem value="penggerak">Kurikulum Merdeka</SelectItem>
            <SelectItem value="non-teks">Non-Teks</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleSearch} disabled={isSearching || !search}>
          {isSearching && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Cari
        </Button>
      </div>

      <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-2">
        {results.map((book) => (
          <div key={book.id} className="flex items-center gap-4 p-2 border rounded-md">
            <img
              src={book.image}
              alt={book.title}
              loading="lazy"
              className="h-[70px] w-[50px] shrink-0 object-cover rounded"
            />
            <div className="flex-1">
              <p className="font-semibold">{book.title}</p>
              <p className="text-sm text-muted-foreground">{book.writer || "Penulis tidak diketahui"}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleImport(book.id)}
              disabled={isImporting}
            >
              {isImporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BookPlus className="w-4 h-4 mr-2" />}
              Impor
            </Button>
          </div>
        ))}
         {isSearching && <div className="text-center p-4">Mencari...</div>}
         {!isSearching && results.length === 0 && search && (
             <div className="text-center p-4 text-muted-foreground">Tidak ada hasil ditemukan.</div>
         )}
      </div>
    </div>
  );
}
