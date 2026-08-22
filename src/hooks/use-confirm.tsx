"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
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

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

/**
 * useConfirm — globally accessible confirm dialog.
 *
 * Returns function yang return Promise<boolean>.
 * Setup: wrap app dengan <ConfirmProvider>
 *
 * Example:
 *   const { confirm } = useConfirm();
 *   const handleDelete = async () => {
 *     const ok = await confirm({
 *       title: "Hapus buku?",
 *       description: "Tindakan ini tidak bisa dibatalkan",
 *       variant: "destructive",
 *     });
 *     if (ok) await api.delete(...);
 *   };
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<
    (ConfirmOptions & { resolve: (v: boolean) => void }) | null
  >(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ ...options, resolve });
    });
  }, []);

  const handleClose = useCallback(
    (value: boolean) => {
      state?.resolve(value);
      setState(null);
    },
    [state]
  );

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <AlertDialog open onOpenChange={(o) => !o && handleClose(false)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{state.title}</AlertDialogTitle>
              {state.description && (
                <AlertDialogDescription>{state.description}</AlertDialogDescription>
              )}
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => handleClose(false)}>
                {state.cancelText || "Batal"}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleClose(true)}
                className={
                  state.variant === "destructive"
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : ""
                }
              >
                {state.confirmText || "Konfirmasi"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }
  return ctx;
}
