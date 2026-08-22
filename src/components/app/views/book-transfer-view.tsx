"use client";

import { useState } from "react";
import {
  ArrowRightLeft,
  Loader2,
  MapPin,
  Search,
  Package,
  Calendar,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api-client";

import { Badge } from "@/components/ui/data-display/badge";
import { Button } from "@/components/ui/form/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/layout/card";
import { Input } from "@/components/ui/form/input";
import { Label } from "@/components/ui/form/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/form/select";
import { Spinner } from "@/components/app/shared/loading";

interface Location {
  id: string;
  name: string;
  code: string;
}

interface BookItemRow {
  id: string;
  itemCode: string;
  status: string;
  condition: string | null;
  book: { id: string; title: string; author: string; locationId: string | null };
}

interface TransferRow {
  id: string;
  itemCode: string;
  status: string;
  book: { id: string; title: string; author: string };
}

interface TransferRecord {
  id: string;
  reason: string | null;
  createdAt: string;
  bookItem: { itemCode: string; book: { title: string; author: string } };
  fromLocation: { name: string; code: string } | null;
  toLocation: { name: string; code: string };
  user: { name: string };
}

interface TransferData {
  transfers: TransferRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  stats: { totalTransfers: number };
  topLocations: { locationId: string; locationName: string; count: number }[];
}

export function BookTransferView() {
  const { data: locations } = useFetch<Location[]>("/api/locations");
  const { data: transferData, loading, refetch } = useFetch<TransferData>("/api/books/transfers");

  const [itemCode, setItemCode] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [reason, setReason] = useState("");
  const [searching, setSearching] = useState(false);
  const [foundItem, setFoundItem] = useState<BookItemRow | null>(null);
  const [searchError, setSearchError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSearchItem() {
    if (!itemCode.trim()) return;
    setSearching(true);
    setSearchError("");
    setFoundItem(null);
    try {
      const res = await api.get<BookItemRow>(`/api/loans/active-by-item-code?itemCode=${encodeURIComponent(itemCode.trim())}`);
      setFoundItem(res);
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "Eksemplar tidak ditemukan");
    } finally {
      setSearching(false);
    }
  }

  async function handleTransfer() {
    if (!foundItem || !toLocationId) return;
    setSubmitting(true);
    try {
      await api.post("/api/books/transfer", {
        itemCode: foundItem.itemCode,
        toLocationId,
        reason: reason || null,
      });
      toast.success(`${foundItem.itemCode} berhasil dipindah.`);
      setItemCode("");
      setToLocationId("");
      setReason("");
      setFoundItem(null);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memindahkan buku");
    } finally {
      setSubmitting(false);
    }
  }

  const fromLoc = locations?.find((l) => l.id === foundItem?.book?.locationId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <ArrowRightLeft className="h-6 w-6" />
        Pemindahan Rak
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Transfer Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pindahkan Eksemplar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search item */}
            <div>
              <Label htmlFor="itemCode">Kode Barcode Eksemplar</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="itemCode"
                  placeholder="Masukkan kode barcode..."
                  value={itemCode}
                  onChange={(e) => setItemCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchItem()}
                />
                <Button variant="outline" onClick={handleSearchItem} disabled={searching}>
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              {searchError && <p className="text-sm text-destructive mt-1">{searchError}</p>}
            </div>

            {/* Found item details */}
            {foundItem && (
              <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{foundItem.itemCode}</span>
                  <Badge variant="outline">{foundItem.status}</Badge>
                </div>
                <p className="text-sm">{foundItem.book.title}</p>
                <p className="text-xs text-muted-foreground">{foundItem.book.author}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>Lokasi: {fromLoc?.name || "Tidak ada"}</span>
                </div>
              </div>
            )}

            {/* Destination */}
            {foundItem && (
              <>
                <div>
                  <Label>Lokasi Tujuan</Label>
                  <Select value={toLocationId} onValueChange={setToLocationId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Pilih lokasi tujuan..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(locations ?? [])
                        .filter((l) => l.id !== foundItem.book.locationId)
                        .map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name} ({loc.code})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="reason">Alasan (opsional)</Label>
                  <Input
                    id="reason"
                    placeholder="Contoh: Reorganisasi kategori..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <Button
                  onClick={handleTransfer}
                  disabled={submitting || !toLocationId}
                  className="w-full"
                >
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Pindahkan
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Stats sidebar */}
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold">{transferData?.stats?.totalTransfers ?? 0}</div>
                <div className="text-sm text-muted-foreground">Total Pemindahan</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{locations?.length ?? 0}</div>
                <div className="text-sm text-muted-foreground">Total Lokasi</div>
              </div>
            </CardContent>
          </Card>

          {transferData?.topLocations && transferData.topLocations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lokasi Tujuan Terpopuler</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {transferData.topLocations.map((loc) => (
                  <div key={loc.locationId} className="flex items-center justify-between text-sm">
                    <span className="truncate">{loc.locationName}</span>
                    <Badge variant="secondary">{loc.count}x</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Transfer History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Riwayat Pemindahan
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Spinner />
          ) : (transferData?.transfers ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Belum ada riwayat pemindahan.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Waktu</th>
                    <th className="pb-2 font-medium">Eksemplar</th>
                    <th className="pb-2 font-medium">Buku</th>
                    <th className="pb-2 font-medium">Dari</th>
                    <th className="pb-2 font-medium">Ke</th>
                    <th className="pb-2 font-medium">Oleh</th>
                    <th className="pb-2 font-medium">Alasan</th>
                  </tr>
                </thead>
                <tbody>
                  {(transferData?.transfers ?? []).map((t) => (
                    <tr key={t.id} className="border-b last:border-0">
                      <td className="py-2 whitespace-nowrap">
                        {new Date(t.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="py-2 font-mono text-xs">{t.bookItem.itemCode}</td>
                      <td className="py-2">
                        <div>{t.bookItem.book.title}</div>
                      </td>
                      <td className="py-2">{t.fromLocation?.name || "-"}</td>
                      <td className="py-2">{t.toLocation.name}</td>
                      <td className="py-2">{t.user.name}</td>
                      <td className="py-2 text-muted-foreground">{t.reason || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}