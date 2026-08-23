"use client";

/**
 * RewardForm — Modal untuk create/edit hadiah.
 * Pakai react-hook-form untuk validasi.
 */

import { useState } from "react";
import { Save, X, ImageIcon } from "lucide-react";
import { api } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/layout/card";
import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import { Textarea } from "@/components/ui/form/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RewardFormData {
  id?: string;
  name: string;
  description?: string;
  imageUrl?: string;
  category: string;
  pointCost: number;
  minRole?: string;
  stock?: number | null;
  requiresApproval?: boolean;
  maxPerMember?: number | null;
  cooldownDays?: number | null;
  isFeatured?: boolean;
  isActive?: boolean;
}

interface RewardFormProps {
  initial?: RewardFormData;
  onSuccess: () => void;
  onCancel: () => void;
}

const CATEGORIES = [
  { value: "BOOK", label: "📚 Buku", emoji: "📚" },
  { value: "STATIONERY", label: "✏️ Stationery", emoji: "✏️" },
  { value: "VOUCHER", label: "🎟️ Voucher", emoji: "🎟️" },
  { value: "GIFT_CARD", label: "🎁 Gift Card", emoji: "🎁" },
  { value: "PRIVILEGE", label: "👑 Privilege", emoji: "👑" },
  { value: "CERTIFICATE", label: "🎓 Certificate", emoji: "🎓" },
  { value: "CUSTOM", label: "🎲 Custom", emoji: "🎲" },
];

const ROLES = [
  { value: "STUDENT", label: "Siswa only" },
  { value: "TEACHER", label: "Guru only" },
  { value: "LIBRARIAN", label: "Pustakawan" },
];

export function RewardForm({ initial, onSuccess, onCancel }: RewardFormProps) {
  const isEdit = !!initial?.id;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [form, setForm] = useState<any>(
    initial || {
      name: "",
      description: "",
      imageUrl: "",
      category: "STATIONERY",
      pointCost: 100,
      minRole: "STUDENT",
      stock: null as number | null,
      requiresApproval: false,
      maxPerMember: null as number | null,
      cooldownDays: null as number | null,
      isFeatured: false,
      isActive: true,
    }
  );
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (field: string, value: unknown) => {
    setForm((prev: Record<string, unknown>) => ({ ...prev, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name || form.name.trim().length < 3) {
      errs.name = "Nama minimal 3 karakter";
    }
    if (!form.category) {
      errs.category = "Kategori wajib dipilih";
    }
    if (!form.pointCost || form.pointCost < 1) {
      errs.pointCost = "Poin minimal 1";
    }
    if (form.maxPerMember !== null && form.maxPerMember !== undefined && form.maxPerMember < 1) {
      errs.maxPerMember = "Minimal 1";
    }
    if (form.cooldownDays !== null && form.cooldownDays !== undefined && form.cooldownDays < 0) {
      errs.cooldownDays = "Tidak boleh negatif";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description?.trim() || undefined,
        imageUrl: form.imageUrl?.trim() || undefined,
        category: form.category,
        pointCost: parseInt(form.pointCost),
        minRole: form.minRole || "STUDENT",
        stock:
          form.stock === "" || form.stock === null || form.stock === undefined
            ? null
            : parseInt(form.stock),
        requiresApproval: !!form.requiresApproval,
        maxPerMember:
          form.maxPerMember === "" || form.maxPerMember === null || form.maxPerMember === undefined
            ? null
            : parseInt(form.maxPerMember),
        cooldownDays:
          form.cooldownDays === "" || form.cooldownDays === null || form.cooldownDays === undefined
            ? null
            : parseInt(form.cooldownDays),
        isFeatured: !!form.isFeatured,
        ...(isEdit && { isActive: form.isActive !== false }),
      };

      if (isEdit) {
        await api.patch(`/api/rewards/admin/${initial!.id}`, payload);
        toast.success("Hadiah berhasil diupdate");
      } else {
        await api.post("/api/rewards/admin", payload);
        toast.success("Hadiah berhasil ditambahkan");
      }
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <Card className="max-w-2xl w-full my-8">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">
              {isEdit ? "Edit Hadiah" : "Tambah Hadiah Baru"}
            </h2>
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="text-sm font-medium block mb-1">
                Nama Hadiah <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Mis: Bookmark Custom Eksklusif"
                maxLength={200}
              />
              {errors.name && <div className="text-xs text-red-500 mt-1">{errors.name}</div>}
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium block mb-1">Deskripsi</label>
              <Textarea
                value={form.description || ""}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Jelaskan hadiah ini..."
                rows={2}
                maxLength={1000}
              />
            </div>

            {/* Image URL */}
            <div>
              <label className="text-sm font-medium block mb-1 flex items-center gap-1">
                <ImageIcon className="h-3.5 w-3.5" />
                URL Gambar (opsional)
              </label>
              <Input
                value={form.imageUrl || ""}
                onChange={(e) => update("imageUrl", e.target.value)}
                placeholder="https://..."
                type="url"
              />
              <div className="text-xs text-slate-500 mt-1">
                Kosongkan untuk pakai emoji kategori otomatis
              </div>
            </div>

            {/* Category & Min Role */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium block mb-1">
                  Kategori <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.category}
                  onChange={(e) => update("category", e.target.value)}
                  className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Untuk Role</label>
                <select
                  value={form.minRole || "STUDENT"}
                  onChange={(e) => update("minRole", e.target.value)}
                  className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Point Cost & Stock */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium block mb-1">
                  Biaya Poin <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min={1}
                  value={form.pointCost}
                  onChange={(e) => update("pointCost", e.target.value)}
                />
                {errors.pointCost && (
                  <div className="text-xs text-red-500 mt-1">{errors.pointCost}</div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">
                  Stok (kosongkan = unlimited)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={form.stock ?? ""}
                  onChange={(e) => update("stock", e.target.value)}
                  placeholder="Unlimited"
                />
              </div>
            </div>

            {/* Max per member & Cooldown */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium block mb-1">
                  Max Klaim per Siswa
                </label>
                <Input
                  type="number"
                  min={1}
                  value={form.maxPerMember ?? ""}
                  onChange={(e) => update("maxPerMember", e.target.value)}
                  placeholder="Unlimited"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">
                  Cooldown (hari)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={form.cooldownDays ?? ""}
                  onChange={(e) => update("cooldownDays", e.target.value)}
                  placeholder="None"
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="border-t pt-4 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!form.requiresApproval}
                  onChange={(e) => update("requiresApproval", e.target.checked)}
                />
                <span className="text-sm">Perlu approval pustakawan</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!form.isFeatured}
                  onChange={(e) => update("isFeatured", e.target.checked)}
                />
                <span className="text-sm">Tampilkan sebagai Featured</span>
              </label>
              {isEdit && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive !== false}
                    onChange={(e) => update("isActive", e.target.checked)}
                  />
                  <span className="text-sm">Aktif (uncheck untuk nonaktifkan)</span>
                </label>
              )}
            </div>

            {/* Actions */}
            <div className="border-t pt-4 flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
                Batal
              </Button>
              <Button type="submit" disabled={submitting} className="min-w-32">
                <Save className="h-4 w-4 mr-2" />
                {submitting ? "Menyimpan..." : isEdit ? "Update" : "Tambah"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
