"use client";

import { useState, useEffect } from "react";
import { motion, Reorder } from "framer-motion";
import {
  Plus,
  X,
  Settings as SettingsIcon,
  RotateCcw,
  Save,
  Eye,
  BookOpen,
  Users,
  TrendingUp,
  Library,
  AlertTriangle,
  Award,
  BarChart3,
  Clock,
  CheckCircle2,
  GripVertical,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/layout/card";
import { Button } from "@/components/ui/form/button";
import { Badge } from "@/components/ui/data-display/badge";
import { Label } from "@/components/ui/form/label";
import { PageHeader, EmptyState } from "@/components/app/shared/page-header";
import { RoleBadge } from "@/components/app/shared/role-badge";
import { SetAsHomeButton } from "@/components/app/shared/set-as-home-button";
import { useFetch } from "@/hooks/use-fetch";
import { useAppStore } from "@/store/use-app-store";
import { Skeleton } from "@/components/app/shared/skeleton";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/constants";
import {
  TrendAreaChart,
  TopBooksList,
  TopMembersList,
  type StatsResponse,
} from "@/components/app/dashboard/widgets";

type WidgetSize = "sm" | "md" | "lg";
type WidgetType =
  | "stat-total-books"
  | "stat-active-members"
  | "stat-active-loans"
  | "stat-overdue"
  | "chart-trend"
  | "list-overdue"
  | "list-popular-books"
  | "list-active-members"
  | "alerts";

interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  size: WidgetSize;
  visible: boolean;
}

interface DashboardLayout {
  widgets: Widget[];
}

const DEFAULT_LAYOUT: DashboardLayout = {
  widgets: [
    { id: "w1", type: "stat-total-books", title: "Total Koleksi", size: "sm", visible: true },
    { id: "w2", type: "stat-active-members", title: "Anggota Aktif", size: "sm", visible: true },
    { id: "w3", type: "stat-active-loans", title: "Sedang Dipinjam", size: "sm", visible: true },
    { id: "w4", type: "stat-overdue", title: "Terlambat", size: "sm", visible: true },
    { id: "w5", type: "chart-trend", title: "Tren 7 Hari", size: "lg", visible: true },
    { id: "w6", type: "list-overdue", title: "Buku Terlambat", size: "md", visible: true },
    { id: "w7", type: "list-popular-books", title: "Buku Terpopuler", size: "md", visible: true },
    { id: "w8", type: "alerts", title: "Peringatan", size: "md", visible: true },
  ],
};

const STORAGE_KEY = "dashboard:layout";
const SIZE_CLASSES: Record<WidgetSize, string> = {
  sm: "col-span-1",
  md: "col-span-1 lg:col-span-2",
  lg: "col-span-1 lg:col-span-3",
};

