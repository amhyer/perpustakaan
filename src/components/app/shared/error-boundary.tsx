"use client";

import React, { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/form/button";
import { Card } from "@/components/ui/layout/card";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary — menangkap error render dari children.
 * Dipakai di AppShell untuk membungkus area render view, supaya crash
 * 1 halaman tidak menghapus sidebar/header/state login.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log ke console untuk debugging (bisa diganti dengan service tracking)
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleHome = () => {
    this.setState({ hasError: false, error: null });
    // Trigger navigation ke beranda via window.location
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <Card className="p-8 max-w-lg mx-auto mt-8">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Terjadi Kesalahan
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Halaman ini mengalami error saat dimuat. Sidebar dan header tetap
                berfungsi — Anda bisa navigasi ke halaman lain, atau coba muat ulang.
              </p>
            </div>
            {this.state.error && (
              <details className="w-full text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                <summary className="cursor-pointer font-medium">
                  Detail error (untuk debugging)
                </summary>
                <pre className="mt-2 whitespace-pre-wrap break-all">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <div className="flex items-center gap-2">
              <Button onClick={this.handleReload} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Muat Ulang
              </Button>
              <Button variant="outline" onClick={this.handleHome} className="gap-2">
                <Home className="h-4 w-4" />
                Kembali ke Beranda
              </Button>
            </div>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}
