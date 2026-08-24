"use client";

/**
 * Toast Helpers — Common toast patterns untuk konsistensi UX.
 *
 * Sprint I - Accessibility & Mobile-First UX.
 *
 * Provides:
 * - Pre-configured toasts dengan icon + description
 * - Confirmation toasts (with undo action)
 * - Promise-aware toasts (loading → success/error)
 * - Multi-language support
 * - Action buttons (Undo, Retry, View)
 *
 * Standardisasi semua toast notifications di app agar
 * konsisten & informatif.
 */

import { toast as sonnerToast } from "sonner";
import {
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  X,
  Undo2,
  RefreshCw,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { ReactNode } from "react";

// ===== Types =====

export interface ToastAction {
  label: string;
  onClick: () => void;
  icon?: React.ElementType;
}

export interface ToastOptions {
  /** Title (required) */
  title: string;
  /** Description (optional) */
  description?: string;
  /** Duration in ms (default: 4000) */
  duration?: number;
  /** Action button */
  action?: ToastAction;
  /** Secondary action */
  secondaryAction?: ToastAction;
  /** Custom icon */
  icon?: React.ElementType;
}

// ===== Toast Variants =====

/**
 * Success toast — green checkmark, positive feedback.
 */
export function showSuccess(options: ToastOptions): string | number {
  return sonnerToast.custom(
    (t) => (
      <ToastContent
        t={t}
        icon={options.icon || CheckCircle2}
        title={options.title}
        description={options.description}
        variant="success"
        action={options.action}
        secondaryAction={options.secondaryAction}
      />
    ),
    {
      duration: options.duration ?? 4000,
    }
  );
}

/**
 * Error toast — red, important.
 */
export function showError(options: ToastOptions): string | number {
  return sonnerToast.custom(
    (t) => (
      <ToastContent
        t={t}
        icon={options.icon || AlertCircle}
        title={options.title}
        description={options.description}
        variant="error"
        action={options.action}
        secondaryAction={options.secondaryAction}
      />
    ),
    {
      duration: options.duration ?? 6000,
    }
  );
}

/**
 * Info toast — neutral, informational.
 */
export function showInfo(options: ToastOptions): string | number {
  return sonnerToast.custom(
    (t) => (
      <ToastContent
        t={t}
        icon={options.icon || Info}
        title={options.title}
        description={options.description}
        variant="info"
        action={options.action}
        secondaryAction={options.secondaryAction}
      />
    ),
    {
      duration: options.duration ?? 4000,
    }
  );
}

/**
 * Warning toast — amber, needs attention.
 */
export function showWarning(options: ToastOptions): string | number {
  return sonnerToast.custom(
    (t) => (
      <ToastContent
        t={t}
        icon={options.icon || AlertTriangle}
        title={options.title}
        description={options.description}
        variant="warning"
        action={options.action}
        secondaryAction={options.secondaryAction}
      />
    ),
    {
      duration: options.duration ?? 5000,
    }
  );
}

// ===== Promise-based Toasts =====

/**
 * Promise toast — auto-handles loading → success/error.
 *
 * Usage:
 *   await toast.promise(
 *     fetchData(),
 *     {
 *       loading: "Memuat data...",
 *       success: (data) => `Berhasil memuat ${data.length} item`,
 *       error: (err) => `Gagal: ${err.message}`,
 *     }
 *   );
 */
export function promise<T>(
  promise: Promise<T> | (() => Promise<T>),
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((err: any) => string);
  }
): Promise<T> {
  const p = typeof promise === "function" ? promise() : promise;
  return sonnerToast.promise(p, {
    loading: messages.loading,
    success: messages.success as any,
    error: messages.error as any,
  }).unwrap() as Promise<T>;
}

/**
 * Undo toast — shows action with undo button.
 *
 * Usage:
 *   toast.undo({
 *     title: "Buku dihapus",
 *     description: "Buku 'Laskar Pelangi' telah dihapus",
 *     onUndo: () => restoreBook(),
 *   });
 */
export function undo(options: {
  title: string;
  description?: string;
  onUndo: () => void | Promise<void>;
  duration?: number;
}): string | number {
  return sonnerToast.custom(
    (t) => (
      <ToastContent
        t={t}
        icon={Info}
        title={options.title}
        description={options.description}
        variant="info"
        action={{
          label: "Undo",
          onClick: async () => {
            await options.onUndo();
            sonnerToast.dismiss(t);
          },
          icon: Undo2,
        }}
      />
    ),
    {
      duration: options.duration ?? 6000,
    }
  );
}

/**
 * Loading toast — manual control, dismiss when done.
 *
 * Usage:
 *   const id = toast.loading("Menyimpan data...");
 *   await saveData();
 *   toast.dismiss(id);
 *   toast.success({ title: "Tersimpan!" });
 */
