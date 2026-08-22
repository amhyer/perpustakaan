"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Building2,
  Plus,
  Users,
  Calendar,
  Clock,
  Edit,
  Trash2,
  X,
  Check,
  Loader2,
  MapPin,
  BookOpen,
  Presentation,
  Monitor,
  Coffee,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/layout/card";
import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import { Label } from "@/components/ui/form/label";
import { Textarea } from "@/components/ui/form/textarea";
import { Badge } from "@/components/ui/data-display/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/form/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/overlay/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/overlay/alert-dialog";
import { PageHeader, EmptyState } from "@/components/app/shared/page-header";
import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";
import { formatDate } from "@/lib/constants";

interface Room {
  id: string;
  name: string;
  type: string;
  capacity: number;
  description: string | null;
  isActive: boolean;
  bookingsOnDate?: RoomBooking[];
}

interface RoomBooking {
  id: string;
  roomId: string;
  room: { name: string; type: string; capacity: number };
  member: { fullName: string; memberNumber: string; classGrade: string | null } | null;
  bookerName: string;
  bookerPhone: string | null;
  startTime: string;
  endTime: string;
  purpose: string | null;
  status: string;
  notes: string | null;
}

const ROOM_TYPE_ICONS: Record<string, any> = {
  READING: BookOpen,
  DISCUSSION: Users,
  AV: Presentation,
  COMPUTER: Monitor,
  OTHER: Coffee,
};

const ROOM_TYPE_LABELS: Record<string, string> = {
  READING: "Ruang Baca",
  DISCUSSION: "Ruang Diskusi",
  AV: "Audio Visual",
  COMPUTER: "Komputer",
  OTHER: "Lainnya",
};

