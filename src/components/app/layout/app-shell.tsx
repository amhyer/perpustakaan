"use client";

import { Sidebar } from "@/components/app/layout/sidebar";
import { Header } from "@/components/app/layout/header";
import { ErrorBoundary } from "@/components/app/shared/error-boundary";
import { useAppStore } from "@/store/use-app-store";

export function AppShell({ children }: { children: React.ReactNode }) {
  const user = useAppStore((s) => s.user);
  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 px-4 lg:px-6 py-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
        <footer className="mt-auto border-t border-border bg-card px-4 lg:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">Perpustakaan Jendela Ilmu</span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline">Membuka Jendela Ilmu untuk Semua</span>
            </div>
            <div className="flex items-center gap-3">
              <span>Jam Buka: Senin–Jumat, 07.00–16.00</span>
              <span className="hidden md:inline">·</span>
              <span className="hidden md:inline">© {new Date().getFullYear()}</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