export function loading(title: string, description?: string): string | number {
  return sonnerToast.custom(
    (t) => (
      <ToastContent
        t={t}
        icon={Loader2}
        title={title}
        description={description}
        variant="loading"
      />
    ),
    {
      duration: Infinity, // Manual dismiss only
    }
  );
}

/**
 * Dismiss a specific toast.
 */
export function dismiss(toastId?: string | number) {
  if (toastId !== undefined) {
    sonnerToast.dismiss(toastId);
  } else {
    sonnerToast.dismiss();
  }
}

// ===== Helper: Common Patterns =====

/**
 * Quick success — minimal call.
 */
export const success = (title: string, description?: string) =>
  showSuccess({ title, description });

/**
 * Quick error — minimal call.
 */
export const error = (title: string, description?: string) =>
  showError({ title, description });

/**
 * Quick info — minimal call.
 */
export const info = (title: string, description?: string) =>
  showInfo({ title, description });

/**
 * Quick warning — minimal call.
 */
export const warning = (title: string, description?: string) =>
  showWarning({ title, description });

/**
 * CRUD success messages (Indonesian).
 */
export const crud = {
  created: (item: string = "Data") =>
    success(`${item} berhasil ditambahkan`, "Data telah tersimpan di sistem"),
  updated: (item: string = "Data") =>
    success(`${item} berhasil diperbarui`, "Perubahan telah tersimpan"),
  deleted: (item: string = "Data", onUndo?: () => void) =>
    onUndo
      ? undo({
          title: `${item} dihapus`,
          description: "Klik Undo untuk membatalkan",
          onUndo,
        })
      : success(`${item} berhasil dihapus`),
  saved: () => success("Perubahan tersimpan", "Data telah berhasil disimpan"),
  copied: (item: string = "Teks") =>
    success(`${item} disalin ke clipboard`, "Tekan Ctrl+V untuk paste"),
  uploaded: (item: string = "File") =>
    success(`${item} berhasil diupload`),
  sent: (item: string = "Pesan") =>
    success(`${item} berhasil dikirim`),
  failed: (item: string = "Operasi", retry?: () => void) =>
    showError({
      title: `${item} gagal`,
      description: "Terjadi kesalahan. Coba lagi atau hubungi pustakawan.",
      action: retry
        ? { label: "Coba lagi", onClick: retry, icon: RefreshCw }
        : undefined,
    }),
};

// ===== Toast Content Component =====

interface ToastContentProps {
  t: string | number;
  icon: React.ElementType;
  title: string;
  description?: string;
  variant: "success" | "error" | "info" | "warning" | "loading";
  action?: ToastAction;
  secondaryAction?: ToastAction;
}

function ToastContent({
  t,
  icon: Icon,
  title,
  description,
  variant,
  action,
  secondaryAction,
}: ToastContentProps) {
  const variantClasses = {
    success: "text-green-600 bg-green-50 dark:bg-green-950/30",
    error: "text-red-600 bg-red-50 dark:bg-red-950/30",
    info: "text-blue-600 bg-blue-50 dark:bg-blue-950/30",
    warning: "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
    loading: "text-muted-foreground bg-muted/50",
  };

  return (
    <div
      className="flex items-start gap-3 p-3 bg-background border rounded-lg shadow-lg min-w-[300px] max-w-md"
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
    >
      {/* Icon */}
      <div
        className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${variantClasses[variant]}`}
      >
        <Icon
          className={`h-4 w-4 ${variant === "loading" ? "animate-spin" : ""}`}
          aria-hidden="true"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
        {(action || secondaryAction) && (
          <div className="flex items-center gap-1.5 mt-2">
            {action && (
              <button
                onClick={action.onClick}
                className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
              >
                {action.icon && <action.icon className="h-3 w-3" />}
                {action.label}
              </button>
            )}
            {action && secondaryAction && (
              <span className="text-muted-foreground text-xs">·</span>
            )}
            {secondaryAction && (
              <button
                onClick={secondaryAction.onClick}
                className="text-xs text-muted-foreground hover:underline flex items-center gap-1"
              >
                {secondaryAction.icon && <secondaryAction.icon className="h-3 w-3" />}
                {secondaryAction.label}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={() => dismiss(t)}
        className="p-1 hover:bg-muted rounded shrink-0"
        aria-label="Close"
      >
        <X className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}

// ===== Default export for convenience =====

export const toast = {
  success,
  error,
  info,
  warning,
  showSuccess,
  showError,
  showInfo,
  showWarning,
  promise,
  undo,
  loading,
  dismiss,
  crud,
};
