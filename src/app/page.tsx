"use client";

import { useEffect, useState } from "react";
import { api, type CurrentUser } from "@/lib/api-client";
import { useAppStore } from "@/store/use-app-store";
import { AppShell } from "@/components/app/layout/app-shell";
import { LoginScreen } from "@/components/app/auth/login-screen";
import { Logo } from "@/components/app/logo";

// Lazy-loaded views untuk code splitting
// Setiap view di-load on-demand, mengurangi initial bundle size
import {
  DashboardView,
  ExecutiveDashboardView,
  CatalogView,
  BookDetailView,
  BookFormView,
  MembersView,
  MemberDetailView,
  CirculationView,
  LoansView,
  ReservationsView,
  ReservationsQueueView,
  ProposalsView,
  AnnouncementsView,
  ReportsView,
  SettingsView,
  BatchCardsView,
  StocktakingView,
  FinesView,
  MyProfileView,
  ReadingHistoryView,
  ReservationsQueueView as _ReservationsQueueViewAlias,
  NotificationLogView,
  AuditLogView,
  DataExportView,
  BookTransferView,
  MyDashboardView,
  MyLoansView,
  MyCardView,
  WishlistView,
  NotificationsView,
  RoomsView,
  VisitorsView,
  AssetsView,
  ApiKeysView,
  MySessionsView,
  KioskModeView,
  EBookReaderView,
  BarcodeLabelsView,
  ReportBuilderView,
  CustomizableDashboardView,
  RewardsCatalogView,
  MyRedemptionsView,
  RewardsManagementView,
  RFIDSImulatorView,
  RFIDDashboardView,
  BlockchainExplorerView,
  ReadingAssignmentsView,
  MarketplaceView,
  CurriculumRecommendationsView,
  CardQueueView,
  WhatsappOverdueView,
  AttendanceView,
  ExecutiveStatsWidget,
  BookOfWeekView,
  ReadingChallengesView,
  InterLibraryView,
} from "@/components/app/views";

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
      case "executive-dashboard":
        return <ExecutiveDashboardView />;
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
      case "reservations-queue":
        return <ReservationsQueueView />;
      case "proposals":
        return <ProposalsView />;
      case "announcements":
        return <AnnouncementsView />;
      case "reports":
        return <ReportsView />;
      case "report-builder":
        return <ReportBuilderView />;
      case "batch-cards":
        return <BatchCardsView />;
      case "stocktaking":
        return <StocktakingView />;
      case "fines":
        return <FinesView />;
      case "settings":
        return <SettingsView />;
      case "rooms":
        return <RoomsView />;
      case "visitors":
        return <VisitorsView />;
      case "assets":
        return <AssetsView />;
      case "api-keys":
        return <ApiKeysView />;
      case "notification-log":
        return <NotificationLogView />;
      case "audit-log":
        return <AuditLogView />;
      case "book-transfer":
        return <BookTransferView />;
      case "wishlist":
        return <WishlistView />;
      case "notifications":
        return <NotificationsView />;
      case "my-dashboard":
        return <MyDashboardView variant={view.dashboardVariant} />;
      case "my-loans":
        return <MyLoansView />;
      case "my-card":
        return <MyCardView />;
      case "my-profile":
        return <MyProfileView />;
      case "reading-history":
        return <ReadingHistoryView />;
      case "my-sessions":
        return <MySessionsView />;
      case "ebook-reader":
        return <EBookReaderView />;
      case "barcode-labels":
        return <BarcodeLabelsView />;
      case "customizable-dashboard":
        return <CustomizableDashboardView />;
      case "rewards-catalog":
        return <RewardsCatalogView />;
      case "my-redemptions":
        return <MyRedemptionsView />;
      case "rewards-management":
        return <RewardsManagementView />;
      case "rfid-simulator":
        return <RFIDSImulatorView />;
      case "rfid-dashboard":
        return <RFIDDashboardView />;
      case "blockchain-explorer":
        return <BlockchainExplorerView />;
      case "data-export":
        return <DataExportView />;
      case "reading-assignments":
        return <ReadingAssignmentsView />;
      case "marketplace":
        return <MarketplaceView />;
      case "curriculum-recommendations":
        return <CurriculumRecommendationsView />;
      case "card-queue":
        return <CardQueueView />;
      case "whatsapp-overdue":
        return <WhatsappOverdueView />;
      case "attendance":
        return <AttendanceView />;
      case "executive-stats-widget":
        return <ExecutiveStatsWidget />;
      case "book-of-the-week":
        return <BookOfWeekView />;
      case "reading-challenges":
        return <ReadingChallengesView />;
      case "inter-library":
        return <InterLibraryView />;
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