const ROOM_TYPE_COLORS: Record<string, string> = {
  READING: "bg-blue-100 text-blue-700 border-blue-200",
  DISCUSSION: "bg-emerald-100 text-emerald-700 border-emerald-200",
  AV: "bg-violet-100 text-violet-700 border-violet-200",
  COMPUTER: "bg-amber-100 text-amber-700 border-amber-200",
  OTHER: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

export function RoomsView() {
  const user = useAppStore((s) => s.user);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const { data: rooms, loading, refetch } = useFetch<Room[]>(
    `/api/rooms?date=${selectedDate}`
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "READING", capacity: "10", description: "" });
  const [saving, setSaving] = useState(false);

  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingRoom, setBookingRoom] = useState<Room | null>(null);
  const [bookingForm, setBookingForm] = useState({
    date: selectedDate,
    startTime: "09:00",
    endTime: "11:00",
    purpose: "",
  });
  const [savingBooking, setSavingBooking] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Nama ruangan wajib diisi");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/rooms", {
        name: form.name.trim(),
        type: form.type,
        capacity: parseInt(form.capacity) || 10,
        description: form.description.trim() || null,
      });
      toast.success("Ruangan ditambahkan");
      setCreateOpen(false);
      setForm({ name: "", type: "READING", capacity: "10", description: "" });
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal");
    } finally {
      setSaving(false);
    }
  }

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!bookingRoom) return;
    setSavingBooking(true);
    try {
      const startTime = new Date(`${bookingForm.date}T${bookingForm.startTime}:00`);
      const endTime = new Date(`${bookingForm.date}T${bookingForm.endTime}:00`);
      if (endTime <= startTime) {
        toast.error("Waktu selesai harus setelah mulai");
        setSavingBooking(false);
        return;
      }
      await api.post("/api/room-bookings", {
        roomId: bookingRoom.id,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        purpose: bookingForm.purpose.trim() || null,
      });
      toast.success("Booking berhasil! Ruangan sudah dipesan untuk Anda.");
      setBookingOpen(false);
      setBookingForm({ date: selectedDate, startTime: "09:00", endTime: "11:00", purpose: "" });
      setBookingRoom(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal");
    } finally {
      setSavingBooking(false);
    }
  }

  async function handleCancelBooking(bookingId: string) {
    try {
      await api.delete(`/api/room-bookings/${bookingId}`);
      toast.success("Booking dibatalkan");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal");
    }
  }

  async function handleDeleteRoom() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/api/rooms/${deleteId}`);
      toast.success("Ruangan dinonaktifkan");
      setDeleteId(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal");
    } finally {
      setDeleting(false);
    }
  }

  const isLibrarian = user?.role === "LIBRARIAN" || user?.role === "PUSTAKAWAN_JUNIOR";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ruangan Perpustakaan"
        description="Booking ruang baca, ruang diskusi, ruang AV, dan lainnya"
        icon={Building2}
        actions={
          isLibrarian ? (
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Tambah Ruangan
            </Button>
          ) : null
        }
      />

      {/* Date selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 flex-wrap">
            <Label htmlFor="booking-date" className="whitespace-nowrap">
              <Calendar className="inline h-4 w-4 mr-1" />
              Tanggal
            </Label>
            <Input
              id="booking-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
              min={new Date().toISOString().slice(0, 10)}
            />
            <span className="text-sm text-muted-foreground">
              {formatDate(selectedDate)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Rooms grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-32 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !rooms || rooms.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={Building2}
              title="Belum ada ruangan"
              description={isLibrarian ? "Tambah ruangan untuk mulai menerima booking." : "Hubungi pustakawan untuk informasi ruangan."}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => {
            const Icon = ROOM_TYPE_ICONS[room.type] || MapPin;
            const bookings = (room.bookingsOnDate || []).filter(
              (b) => b.status === "BOOKED" || b.status === "CHECKED_IN"
            );
            return (
              <Card key={room.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${ROOM_TYPE_COLORS[room.type] || ""} shrink-0`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{room.name}</CardTitle>
                        <Badge variant="outline" className="text-[10px] mt-0.5">
                          {ROOM_TYPE_LABELS[room.type] || room.type}
                        </Badge>
                      </div>
                    </div>
                    {isLibrarian && user?.role === "LIBRARIAN" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteId(room.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>Kapasitas: {room.capacity} orang</span>
                  </div>
                  {room.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{room.description}</p>
                  )}

                  {/* Bookings hari ini */}
                  {bookings.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t">
                      <p className="text-xs font-medium text-muted-foreground">
                        {bookings.length} booking hari ini:
                      </p>
                      {bookings.slice(0, 3).map((b) => (
                        <div
                          key={b.id}
                          className="flex items-center justify-between gap-2 text-xs bg-muted/50 px-2 py-1 rounded"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Clock className="h-3 w-3 shrink-0" />
                            <span className="font-mono">
                              {new Date(b.startTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                              -
                              {new Date(b.endTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <span className="truncate">{b.bookerName}</span>
                          </div>
                          {isLibrarian && (
                            <button
                              onClick={() => handleCancelBooking(b.id)}
                              className="text-destructive hover:text-destructive shrink-0"
                              title="Batalkan"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    onClick={() => {
                      setBookingRoom(room);
                      setBookingForm({ date: selectedDate, startTime: "09:00", endTime: "11:00", purpose: "" });
                      setBookingOpen(true);
                    }}
                    size="sm"
                    className="w-full gap-2"
                    variant={bookings.length === 0 ? "default" : "outline"}
                  >
                    <Calendar className="h-4 w-4" />
                    Booking
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog: Tambah ruangan */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Ruangan</DialogTitle>
            <DialogDescription>Ruangan baru untuk booking anggota perpustakaan.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateRoom} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="room-name">Nama Ruangan *</Label>
              <Input
                id="room-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Mis. Ruang Diskusi A"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="room-type">Tipe</Label>
              <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="READING">Ruang Baca</SelectItem>
                  <SelectItem value="DISCUSSION">Ruang Diskusi</SelectItem>
                  <SelectItem value="AV">Audio Visual</SelectItem>
                  <SelectItem value="COMPUTER">Komputer</SelectItem>
                  <SelectItem value="OTHER">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="room-capacity">Kapasitas (orang)</Label>
              <Input
                id="room-capacity"
                type="number"
                min="1"
                value={form.capacity}
                onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="room-desc">Deskripsi</Label>
              <Textarea
                id="room-desc"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                rows={2}
                placeholder="Opsional — informasi tambahan tentang ruangan"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>
                Batal
              </Button>
              <Button type="submit" disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Tambah
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Booking */}
      <Dialog
        open={bookingOpen}
        onOpenChange={(o) => {
          setBookingOpen(o);
          if (!o) setBookingRoom(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Booking Ruangan</DialogTitle>
            <DialogDescription>
              {bookingRoom && (
                <>
                  <strong>{bookingRoom.name}</strong> — kapasitas {bookingRoom.capacity} orang
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBook} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="book-date">Tanggal</Label>
              <Input
                id="book-date"
                type="date"
                value={bookingForm.date}
                onChange={(e) => setBookingForm((p) => ({ ...p, date: e.target.value }))}
                min={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="book-start">Mulai</Label>
                <Input
                  id="book-start"
                  type="time"
                  value={bookingForm.startTime}
                  onChange={(e) => setBookingForm((p) => ({ ...p, startTime: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="book-end">Selesai</Label>
                <Input
                  id="book-end"
                  type="time"
                  value={bookingForm.endTime}
                  onChange={(e) => setBookingForm((p) => ({ ...p, endTime: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="book-purpose">Tujuan</Label>
              <Textarea
                id="book-purpose"
                value={bookingForm.purpose}
                onChange={(e) => setBookingForm((p) => ({ ...p, purpose: e.target.value }))}
                rows={2}
                placeholder="Mis. Diskusi kelompok, presentasi tugas, belajar kelompok"
              />
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>Pastikan ruangan belum dipesan di waktu yang sama. Konfirmasi booking akan dikirim via notifikasi.</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBookingOpen(false)} disabled={savingBooking}>
                Batal
              </Button>
              <Button type="submit" disabled={savingBooking} className="gap-2">
                {savingBooking && <Loader2 className="h-4 w-4 animate-spin" />}
                Booking Sekarang
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alert: Delete room */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nonaktifkan Ruangan?</AlertDialogTitle>
            <AlertDialogDescription>
              Ruangan akan dinonaktifkan dan tidak muncul di daftar booking. Booking yang sudah ada tetap berlaku.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteRoom();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Nonaktifkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
