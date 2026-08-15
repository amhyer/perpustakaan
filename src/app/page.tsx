"use client";

import { useEffect, useState } from "react";
import { api, type CurrentUser } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";
import { AppShell } from "@/components/app/layout/app-shell";
import { LoginScreen } from "@/components/app/auth/login-screen";
import { Logo } from "@/components/app/logo";

// Views
import { DashboardView } from "@/components/app/views/dashboard-view";
import { CatalogView } from "@/components/app/views/catalog-view";
import { BookDetailView } from "@/components/app/views/book-detail-view";
import { BookFormView } from "@/components/app/views/book-form-view";
import { MembersView } from "@/components/app/views/members-view";
import { MemberDetailView } from "@/components/app/views/member-detail-view";
import { CirculationView } from "@/components/app/views/circulation-view";
import { LoansView } from "@/components/app/views/loans-view";
import { ReservationsView } from "@/components/app/views/reservations-view";
import { ProposalsView } from "@/components/app/views/proposals-view";
import { AnnouncementsView } from "@/components/app/views/announcements-view";
import { ReportsView } from "@/components/app/views/reports-view";
import { SettingsView } from "@/components/app/views/settings-view";
import { KioskModeView } from "@/components/app/views/kiosk-mode-view";
import { BatchCardsView } from "@/components/app/views/batch-cards-view";
import { StocktakingView } from "@/components/app/views/stocktaking-view";
import { MyDashboardView } from "@/components/app/views/my-dashboard-view";
import { MyLoansView } from "@/components/app/views/my-loans-view";
import { MyCardView } from "@/components/app/views/my-card-view";
import { WishlistView } from "@/components/app/views/wishlist-view";
import { NotificationsView } from "@/components/app/views/notifications-view";

export default function Page() {
  const { user, setUser, view, refreshKey } = useAppStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api
      .get<CurrentUser | null>("/api/auth/me")
      .then((u) => {
        if (u && u.id) setUser(u);
        else setUser(null);
      })
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, [setUser]);

  if (checking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <div className="h-10 w-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <Logo />
        <p className="text-sm text-muted-foreground">Memuat perpustakaan...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  const renderView = () => {
    switch (view.key) {
      case "dashboard":
        return <DashboardView />;
      case "catalog":
        return <CatalogView />;
      case "book-detail":
        return <BookDetailView key={view.params.id} bookId={view.params.id} />;
      case "book-form":
        return <BookFormView bookId={view.params.id} />;
      case "members":
        return <MembersView />;
      case "member-detail":
        return <MemberDetailView key={view.params.id} memberId={view.params.id} />;
      case "circulation":
        return <CirculationView />;
      case "loans":
        return <LoansView />;
      case "reservations":
        return <ReservationsView />;
      case "proposals":
        return <ProposalsView />;
      case "announcements":
        return <AnnouncementsView />;
      case "reports":
        return <ReportsView />;
      case "batch-cards":
        return <BatchCardsView />;
      case "stocktaking":
        return <StocktakingView />;
      case "settings":
        return <SettingsView />;
      case "my-dashboard":
        return <MyDashboardView />;
      case "my-loans":
        return <MyLoansView />;
      case "my-card":
        return <MyCardView />;
      case "wishlist":
        return <WishlistView />;
      case "notifications":
        return <NotificationsView />;
      default:
        return <DashboardView />;
    }
  };

  // Mode Kios: render full-screen tanpa AppShell
  if (view.key === "kiosk") {
    return <KioskModeView />;
  }

  return (
    <AppShell key={refreshKey}>{renderView()}</AppShell>
  );
}
