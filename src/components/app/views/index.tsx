/**
 * Lazy-loaded views untuk code splitting.
 *
 * Setiap view di-load on-demand (dynamic import).
 * Initial bundle tidak include semua view, sehingga first load lebih cepat.
 *
 * Cara pakai:
 *   import { CatalogView } from "@/components/app/views";
 */

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const loadingComponent = (
  <div className="flex items-center justify-center min-h-[400px]">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// ===== LIBRARIAN VIEWS =====
export const DashboardView = dynamic(
  () => import("./dashboard-view").then((m) => m.DashboardView),
  { loading: () => loadingComponent, ssr: false }
);
export const ExecutiveDashboardView = dynamic(
  () => import("./executive-dashboard-view").then((m) => m.ExecutiveDashboardView),
  { loading: () => loadingComponent, ssr: false }
);
export const CatalogView = dynamic(
  () => import("./catalog-view").then((m) => m.CatalogView),
  { loading: () => loadingComponent, ssr: false }
);
export const BookDetailView = dynamic(
  () => import("./book-detail-view").then((m) => m.BookDetailView),
  { loading: () => loadingComponent, ssr: false }
);
export const BookFormView = dynamic(
  () => import("./book-form-view").then((m) => m.BookFormView),
  { loading: () => loadingComponent, ssr: false }
);
export const MembersView = dynamic(
  () => import("./members-view").then((m) => m.MembersView),
  { loading: () => loadingComponent, ssr: false }
);
export const MemberDetailView = dynamic(
  () => import("./member-detail-view").then((m) => m.MemberDetailView),
  { loading: () => loadingComponent, ssr: false }
);
export const CirculationView = dynamic(
  () => import("./circulation-view").then((m) => m.CirculationView),
  { loading: () => loadingComponent, ssr: false }
);
export const LoansView = dynamic(
  () => import("./loans-view").then((m) => m.LoansView),
  { loading: () => loadingComponent, ssr: false }
);
export const ReservationsView = dynamic(
  () => import("./reservations-view").then((m) => m.ReservationsView),
  { loading: () => loadingComponent, ssr: false }
);
export const ReservationsQueueView = dynamic(
  () => import("./reservations-queue-view").then((m) => m.ReservationsQueueView),
  { loading: () => loadingComponent, ssr: false }
);
export const ProposalsView = dynamic(
  () => import("./proposals-view").then((m) => m.ProposalsView),
  { loading: () => loadingComponent, ssr: false }
);
export const AnnouncementsView = dynamic(
  () => import("./announcements-view").then((m) => m.AnnouncementsView),
  { loading: () => loadingComponent, ssr: false }
);
export const ReportsView = dynamic(
  () => import("./reports-view").then((m) => m.ReportsView),
  { loading: () => loadingComponent, ssr: false }
);
export const SettingsView = dynamic(
  () => import("./settings-view").then((m) => m.SettingsView),
  { loading: () => loadingComponent, ssr: false }
);
export const BatchCardsView = dynamic(
  () => import("./batch-cards-view").then((m) => m.BatchCardsView),
  { loading: () => loadingComponent, ssr: false }
);
export const StocktakingView = dynamic(
  () => import("./stocktaking-view").then((m) => m.StocktakingView),
  { loading: () => loadingComponent, ssr: false }
);
export const FinesView = dynamic(
  () => import("./fines-view").then((m) => m.FinesView),
  { loading: () => loadingComponent, ssr: false }
);
export const NotificationLogView = dynamic(
  () => import("./notification-log-view").then((m) => m.NotificationLogView),
  { loading: () => loadingComponent, ssr: false }
);
export const AuditLogView = dynamic(
  () => import("./audit-log-view").then((m) => m.AuditLogView),
  { loading: () => loadingComponent, ssr: false }
);
export const BookTransferView = dynamic(
  () => import("./book-transfer-view").then((m) => m.BookTransferView),
  { loading: () => loadingComponent, ssr: false }
);
export const KioskModeView = dynamic(
  () => import("./kiosk-mode-view").then((m) => m.KioskModeView),
  { loading: () => loadingComponent, ssr: false }
);

// New views from Tahap 22
export const RoomsView = dynamic(
  () => import("./rooms-view").then((m) => m.RoomsView),
  { loading: () => loadingComponent, ssr: false }
);
export const VisitorsView = dynamic(
  () => import("./visitors-view").then((m) => m.VisitorsView),
  { loading: () => loadingComponent, ssr: false }
);
export const AssetsView = dynamic(
  () => import("./assets-view").then((m) => m.AssetsView),
  { loading: () => loadingComponent, ssr: false }
);
export const ApiKeysView = dynamic(
  () => import("./api-keys-view").then((m) => m.ApiKeysView),
  { loading: () => loadingComponent, ssr: false }
);

// ===== MEMBER VIEWS =====
export const MyDashboardView = dynamic(
  () => import("./my-dashboard-view").then((m) => m.MyDashboardView),
  { loading: () => loadingComponent, ssr: false }
);
export const MyLoansView = dynamic(
  () => import("./my-loans-view").then((m) => m.MyLoansView),
  { loading: () => loadingComponent, ssr: false }
);
export const MyCardView = dynamic(
  () => import("./my-card-view").then((m) => m.MyCardView),
  { loading: () => loadingComponent, ssr: false }
);
export const MyProfileView = dynamic(
  () => import("./my-profile-view").then((m) => m.MyProfileView),
  { loading: () => loadingComponent, ssr: false }
);
export const ReadingHistoryView = dynamic(
  () => import("./reading-history-view").then((m) => m.ReadingHistoryView),
  { loading: () => loadingComponent, ssr: false }
);
export const WishlistView = dynamic(
  () => import("./wishlist-view").then((m) => m.WishlistView),
  { loading: () => loadingComponent, ssr: false }
);
export const NotificationsView = dynamic(
  () => import("./notifications-view").then((m) => m.NotificationsView),
  { loading: () => loadingComponent, ssr: false }
);
export const MySessionsView = dynamic(
  () => import("./my-sessions-view").then((m) => m.MySessionsView),
  { loading: () => loadingComponent, ssr: false }
);

// E-book reader (Tahap 24)
export const EBookReaderView = dynamic(
  () => import("./ebook-reader-view").then((m) => m.EBookReaderView),
  { loading: () => loadingComponent, ssr: false }
);

// Barcode labels (Tahap 25)
export const BarcodeLabelsView = dynamic(
  () => import("./barcode-labels-view").then((m) => m.BarcodeLabelsView),
  { loading: () => loadingComponent, ssr: false }
);

// Customizable dashboard (Tahap 26)
export const CustomizableDashboardView = dynamic(
  () => import("./customizable-dashboard-view").then((m) => m.CustomizableDashboardView),
  { loading: () => loadingComponent, ssr: false }
);

// Report builder (Tahap 30)
export const ReportBuilderView = dynamic(
  () => import("./report-builder-view").then((m) => m.ReportBuilderView),
  { loading: () => loadingComponent, ssr: false }
);

// Reward System (Sprint 1)
export const RewardsCatalogView = dynamic(
  () => import("../rewards/rewards-view").then((m) => m.RewardsView),
  { loading: () => loadingComponent, ssr: false }
);

export const MyRedemptionsView = dynamic(
  () => import("../rewards/my-redemptions-view").then((m) => m.MyRedemptionsView),
  { loading: () => loadingComponent, ssr: false }
);

export const RewardsManagementView = dynamic(
  () => import("../rewards/rewards-management-view").then((m) => m.RewardsManagementView),
  { loading: () => loadingComponent, ssr: false }
);

export const PointWidget = dynamic(
  () => import("../rewards/point-widget").then((m) => m.PointWidget),
  { loading: () => loadingComponent, ssr: false }
);

export const PickupCode = dynamic(
  () => import("../rewards/pickup-code").then((m) => m.PickupCode),
  { loading: () => loadingComponent, ssr: false }
);

export const RewardCard = dynamic(
  () => import("../rewards/reward-card").then((m) => m.RewardCard),
  { loading: () => loadingComponent, ssr: false }
);

export const RewardForm = dynamic(
  () => import("../rewards/reward-form").then((m) => m.RewardForm),
  { loading: () => loadingComponent, ssr: false }
);

export const AdminRedeemView = dynamic(
  () => import("../rewards/admin-redeem-view").then((m) => m.AdminRedeemView),
  { loading: () => loadingComponent, ssr: false }
);
