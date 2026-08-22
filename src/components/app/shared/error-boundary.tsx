"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/form/button";
import { Card, CardContent } from "@/components/ui/layout/card";
import { reportClientError } from "@/lib/client-error";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  /** Optional component name untuk context */
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
}

/**
 * Error Boundary — catch React errors, log ke server, tampilkan fallback UI.
 *
 * Place around views atau component trees yang rentan error.
 *
 * Example:
 *   <ErrorBoundary name="DashboardView">
 *     <DashboardView />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorCount: 0 };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorCount: 0 };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Auto-report ke server
    reportClientError(error, {
      component: this.props.name || "ErrorBoundary",
      componentStack: errorInfo.componentStack?.substring(0, 500),
      url: typeof window !== "undefined" ? window.location.href : undefined,
    });

    // Increment count untuk prevent infinite loop
    this.setState((prev) => ({ errorCount: prev.errorCount + 1 }));
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  handleHome = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="max-w-lg w-full">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-100 mb-4">
                <AlertTriangle className="h-7 w-7 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">
                Terjadi Kesalahan pada Tampilan Ini
              </h2>
              <p className="text-sm text-muted-foreground mb-1">
                {this.state.error?.message || "Error tidak diketahui"}
              </p>
              <p className="text-xs text-muted-foreground mb-6">
                Tim teknis sudah dinotifikasi otomatis. Anda bisa coba refresh atau kembali ke beranda.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button onClick={this.handleReset} variant="outline" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Coba Lagi
                </Button>
                <Button onClick={this.handleHome} variant="outline" className="gap-2">
                  <Home className="h-4 w-4" />
                  Beranda
                </Button>
                <Button onClick={this.handleReload} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Refresh Halaman
                </Button>
              </div>
              {process.env.NODE_ENV === "development" && this.state.error && (
                <details className="mt-6 text-left">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                    Stack trace (development only)
                  </summary>
                  <pre className="mt-2 p-3 bg-muted rounded text-[10px] overflow-auto max-h-48 text-left">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
