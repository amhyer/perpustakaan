"use client";

/**
 * Keyboard Shortcuts Cheatsheet — Show all available shortcuts.
 *
 * Sprint I - Accessibility & Mobile-First UX.
 *
 * Features:
 * - Press "?" to open (or clickable from command palette)
 * - Grouped by category (Navigation, Actions, Forms, etc)
 * - Visual keyboard keys
 * - Search/filter shortcuts
 * - Platform-aware (Cmd vs Ctrl)
 * - Localized (id, en, ar)
 *
 * Inspired by GitHub, Linear, Notion shortcuts overlays.
 */

import { useState, useMemo, useEffect } from "react";
import {
  Command,
  Search,
  X,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
  ArrowRight,
  Plus,
  RefreshCw,
  Settings,
  HelpCircle,
  Sparkles,
  MessageCircle,
  Radio,
  Link2,
  Calendar,
  Filter,
  Save,
  Eye,
  Trash2,
  Edit,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/overlay/dialog";
import { Input } from "@/components/ui/form/input";
import { Badge } from "@/components/ui/data-display/badge";
import { cn } from "@/lib/utils";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import { useLocale } from "@/hooks/use-locale";

// ===== Types =====

interface Shortcut {
  keys: string[];
  description: { id: string; en: string; ar: string }[];
  category: "navigation" | "actions" | "forms" | "chat" | "advanced";
  icon: React.ElementType;
  ctrlOnWin?: boolean;
}

interface ShortcutGroup {
  id: string;
  label: { id: string; en: string; ar: string };
  icon: React.ElementType;
  shortcuts: Shortcut[];
}

// ===== I18n =====

const I18N = {
  title: { id: "Pintasan Keyboard", en: "Keyboard Shortcuts", ar: "اختصارات لوحة المفاتيح" },
  subtitle: {
    id: "Navigasi lebih cepat dengan keyboard",
    en: "Navigate faster with your keyboard",
    ar: "تصفح بشكل أسرع باستخدام لوحة المفاتيح",
  },
  search: { id: "Cari pintasan...", en: "Search shortcuts...", ar: "ابحث عن الاختصارات..." },
  noResults: { id: "Tidak ada pintasan cocok", en: "No matching shortcuts", ar: "لا توجد اختصارات مطابقة" },
  tip: { id: "Tip", en: "Tip", ar: "نصيحة" },
  tipText: {
    id: 'Tekan "?" kapan saja untuk membuka panel ini',
    en: 'Press "?" anytime to open this panel',
    ar: 'اضغط على "؟" في أي وقت لفتح هذه اللوحة',
  },
  groups: {
    navigation: { id: "Navigasi", en: "Navigation", ar: "التنقل" },
    actions: { id: "Aksi", en: "Actions", ar: "الإجراءات" },
    forms: { id: "Form", en: "Forms", ar: "النماذج" },
    chat: { id: "Chat AI", en: "AI Chat", ar: "دردشة الذكاء الاصطناعي" },
    advanced: { id: "Lanjutan", en: "Advanced", ar: "متقدم" },
  },
  shortcuts: {
    openPalette: { id: "Buka Command Palette", en: "Open command palette", ar: "فتح لوحة الأوامر" },
    closeModal: { id: "Tutup modal/dialog", en: "Close modal/dialog", ar: "إغلاق النافذة" },
    showShortcuts: { id: "Tampilkan pintasan", en: "Show shortcuts", ar: "عرض الاختصارات" },
    focusSearch: { id: "Fokus ke search", en: "Focus search", ar: "التركيز على البحث" },
    toggleSidebar: { id: "Buka/tutup sidebar", en: "Toggle sidebar", ar: "تبديل الشريط الجانبي" },
    navigateUp: { id: "Navigasi ke atas", en: "Navigate up", ar: "التنقل لأعلى" },
    navigateDown: { id: "Navigasi ke bawah", en: "Navigate down", ar: "التنقل لأسفل" },
    select: { id: "Pilih item", en: "Select item", ar: "تحديد العنصر" },
    goHome: { id: "Kembali ke beranda", en: "Go to home", ar: "الذهاب إلى الرئيسية" },
    refresh: { id: "Refresh data", en: "Refresh data", ar: "تحديث البيانات" },
    newItem: { id: "Buat baru", en: "Create new", ar: "إنشاء جديد" },
    save: { id: "Simpan perubahan", en: "Save changes", ar: "حفظ التغييرات" },
    edit: { id: "Edit item", en: "Edit item", ar: "تعديل العنصر" },
    delete: { id: "Hapus item", en: "Delete item", ar: "حذف العنصر" },
    toggleChat: { id: "Buka chat assistant", en: "Toggle chat assistant", ar: "تبديل المساعد" },
    toggleRFID: { id: "Buka RFID simulator", en: "Open RFID simulator", ar: "فتح محاكي RFID" },
    viewBlockchain: { id: "Buka blockchain audit", en: "Open blockchain audit", ar: "فتح تدقيق البلوكتشين" },
    filter: { id: "Filter daftar", en: "Filter list", ar: "تصفية القائمة" },
    preview: { id: "Preview/preview file", en: "Preview file", ar: "معاينة الملف" },
    nextField: { id: "Field berikutnya", en: "Next field", ar: "الحقل التالي" },
    prevField: { id: "Field sebelumnya", en: "Previous field", ar: "الحقل السابق" },
  },
};

// ===== Shortcut definitions =====

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    id: "navigation",
    label: I18N.groups.navigation,
    icon: ArrowRight,
    shortcuts: [
      {
        keys: ["⌘", "K"],
        description: [I18N.shortcuts.openPalette],
        category: "navigation",
        icon: Command,
      },
      {
        keys: ["?"],
        description: [I18N.shortcuts.showShortcuts],
        category: "navigation",
        icon: HelpCircle,
      },
      {
        keys: ["G", "H"],
        description: [I18N.shortcuts.goHome],
        category: "navigation",
        icon: ArrowRight,
      },
      {
        keys: ["["],
        description: [I18N.shortcuts.toggleSidebar],
        category: "navigation",
        icon: ArrowRight,
      },
      {
        keys: ["/"],
        description: [I18N.shortcuts.focusSearch],
        category: "navigation",
        icon: Search,
      },
      {
        keys: ["↑"],
        description: [I18N.shortcuts.navigateUp],
        category: "navigation",
        icon: ArrowUp,
      },
      {
        keys: ["↓"],
        description: [I18N.shortcuts.navigateDown],
        category: "navigation",
        icon: ArrowDown,
      },
      {
        keys: ["↵"],
        description: [I18N.shortcuts.select],
        category: "navigation",
        icon: CornerDownLeft,
      },
    ],
  },
  {
    id: "actions",
    label: I18N.groups.actions,
    icon: Sparkles,
    shortcuts: [
      {
        keys: ["R"],
        description: [I18N.shortcuts.refresh],
        category: "actions",
        icon: RefreshCw,
      },
      {
        keys: ["N"],
        description: [I18N.shortcuts.newItem],
        category: "actions",
        icon: Plus,
      },
      {
        keys: ["⌘", "S"],
        description: [I18N.shortcuts.save],
        category: "actions",
        icon: Save,
      },
      {
        keys: ["E"],
        description: [I18N.shortcuts.edit],
        category: "actions",
        icon: Edit,
      },
      {
        keys: ["⌘", "⌫"],
        description: [I18N.shortcuts.delete],
        category: "actions",
        icon: Trash2,
        ctrlOnWin: true,
      },
      {
        keys: ["F"],
        description: [I18N.shortcuts.filter],
        category: "actions",
        icon: Filter,
      },
    ],
  },
  {
    id: "forms",
    label: I18N.groups.forms,
    icon: Edit,
    shortcuts: [
      {
        keys: ["Tab"],
        description: [I18N.shortcuts.nextField],
        category: "forms",
        icon: ArrowRight,
      },
      {
        keys: ["⇧", "Tab"],
        description: [I18N.shortcuts.prevField],
        category: "forms",
        icon: ArrowRight,
      },
      {
        keys: ["Esc"],
        description: [I18N.shortcuts.closeModal],
        category: "forms",
        icon: X,
      },
    ],
  },
  {
    id: "chat",
    label: I18N.groups.chat,
    icon: MessageCircle,
    shortcuts: [
      {
        keys: ["⌘", "J"],
        description: [I18N.shortcuts.toggleChat],
        category: "chat",
        icon: MessageCircle,
      },
    ],
  },
  {
    id: "advanced",
    label: I18N.groups.advanced,
    icon: Settings,
    shortcuts: [
      {
        keys: ["⌘", "⇧", "R"],
        description: [I18N.shortcuts.toggleRFID],
        category: "advanced",
        icon: Radio,
        ctrlOnWin: true,
      },
      {
        keys: ["⌘", "⇧", "B"],
        description: [I18N.shortcuts.viewBlockchain],
        category: "advanced",
        icon: Link2,
        ctrlOnWin: true,
      },
    ],
  },
];