export function CustomizableDashboardView() {
  const user = useAppStore((s) => s.user);
  const setView = useAppStore((s) => s.setView);
  const [layout, setLayout] = useState<DashboardLayout>(DEFAULT_LAYOUT);
  const [editMode, setEditMode] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load layout from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setLayout(JSON.parse(stored));
      } catch {
        setLayout(DEFAULT_LAYOUT);
      }
    }
  }, []);

  const { data: stats, loading } = useFetch<StatsResponse>("/api/stats");

  const handleReorder = (newWidgets: Widget[]) => {
    setLayout({ ...layout, widgets: newWidgets });
    setHasChanges(true);
  };

  const toggleVisibility = (id: string) => {
    setLayout({
      ...layout,
      widgets: layout.widgets.map((w) =>
        w.id === id ? { ...w, visible: !w.visible } : w
      ),
    });
    setHasChanges(true);
  };

  const removeWidget = (id: string) => {
    setLayout({
      ...layout,
      widgets: layout.widgets.filter((w) => w.id !== id),
    });
    setHasChanges(true);
  };

  const updateTitle = (id: string, title: string) => {
    setLayout({
      ...layout,
      widgets: layout.widgets.map((w) => (w.id === id ? { ...w, title } : w)),
    });
    setHasChanges(true);
  };

  const changeSize = (id: string, size: WidgetSize) => {
    setLayout({
      ...layout,
      widgets: layout.widgets.map((w) => (w.id === id ? { ...w, size } : w)),
    });
    setHasChanges(true);
  };

  const addWidget = (type: WidgetType) => {
    const newId = `w${Date.now()}`;
    const defaults: Record<WidgetType, { title: string; size: WidgetSize }> = {
      "stat-total-books": { title: "Total Koleksi", size: "sm" },
      "stat-active-members": { title: "Anggota Aktif", size: "sm" },
      "stat-active-loans": { title: "Sedang Dipinjam", size: "sm" },
      "stat-overdue": { title: "Terlambat", size: "sm" },
      "chart-trend": { title: "Tren 7 Hari", size: "lg" },
      "list-overdue": { title: "Buku Terlambat", size: "md" },
      "list-popular-books": { title: "Buku Terpopuler", size: "md" },
      "list-active-members": { title: "Peminjam Aktif", size: "md" },
      "alerts": { title: "Peringatan", size: "md" },
    };
    const def = defaults[type];
    setLayout({
      ...layout,
      widgets: [
        ...layout.widgets,
        { id: newId, type, title: def.title, size: def.size, visible: true },
      ],
    });
    setHasChanges(true);
  };

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    setHasChanges(false);
    setEditMode(false);
    toast.success("Layout dashboard disimpan");
  };

  const reset = () => {
    setLayout(DEFAULT_LAYOUT);
    setHasChanges(true);
    toast("Layout direset ke default (belum disimpan)");
  };

  const visibleWidgets = layout.widgets.filter((w) => w.visible);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={
          user?.role === "LIBRARIAN"
            ? "Ringkasan perpustakaan. Klik 'Sesuaikan' untuk atur widget."
            : "Selamat datang di Perpustakaan Jendela Ilmu"
        }
        icon={BarChart3}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <RoleBadge user={user} />
            <SetAsHomeButton viewKey="customizable-dashboard" label="Dashboard Kustom" />
            {user?.role === "LIBRARIAN" ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setEditMode(!editMode)}
                  className="gap-2"
                >
                  <SettingsIcon className="h-4 w-4" />
                  {editMode ? "Selesai" : "Sesuaikan"}
                </Button>
                {editMode && (
                  <>
                    <Button variant="outline" onClick={reset} className="gap-2">
                      <RotateCcw className="h-4 w-4" />
                      Reset
                    </Button>
                    <Button onClick={save} disabled={!hasChanges} className="gap-2">
                      <Save className="h-4 w-4" />
                      Simpan {hasChanges && "*"}
                    </Button>
                  </>
                )}
              </>
            ) : null}
          </div>
        }
      />

      {/* Edit mode panel */}
      {editMode && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
        >
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-sm mb-2">Mode Edit Aktif</h3>
                  <p className="text-xs text-muted-foreground">
                    Drag &amp; drop widget untuk reorder. Klik ikon 👁 untuk sembunyikan, 🗑 untuk hapus.
                  </p>
                </div>
                <div>
                  <Label className="text-xs">Tambah Widget:</Label>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {([
                      { type: "stat-total-books", label: "Total Koleksi", icon: BookOpen },
                      { type: "stat-active-members", label: "Anggota Aktif", icon: Users },
                      { type: "stat-active-loans", label: "Sedang Dipinjam", icon: Library },
                      { type: "stat-overdue", label: "Terlambat", icon: AlertTriangle },
                      { type: "chart-trend", label: "Tren Chart", icon: TrendingUp },
                      { type: "list-overdue", label: "List Terlambat", icon: Clock },
                      { type: "list-popular-books", label: "Buku Populer", icon: Award },
                      { type: "alerts", label: "Peringatan", icon: AlertTriangle },
                    ] satisfies { type: WidgetType; label: string; icon: LucideIcon }[]).map((opt) => (
                      <Button
                        key={opt.type}
                        variant="outline"
                        size="sm"
                        onClick={() => addWidget(opt.type)}
                        className="gap-1.5 h-7 text-xs"
                      >
                        <Plus className="h-3 w-3" />
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Widget grid */}
      {loading && !stats ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <Reorder.Group
          axis="y"
          values={visibleWidgets}
          onReorder={editMode ? handleReorder : () => {}}
          className="grid grid-cols-1 lg:grid-cols-3 gap-4"
        >
          {visibleWidgets.map((widget) => (
            <Reorder.Item
              key={widget.id}
              value={widget}
              className={`${SIZE_CLASSES[widget.size]} ${editMode ? "cursor-move" : ""}`}
              dragListener={editMode}
            >
              <WidgetRenderer
                widget={widget}
                stats={stats}
                editMode={editMode}
                onToggleVisibility={() => toggleVisibility(widget.id)}
                onRemove={() => removeWidget(widget.id)}
                onUpdateTitle={(t) => updateTitle(widget.id, t)}
                onChangeSize={(s) => changeSize(widget.id, s)}
                onSelectBook={(id) => setView("book-detail", { id })}
                onSelectMember={(id) => setView("member-detail", { id })}
              />
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}

      {!loading && visibleWidgets.length === 0 && (
        <EmptyState
          icon={BarChart3}
          title="Dashboard Kosong"
          description="Tambahkan widget untuk mulai melihat data"
          action={
            <Button onClick={() => setEditMode(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Tambah Widget
            </Button>
          }
        />
      )}
    </div>
  );
}

// ============================================================
// Widget Renderer
// ============================================================

interface WidgetRendererProps {
  widget: Widget;
  stats: StatsResponse | null;
  editMode: boolean;
  onToggleVisibility: () => void;
  onRemove: () => void;
  onUpdateTitle: (title: string) => void;
  onChangeSize: (size: WidgetSize) => void;
  onSelectBook: (bookId: string) => void;
  onSelectMember: (memberId: string) => void;
}

function WidgetRenderer({
  widget,
  stats,
  editMode,
  onToggleVisibility,
  onRemove,
  onUpdateTitle,
  onChangeSize,
  onSelectBook,
  onSelectMember,
}: WidgetRendererProps) {
  const isEditing = editMode;

  return (
    <Card className={isEditing ? "border-primary/50 shadow-md" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                type="text"
                value={widget.title}
                onChange={(e) => onUpdateTitle(e.target.value)}
                className="w-full text-sm font-semibold bg-transparent border-b border-dashed border-primary/30 focus:outline-none focus:border-primary"
              />
            ) : (
              <CardTitle className="text-sm">{widget.title}</CardTitle>
            )}
          </div>
          {isEditing && (
            <div className="flex items-center gap-0.5 shrink-0">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <button
                onClick={onToggleVisibility}
                className="p-1 hover:bg-muted rounded text-muted-foreground"
                title="Toggle visibility"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onRemove}
                className="p-1 hover:bg-destructive/10 text-destructive rounded"
                title="Remove"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <WidgetContent
          type={widget.type}
          stats={stats}
          size={widget.size}
          onSelectBook={onSelectBook}
          onSelectMember={onSelectMember}
        />
        {isEditing && (
          <div className="flex gap-1 mt-3 pt-2 border-t">
            <span className="text-[10px] text-muted-foreground">Ukuran:</span>
            {(["sm", "md", "lg"] as WidgetSize[]).map((s) => (
              <button
                key={s}
                onClick={() => onChangeSize(s)}
                className={`text-[10px] px-1.5 py-0.5 rounded ${
                  widget.size === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                {s.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface WidgetContentProps {
  type: WidgetType;
  stats: StatsResponse | null;
  size: WidgetSize;
  onSelectBook: (bookId: string) => void;
  onSelectMember: (memberId: string) => void;
}

function WidgetContent({ type, stats, size, onSelectBook, onSelectMember }: WidgetContentProps) {
  if (!stats) return <Skeleton className="h-20" />;

  const overview = stats.overview;
  const trend = stats.trend;
  const isLarge = size === "lg";

  // Widget 'chart-trend' — reuse shared TrendAreaChart
  if (type === "chart-trend") {
    return (
      <div className={isLarge ? "" : "-mx-6 -mb-6"}>
        <TrendAreaChart
          data={trend}
          title=""
          description=""
          height={isLarge ? 220 : 180}
          className="border-0 shadow-none"
        />
      </div>
    );
  }

  // Widget 'list-popular-books' — reuse shared TopBooksList
  if (type === "list-popular-books") {
    return (
      <div className="-mx-6 -mb-6">
        <TopBooksList
          books={stats.popularBooks}
          title=""
          description=""
          onSelectBook={onSelectBook}
          maxHeightClass="max-h-72"
          className="border-0 shadow-none"
        />
      </div>
    );
  }

  // Widget 'list-active-members' — reuse shared TopMembersList
  if (type === "list-active-members") {
    return (
      <div className="-mx-6 -mb-6">
        <TopMembersList
          members={stats.topMembers}
          title=""
          description=""
          onSelectMember={onSelectMember}
          maxHeightClass="max-h-72"
          className="border-0 shadow-none"
        />
      </div>
    );
  }

  switch (type) {
    case "stat-total-books":
      return (
        <div className="space-y-1">
          <div className="text-3xl font-bold text-foreground">
            {(overview.totalItems || 0).toLocaleString("id-ID")}
          </div>
          <div className="text-xs text-muted-foreground">
            {overview.totalBooks || 0} judul
          </div>
        </div>
      );

    case "stat-active-members":
      return (
        <div className="space-y-1">
          <div className="text-3xl font-bold text-foreground">
            {(overview.activeMembers || 0).toLocaleString("id-ID")}
          </div>
          <div className="text-xs text-muted-foreground">
            {overview.studentMembers || 0} siswa · {overview.teacherMembers || 0} guru
          </div>
        </div>
      );

    case "stat-active-loans":
      return (
        <div className="space-y-1">
          <div className="text-3xl font-bold text-foreground">
            {(overview.activeLoans || 0).toLocaleString("id-ID")}
          </div>
          <div className="text-xs text-muted-foreground">
            {overview.loansToday || 0} hari ini
          </div>
        </div>
      );

    case "stat-overdue":
      return (
        <div className="space-y-1">
          <div
            className={`text-3xl font-bold ${
              (overview.overdueLoans || 0) > 0 ? "text-red-600" : "text-foreground"
            }`}
          >
            {(overview.overdueLoans || 0).toLocaleString("id-ID")}
          </div>
          <div className="text-xs text-muted-foreground">
            Denda: {formatRupiah(overview.overdueFineTotal || 0)}
          </div>
        </div>
      );

    case "list-overdue": {
      const overdue = (stats.overdueList || []).slice(0, 5);
      return overdue.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Tidak ada buku terlambat 🎉
        </p>
      ) : (
        <div className="space-y-2">
          {overdue.map((l) => (
            <div key={l.id} className="text-xs">
              <p className="font-medium truncate">{l.bookItem?.book?.title}</p>
              <p className="text-muted-foreground truncate">{l.member?.fullName}</p>
            </div>
          ))}
        </div>
      );
    }

    case "alerts": {
      const alerts: { type: "warning" | "info"; text: string }[] = [];
      if ((overview.overdueLoans || 0) > 0) {
        alerts.push({
          type: "warning",
          text: `${overview.overdueLoans} buku terlambat dikembalikan`,
        });
      }
      if ((overview.pendingProposals || 0) > 0) {
        alerts.push({
          type: "info",
          text: `${overview.pendingProposals} usulan buku menunggu review`,
        });
      }
      if ((overview.expiredReservations || 0) > 0) {
        alerts.push({
          type: "info",
          text: `${overview.expiredReservations} reservasi kedaluwarsa`,
        });
      }
      return alerts.length === 0 ? (
        <p className="text-sm text-emerald-600 text-center py-4 flex items-center justify-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Semua aman
        </p>
      ) : (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div
              key={i}
              className={`text-xs p-2 rounded ${
                a.type === "warning"
                  ? "bg-amber-50 text-amber-900 border border-amber-200"
                  : "bg-sky-50 text-sky-900 border border-sky-200"
              }`}
            >
              {a.text}
            </div>
          ))}
        </div>
      );
    }

    default:
      return <p className="text-xs text-muted-foreground">Widget belum diimplementasi</p>;
  }
}