// ===== Hooks =====

function useIsMac(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad/.test(navigator.platform);
}

// ===== Main Component =====

export function KeyboardCheatsheet() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { locale } = useLocale();
  const isMac = useIsMac();

  // "?" key opens cheatsheet (when not in input)
  useKeyboardShortcut(
    "?",
    () => setOpen((o) => !o),
    { shift: true, preventDefault: true }
  );
  // Escape closes
  useKeyboardShortcut("Escape", () => setOpen(false), { preventDefault: true });

  // Filter shortcuts by search
  const filteredGroups = useMemo(() => {
    if (!search.trim()) return SHORTCUT_GROUPS;
    const q = search.toLowerCase();
    return SHORTCUT_GROUPS.map((g) => ({
      ...g,
      shortcuts: g.shortcuts.filter((s) =>
        s.description.some((d) => (d[locale as keyof typeof d] || "").toLowerCase().includes(q)) ||
        s.keys.join("").toLowerCase().includes(q)
      ),
    })).filter((g) => g.shortcuts.length > 0);
  }, [search, locale]);

  const t = (key: { id: string; en: string; ar: string }) =>
    key[locale as "id" | "en" | "ar"] || key.id;

  // Replace ⌘ with Ctrl on Windows
  const renderKeys = (keys: string[]) => {
    if (!isMac) {
      return keys.map((k) => {
        if (k === "⌘") return "Ctrl";
        if (k === "⌥") return "Alt";
        if (k === "⇧") return "Shift";
        return k;
      });
    }
    return keys;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="overflow-hidden p-0 max-w-3xl"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">{t(I18N.title)}</DialogTitle>
        <DialogDescription className="sr-only">{t(I18N.subtitle)}</DialogDescription>

        {/* Header */}
        <div className="border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Command className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">{t(I18N.title)}</h2>
              <p className="text-xs text-muted-foreground">{t(I18N.subtitle)}</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-2 hover:bg-muted rounded-md"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t(I18N.search)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto scrollbar-thin p-6 space-y-5">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-3 opacity-40" />
              {t(I18N.noResults)}
            </div>
          ) : (
            filteredGroups.map((group) => {
              const GroupIcon = group.icon;
              return (
                <div key={group.id}>
                  {/* Group header */}
                  <div className="flex items-center gap-2 mb-2">
                    <GroupIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {t(group.label)}
                    </h3>
                    <Badge variant="outline" className="ml-auto text-[10px] h-4">
                      {group.shortcuts.length}
                    </Badge>
                  </div>

                  {/* Shortcuts grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                    {group.shortcuts.map((shortcut, i) => {
                      const Icon = shortcut.icon;
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-3 p-2.5 rounded-md hover:bg-muted/50 border border-transparent hover:border-border transition-colors"
                        >
                          <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm flex-1">
                            {t(shortcut.description[0])}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {renderKeys(shortcut.keys).map((key, j) => (
                              <kbd
                                key={j}
                                className={cn(
                                  "h-6 min-w-6 inline-flex items-center justify-center",
                                  "px-1.5 rounded border bg-muted font-mono text-[11px]",
                                  "text-muted-foreground shadow-sm"
                                )}
                              >
                                {key}
                              </kbd>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer tip */}
        <div className="border-t px-6 py-3 bg-muted/30 flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-[10px]">
            {t(I18N.tip)}
          </Badge>
          <span>{t(I18N.tipText)}</span>
          <kbd className="ml-auto h-5 inline-flex items-center px-1.5 rounded border bg-background font-mono text-[10px]">
            {isMac ? "?" : "Shift + ?"}
          </kbd>
        </div>
      </DialogContent>
    </Dialog>
  );
}
