"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  Clock,
  Wallet,
  BookHeart,
  RotateCw,
  Loader2,
  ArrowRight,
  Megaphone,
  Pin,
  Sparkles,
  CreditCard,
  AlertTriangle,
  BookPlus,
  Library,
  CheckCircle2,
  XCircle,
  Hourglass,
  CalendarClock,
  Users,
  Target,
  Trophy,
  TrendingUp,
  GraduationCap,
  BookMarked,
  Activity,
  UserX,
  Sun,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/form/button";
import { Card } from "@/components/ui/layout/card";
import { Badge } from "@/components/ui/data-display/badge";
import { Progress } from "@/components/ui/feedback/progress";

import { RoleEmptyState } from "@/components/app/shared/role-empty-state";
import { RoleBadge } from "@/components/app/shared/role-badge";
import { StatCard } from "@/components/app/shared/stat-card";
import { BookCover } from "@/components/app/shared/book-cover";
import { BookCard, type BookWithDetails } from "@/components/app/shared/book-card";
import { GamificationSection } from "@/components/app/shared/gamification-section";
import { Spinner } from "@/components/app/shared/loading";
import { FeaturedHero } from "@/components/app/shared/featured-hero";
import { ReadingListCard } from "@/components/app/shared/reading-list-card";
import { ReadingListEditor } from "@/components/app/shared/reading-list-editor";

import { useFetch } from "@/hooks/use-fetch";
import { api } from "@/lib/api-client";
import { useAppStore, type ViewKey } from "@/store/use-app-store";
import {
  LOAN_RULES,
  ROLE_LABELS,
  ROLE_COLORS,
  LIBRARY_NAME,
  LIBRARY_TAGLINE,
  formatRupiah,
  formatDate,
  formatDateShort,
  daysBetween,
  calculateFine,
} from "@/lib/constants";
import { getDashboardVariant, showsGamification as roleShowsGamification } from "@/lib/role-access";
import {
  buildTodayFocus,
  describePulse,
  type ClassActivityRow,
  type ClassmateRow,
  type ClassPulseRow,
  type ClassRanking,
  type SilentStudentRow,
  type TodayFocus,
} from "@/lib/member-dashboard";

interface Loan {
  id: string;
  memberId: string;
  bookItemId: string;
  bookId: string;
  loanDate: string;
  dueDate: string;
  returnDate: string | null;
  status: string;
  fineAmount: number;
  finePaid: number;
  renewedCount: number;
  bookItem: {
    book: {
      id: string;
      title: string;
      author: string;
      coverColor: string;
      coverImage: string | null;
    };
  };
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  publishedAt: string;
  author?: { name: string | null } | null;
}

interface WishlistItem {
  id: string;
  book: { id: string; title: string; author: string };
}

interface Reservation {
  id: string;
  bookId: string;
  status: string;
  expiresAt: string | null;
  reservedAt: string;
  queueOrder: number;
  book: {
    id: string;
    title: string;
    author: string;
    coverColor: string;
    coverImage: string | null;
  };
}

interface Proposal {
  id: string;
  status: string;
  title?: string;
  bookTitle?: string;
  reason?: string;
  createdAt?: string;
  authorName?: string;
  submittedAt?: string;
}

interface TeacherStudentRow {
  id: string;
  fullName: string;
  memberNumber: string;
  classGrade: string | null;
  activeLoans: number;
  overdueLoans: number;
}

interface TeacherDashExtra {
  subject: string | null;
  taughtClasses: string[];
  needsClassSetup: boolean;
  studentCount: number;
  overdueCount: number;
  classSummary: ClassActivityRow[];
  students: TeacherStudentRow[];
  overdueStudents: {
    id: string;
    dueDate: string;
    memberName: string;
    memberNumber: string;
    classGrade: string | null;
    bookId: string;
    bookTitle: string;
  }[];
  subjectBooks: {
    id: string;
    title: string;
    author: string;
    coverColor: string;
    coverImage: string | null;
    subject: string | null;
    available: number;
  }[];
  pulse?: ClassPulseRow[];
  pulseTotal?: ClassPulseRow;
  silentStudents?: SilentStudentRow[];
}

interface StudentDashExtra {
  classGrade: string | null;
  booksReadThisYear: number;
  classmates: ClassmateRow[];
  ranking?: ClassRanking;
}

interface MemberDashboardResponse {
  role: "TEACHER" | "STUDENT";
  rules: {
    maxBooks: number;
    loanDays: number;
    finePerDay: number;
    maxRenewals: number;
    summary: string;
  };
  teacher: TeacherDashExtra | null;
  student: StudentDashExtra | null;
}

type BookLite = BookWithDetails;

function greetingByTime(): string {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}

export function MyDashboardView({ variant = "student" }: { variant?: "student" | "teacher" }) {
  const user = useAppStore((s) => s.user);
  const setView = useAppStore((s) => s.setView);
  const effectiveVariant = user?.role ? getDashboardVariant(user.role) : variant;

  const [renewingId, setRenewingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const loansUrl = user?.member ? `/api/loans?mine=1` : null;
  const { data: loans, loading: loansLoading, error: loansError, refetch: refetchLoans } = useFetch<Loan[]>(loansUrl);
  const { data: announcements, loading: annLoading } = useFetch<Announcement[]>(`/api/announcements`);
  const { data: wishlist } = useFetch<WishlistItem[]>(`/api/wishlist?mine=1`);
  const { data: recData, loading: recLoading } = useFetch<{
    recommended: BookLite[];
    hasHistory: boolean;
    label: string;
  }>(effectiveVariant === "student" ? `/api/books/recommendations` : null);
  const recommended = recData?.recommended ?? [];
  const recLabel = recData?.label ?? "Mungkin Kamu Suka";
  const { data: settings } = useFetch<Record<string, string>>(`/api/settings`);
  const { data: myProposals, loading: proposalsLoading } = useFetch<Proposal[]>(
    effectiveVariant === "teacher" ? `/api/proposals?mine=1` : null
  );
  const { data: dashExtra, loading: dashExtraLoading } = useFetch<MemberDashboardResponse>(
    user?.member ? "/api/dashboard/member" : null
  );
  const reservationsUrl = user?.member ? `/api/reservations?mine=1` : null;
  const { data: myReservations, refetch: refetchReservations } = useFetch<Reservation[]>(reservationsUrl);
  const { data: featuredPayload } = useFetch<{ featured: BookLite | null }>("/api/public/featured");
  const { data: readingLists } = useFetch<{
    mine: { classGrades: string[]; items: { note?: string | null; book: BookLite }[] } | null;
    lists: {
      teacherName: string;
      subject: string | null;
      items: { note?: string | null; book: BookLite }[];
    }[];
  }>(user?.member ? "/api/reading-lists" : null);
  const [showRules, setShowRules] = useState(false);
  const [calmExpanded, setCalmExpanded] = useState(false);
  const showGamification =
    settings?.show_gamification !== "false" && roleShowsGamification(user?.role);

  const stats = useMemo(() => {
    const list = loans ?? [];
    const active = list.filter((l) => l.status === "LOANED" || l.status === "OVERDUE");
    const now = new Date();
    const dueSoon = active.filter((l) => {
      const days = daysBetween(new Date(l.dueDate), now);
      return days >= 0 && days <= 7;
    }).length;
    const fallbackRule = LOAN_RULES[user?.member?.category ?? "STUDENT"] ?? LOAN_RULES.STUDENT;
    const finePerDay = dashExtra?.rules.finePerDay ?? fallbackRule.finePerDay;
    const totalFine = active.reduce((sum, l) => {
      return sum + calculateFine(new Date(l.dueDate), null, finePerDay);
    }, 0);
    return {
      active: active.length,
      dueSoon,
      fine: totalFine,
      wishlistCount: wishlist?.length ?? 0,
      proposalTotal: myProposals?.length ?? 0,
      proposalPending: myProposals?.filter((p) => p.status === "PENDING").length ?? 0,
      proposalApproved: myProposals?.filter((p) => p.status === "APPROVED").length ?? 0,
      proposalRejected: myProposals?.filter((p) => p.status === "REJECTED").length ?? 0,
    };
  }, [loans, wishlist, user?.member?.category, myProposals, dashExtra?.rules.finePerDay]);

  const activeLoans = useMemo(() => {
    const list = loans ?? [];
    return list
      .filter((l) => l.status === "LOANED" || l.status === "OVERDUE")
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [loans]);

  const topAnnouncements = useMemo(() => {
    const list = announcements ?? [];
    return [...list]
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      })
      .slice(0, 3);
  }, [announcements]);

  const activeReservations = useMemo(() => {
    return (myReservations ?? [])
      .filter((r) => r.status === "PENDING" || r.status === "READY")
      .sort((a, b) => (a.status === "READY" ? -1 : b.status === "READY" ? 1 : a.queueOrder - b.queueOrder));
  }, [myReservations]);

  const todayFocus = useMemo((): TodayFocus | null => {
    if (effectiveVariant !== "student") return null;
    const now = new Date();
    const active = (loans ?? []).filter((l) => l.status === "LOANED" || l.status === "OVERDUE");
    const scored = active
      .map((l) => ({ loan: l, days: daysBetween(new Date(l.dueDate), now) }))
      .sort((a, b) => a.days - b.days);
    const overdue = scored.find((s) => s.days < 0);
    const dueSoon = scored.find((s) => s.days >= 0 && s.days <= 3);
    const reading = scored.find((s) => s.days > 3);
    const ready = (myReservations ?? []).find((r) => r.status === "READY");
    const rec = recommended[0];
    return buildTodayFocus({
      overdue: overdue
        ? { title: overdue.loan.bookItem.book.title, daysLate: Math.abs(overdue.days), bookId: overdue.loan.bookItem.book.id }
        : null,
      dueSoon: dueSoon
        ? { title: dueSoon.loan.bookItem.book.title, daysLeft: dueSoon.days, bookId: dueSoon.loan.bookItem.book.id }
        : null,
      ready: ready
        ? {
            title: ready.book.title,
            expiresLabel: ready.expiresAt ? formatDateShort(ready.expiresAt) : null,
            bookId: ready.book.id,
          }
        : null,
      reading: reading
        ? { title: reading.loan.bookItem.book.title, daysLeft: reading.days, bookId: reading.loan.bookItem.book.id }
        : null,
      recommend: rec ? { title: rec.title, bookId: rec.id } : null,
    });
  }, [effectiveVariant, loans, myReservations, recommended]);

  if (!user || !user.member) {
    return (
      <div className="space-y-6">
        <div className="p-6">
          <RoleEmptyState
            context="no-active-loans"
            userRole="STUDENT"
            title="Akun Anda belum terdaftar sebagai anggota"
            description="Silakan hubungi pustakawan untuk mengaktifkan keanggotaan Anda."
            compact
          />
        </div>
      </div>
    );
  }

  const fallbackRule = LOAN_RULES[user.member.category] ?? LOAN_RULES.STUDENT;
  const rule = dashExtra?.rules ?? fallbackRule;
  const firstName = user.member.fullName.split(" ")[0];
  const quotaPct = rule.maxBooks > 0 ? Math.min(100, (stats.active / rule.maxBooks) * 100) : 0;
  const isTeacher = effectiveVariant === "teacher";

  async function handleRenew(loan: Loan) {
    setRenewingId(loan.id);
    try {
      const updated = await api.put<Loan>(`/api/loans/${loan.id}/renew`, {});
      toast.success(`"${updated.bookItem.book.title}" berhasil diperpanjang hingga ${formatDate(updated.dueDate)}.`);
      refetchLoans();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memperpanjang peminjaman");
    } finally {
      setRenewingId(null);
    }
  }

  async function handleCancelReservation(reservation: Reservation) {
    setCancellingId(reservation.id);
    try {
      await api.put("/api/reservations", { id: reservation.id, action: "cancel" });
      toast.success(`Reservasi "${reservation.book.title}" dibatalkan.`);
      refetchReservations();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membatalkan reservasi");
    } finally {
      setCancellingId(null);
    }
  }

  function dueCountdown(dueDate: string): { text: string; tone: "ok" | "warn" | "danger" } {
    const now = new Date();
    const diff = daysBetween(new Date(dueDate), now);
    if (diff < 0) {
      const overdueDays = Math.abs(diff);
      return { text: `Terlambat ${overdueDays} hari`, tone: "danger" };
    }
    if (diff === 0) return { text: "Jatuh tempo hari ini", tone: "warn" };
    if (diff <= 3) return { text: `Jatuh tempo dalam ${diff} hari`, tone: "warn" };
    return { text: `Jatuh tempo dalam ${diff} hari`, tone: "ok" };
  }

  return (
    <div className="space-y-6">
      <Card
        className={`relative overflow-hidden border-0 p-6 sm:p-8 text-primary-foreground shadow-lg ${
          isTeacher
            ? "bg-gradient-to-br from-amber-800 via-[#7c4a2d] to-[#2d5a3d]"
            : "bg-gradient-to-br from-primary via-primary to-primary/80"
        }`}
      >
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-32 w-32 rounded-full bg-emerald-300/20 blur-2xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`${ROLE_COLORS[user.member.category] ?? ""} border-0`}>
                {ROLE_LABELS[user.member.category] ?? user.member.category}
              </Badge>
              <RoleBadge user={user} showIcon={false} className="bg-white/20 text-white border-white/30" />
              <span className="text-xs font-mono bg-white/15 px-2 py-0.5 rounded-md text-white/90">
                {user.member.memberNumber}
              </span>
              {user.member.classGrade && (
                <span className="text-xs bg-white/15 px-2 py-0.5 rounded-md text-white/90">
                  {isTeacher ? `Mapel: ${user.member.classGrade}` : `Kelas ${user.member.classGrade}`}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
                {greetingByTime()}, {firstName}!
              </h1>
              <p className="text-sm text-primary-foreground/80 mt-1.5 max-w-md">
                {isTeacher
                  ? `${LIBRARY_TAGLINE}. Pantau literasi kelas, ajukan pengadaan, dan kelola referensi mengajar di ${LIBRARY_NAME}.`
                  : `${LIBRARY_TAGLINE}. Kelola peminjaman & jelajahi koleksi ${LIBRARY_NAME} di sini.`}
              </p>
            </div>
          </div>

          <div className="lg:w-80 shrink-0 rounded-2xl bg-white/15 backdrop-blur-sm p-4 border border-white/20">
            <div className="flex items-center justify-between text-xs text-primary-foreground/90 mb-2">
              <span className="font-medium flex items-center gap-1">
                Kuota {isTeacher ? "Guru" : "Siswa"}
                <button
                  type="button"
                  onClick={() => setShowRules((v) => !v)}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20 hover:bg-white/30"
                  aria-label="Lihat aturan pinjam"
                  title="Aturan pinjam"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                </button>
              </span>
              <span className="font-mono">
                {stats.active} / {rule.maxBooks} buku
              </span>
            </div>
            <Progress
              value={quotaPct}
              className="h-2.5 bg-white/20 [&>[data-slot=progress-indicator]]:bg-white"
            />
            <p className="text-[11px] text-primary-foreground/80 mt-2">
              {stats.active === 0
                ? "Anda belum meminjam buku apapun."
                : quotaPct >= 100
                ? "Kuota penuh. Kembalikan buku untuk meminjam lagi."
                : `Masih bisa meminjam ${Math.max(0, rule.maxBooks - stats.active)} buku lagi.`}
            </p>
          </div>
        </div>
      </Card>

      {showRules && (
        <LoanRulesStrip
          maxBooks={rule.maxBooks}
          loanDays={rule.loanDays}
          finePerDay={rule.finePerDay}
          maxRenewals={rule.maxRenewals}
          isTeacher={isTeacher}
        />
      )}

      {!isTeacher && !calmExpanded && (
        <div className="lg:hidden space-y-4">
          {todayFocus && <TodayFocusCard focus={todayFocus} setView={setView} />}
          {activeLoans[0] && (
            <Card className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Sedang dibaca</p>
              <p className="text-sm font-semibold mt-1">{activeLoans[0].bookItem.book.title}</p>
              <p className="text-xs text-muted-foreground">{dueCountdown(activeLoans[0].dueDate).text}</p>
            </Card>
          )}
          {(readingLists?.lists ?? []).map((list) => (
            <ReadingListCard
              key={list.teacherName}
              teacherName={list.teacherName}
              subject={list.subject}
              items={list.items}
              onOpen={(id) => setView("book-detail", { id })}
            />
          ))}
          <Button variant="outline" className="w-full" onClick={() => setCalmExpanded(true)}>
            Beranda lengkap
          </Button>
        </div>
      )}

      <div className={!isTeacher && !calmExpanded ? "hidden lg:block space-y-6" : "space-y-6"}>
      {todayFocus && <TodayFocusCard focus={todayFocus} setView={setView} />}

      <DashboardZone title={isTeacher ? "Pulsa kelas" : "Hari ini"}>
      {isTeacher && (
        <TeacherSections
          zone="pulse"
          proposals={myProposals}
          proposalsLoading={proposalsLoading}
          stats={stats}
          extra={dashExtra?.teacher}
          extraLoading={dashExtraLoading}
          setView={setView}
          readingMine={readingLists?.mine}
        />
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Sedang Dipinjam"
          value={loansLoading ? "..." : stats.active}
          icon={BookOpen}
          color="bg-sky-100 text-sky-700"
          subtitle={`Maks. ${rule.maxBooks} buku · ${rule.loanDays} hari`}
        />
        <StatCard
          label="Jatuh Tempo Minggu Ini"
          value={loansLoading ? "..." : stats.dueSoon}
          icon={Clock}
          color="bg-amber-100 text-amber-700"
          subtitle="Segera kembalikan"
        />
        <StatCard
          label="Denda"
          value={loansLoading ? "..." : formatRupiah(stats.fine)}
          icon={Wallet}
          color={stats.fine > 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}
          subtitle={
            stats.fine > 0
              ? "Segera lunasi"
              : `${rule.finePerDay === 0 ? "Tanpa denda" : `${formatRupiah(rule.finePerDay)}/hari`}`
          }
        />
        {isTeacher ? (
          <StatCard
            label="Usulan Menunggu"
            value={proposalsLoading ? "..." : stats.proposalPending}
            icon={BookPlus}
            color="bg-amber-100 text-amber-700"
            subtitle={`${stats.proposalTotal} usulan diajukan`}
          />
        ) : (
          <StatCard
            label="Wishlist"
            value={stats.wishlistCount}
            icon={BookHeart}
            color="bg-violet-100 text-violet-700"
            subtitle="Buku favorit"
          />
        )}
      </div>

      </DashboardZone>

      <DashboardZone title={isTeacher ? "Perlu tindakan" : "Untukmu"}>
      {featuredPayload?.featured && !isTeacher && (
        <FeaturedHero
          book={featuredPayload.featured}
          onOpen={(id) => setView("book-detail", { id })}
          ctaLabel="Buka buku"
        />
      )}
      {!isTeacher &&
        (readingLists?.lists ?? []).map((list) => (
          <ReadingListCard
            key={list.teacherName}
            teacherName={list.teacherName}
            subject={list.subject}
            items={list.items}
            onOpen={(id) => setView("book-detail", { id })}
          />
        ))}
      {isTeacher ? (
        <TeacherSections
          zone="action"
          proposals={myProposals}
          proposalsLoading={proposalsLoading}
          stats={stats}
          extra={dashExtra?.teacher}
          extraLoading={dashExtraLoading}
          setView={setView}
          readingMine={readingLists?.mine}
        />
      ) : (
        <StudentSections
          recommended={recommended}
          recLoading={recLoading}
          recLabel={recLabel}
          extra={dashExtra?.student}
          extraLoading={dashExtraLoading}
          setView={setView}
        />
      )}
      </DashboardZone>

      {isTeacher && (
        <TeacherSections
          zone="more"
          proposals={myProposals}
          proposalsLoading={proposalsLoading}
          stats={stats}
          extra={dashExtra?.teacher}
          extraLoading={dashExtraLoading}
          setView={setView}
          readingMine={readingLists?.mine}
        />
      )}

      <DashboardZone title="Aktivitas">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Buku Sedang Dipinjam
            </h2>
            {activeLoans.length > 0 && (
              <Button variant="ghost" size="sm" className="gap-1" onClick={() => setView("my-loans")}>
                Lihat Semua
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {loansLoading ? (
            <Card className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-24 w-16 rounded bg-muted animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-3.5 w-3/4 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-2/5 rounded bg-muted animate-pulse" />
                  </div>
                </div>
              ))}
            </Card>
          ) : loansError ? (
            <Card className="p-6 text-center text-sm text-destructive">
              Gagal memuat peminjaman: {loansError}
            </Card>
          ) : activeLoans.length === 0 ? (
            <RoleEmptyState context="no-active-loans" userRole={effectiveVariant} compact />
          ) : (
            <div className="space-y-3">
              {activeLoans.map((loan) => {
                const book = loan.bookItem.book;
                const countdown = dueCountdown(loan.dueDate);
                const isOverdue = countdown.tone === "danger";
                const fine = calculateFine(new Date(loan.dueDate), null, rule.finePerDay);
                const canRenew = loan.renewedCount < rule.maxRenewals;

                return (
                  <Card
                    key={loan.id}
                    className={`p-4 ${isOverdue ? "border-red-200 bg-red-50/50 dark:bg-red-950/10" : ""}`}
                  >
                    <div className="flex gap-4">
                      <button
                        onClick={() => setView("book-detail", { id: book.id })}
                        className="shrink-0 w-16 sm:w-20"
                        aria-label={`Lihat detail ${book.title}`}
                      >
                        <BookCover
                          title={book.title}
                          author={book.author}
                          color={book.coverColor}
                          coverImage={book.coverImage}
                          size="sm"
                        />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <button
                              onClick={() => setView("book-detail", { id: book.id })}
                              className="text-left font-semibold text-sm leading-tight hover:text-primary transition-colors line-clamp-2"
                            >
                              {book.title}
                            </button>
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{book.author}</p>
                          </div>
                          {loan.renewedCount > 0 && (
                            <Badge variant="outline" className="shrink-0 text-[10px] py-0">
                              <RotateCw className="h-3 w-3 mr-1" />
                              {loan.renewedCount}x
                            </Badge>
                          )}
                        </div>

                        <div className="mt-2 flex items-center gap-2 flex-wrap text-xs">
                          <span className="text-muted-foreground">
                            Jatuh tempo:{" "}
                            <span className="font-medium text-foreground">{formatDateShort(loan.dueDate)}</span>
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              isOverdue
                                ? "border-red-200 bg-red-100 text-red-700"
                                : countdown.tone === "warn"
                                ? "border-amber-200 bg-amber-100 text-amber-700"
                                : "border-emerald-200 bg-emerald-100 text-emerald-700"
                            }
                          >
                            {isOverdue ? <AlertTriangle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                            {countdown.text}
                          </Badge>
                        </div>

                        {isOverdue && fine > 0 && (
                          <p className="mt-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
                            Denda: {formatRupiah(fine)}
                          </p>
                        )}

                        <div className="mt-3 flex items-center gap-2">
                          <Button
                            size="sm"
                            variant={isOverdue ? "destructive" : "outline"}
                            className="h-8"
                            disabled={renewingId === loan.id || !canRenew}
                            onClick={() => handleRenew(loan)}
                          >
                            {renewingId === loan.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RotateCw className="h-3.5 w-3.5" />
                            )}
                            Perpanjang
                          </Button>
                          {!canRenew && (
                            <span className="text-[11px] text-muted-foreground">
                              Batas perpanjangan {rule.maxRenewals}× tercapai
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              Pengumuman Terbaru
            </h2>
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => setView("announcements")}>
              Lihat Semua
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {annLoading ? (
            <Card className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3.5 w-3/4 rounded bg-muted animate-pulse" />
                  <div className="h-3 w-full rounded bg-muted animate-pulse" />
                </div>
              ))}
            </Card>
          ) : topAnnouncements.length === 0 ? (
            <RoleEmptyState context="no-announcements" userRole={effectiveVariant} compact />
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin pr-1">
              {topAnnouncements.map((ann) => (
                <Card
                  key={ann.id}
                  className={`p-4 hover:shadow-md transition-shadow cursor-pointer ${
                    ann.isPinned ? "border-primary/40 bg-primary/5" : ""
                  }`}
                  onClick={() => setView("announcements")}
                >
                  <div className="flex items-start gap-2">
                    {ann.isPinned && <Pin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm leading-snug line-clamp-2">{ann.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ann.content}</p>
                      <p className="text-[11px] text-muted-foreground mt-1.5">{formatDateShort(ann.publishedAt)}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group" onClick={() => setView("my-card")}>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CreditCard className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Kartu Anggota Saya</p>
                <p className="text-sm font-semibold truncate">{user.member.fullName}</p>
                <p className="text-xs text-muted-foreground font-mono">{user.member.memberNumber}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Card>
        </div>
      </div>

      {activeReservations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              Reservasi Saya
            </h2>
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => setView("my-loans")}>
              Lihat Semua
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeReservations.map((r) => (
              <Card
                key={r.id}
                className={`p-4 ${r.status === "READY" ? "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/10" : ""}`}
              >
                <div className="flex gap-3">
                  <button
                    onClick={() => setView("book-detail", { id: r.book.id })}
                    className="shrink-0"
                    aria-label={`Lihat detail ${r.book.title}`}
                  >
                    <BookCover
                      title={r.book.title}
                      author={r.book.author}
                      color={r.book.coverColor}
                      coverImage={r.book.coverImage}
                      size="sm"
                    />
                  </button>
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => setView("book-detail", { id: r.book.id })}
                      className="text-left font-semibold text-sm leading-tight hover:text-primary transition-colors line-clamp-2"
                    >
                      {r.book.title}
                    </button>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{r.book.author}</p>
                    <div className="mt-2 flex items-center gap-2">
                      {r.status === "READY" ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Siap Diambil
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                          <Hourglass className="h-3 w-3 mr-1" />
                          Mengantre #{r.queueOrder}
                        </Badge>
                      )}
                    </div>
                    {r.status === "READY" && r.expiresAt && (
                      <p className="mt-1.5 text-[11px] text-muted-foreground">
                        Ambil sebelum {formatDateShort(r.expiresAt)}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8"
                        disabled={cancellingId === r.id}
                        onClick={() => handleCancelReservation(r)}
                      >
                        {cancellingId === r.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" />
                        )}
                        Batalkan
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {showGamification && user.member && <GamificationSection memberId={user.member.id} />}
      </DashboardZone>
      </div>
    </div>
  );
}

function DashboardZone({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</h2>
        <div className="h-px flex-1 bg-border" />
      </div>
      {children}
    </section>
  );
}

function TodayFocusCard({
  focus,
  setView,
}: {
  focus: TodayFocus;
  setView: (view: ViewKey, params?: Record<string, string>) => void;
}) {
  const tone =
    focus.kind === "overdue"
      ? "border-red-200 bg-red-50/70 dark:bg-red-950/20"
      : focus.kind === "due-soon"
      ? "border-amber-200 bg-amber-50/70 dark:bg-amber-950/20"
      : focus.kind === "ready"
      ? "border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/20"
      : "border-sky-200 bg-sky-50/70 dark:bg-sky-950/20";
  const iconTone =
    focus.kind === "overdue"
      ? "bg-red-100 text-red-700"
      : focus.kind === "due-soon"
      ? "bg-amber-100 text-amber-700"
      : focus.kind === "ready"
      ? "bg-emerald-100 text-emerald-700"
      : "bg-sky-100 text-sky-700";
  return (
    <Card className={`p-4 sm:p-5 ${tone}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconTone}`}>
          {focus.kind === "overdue" || focus.kind === "due-soon" ? (
            <AlertTriangle className="h-5 w-5" />
          ) : focus.kind === "ready" ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Hari Ini</p>
          <h2 className="text-sm font-semibold">{focus.title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{focus.detail}</p>
        </div>
        <Button
          size="sm"
          className="h-8 gap-1 shrink-0"
          onClick={() => setView(focus.actionView, focus.actionParams)}
        >
          {focus.actionLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}

function LoanRulesStrip({
  maxBooks,
  loanDays,
  finePerDay,
  maxRenewals,
  isTeacher,
}: {
  maxBooks: number;
  loanDays: number;
  finePerDay: number;
  maxRenewals: number;
  isTeacher: boolean;
}) {
  const items = [
    { label: "Maks. pinjam", value: `${maxBooks} buku` },
    { label: "Durasi", value: `${loanDays} hari` },
    { label: "Denda", value: finePerDay === 0 ? "Gratis" : `${formatRupiah(finePerDay)}/hari` },
    { label: "Perpanjang", value: `${maxRenewals}×` },
  ];
  return (
    <Card className="p-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Aturan {isTeacher ? "Guru" : "Siswa"}
          </p>
          <p className="text-sm font-medium">
            {isTeacher
              ? "Kuota lebih longgar untuk referensi mengajar."
              : "Kuota lebih ketat agar koleksi berputar merata."}
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:ml-auto">
          {items.map((item) => (
            <div key={item.label} className="rounded-lg border bg-muted/40 px-3 py-2">
              <p className="text-[11px] text-muted-foreground">{item.label}</p>
              <p className="text-sm font-semibold">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function TeacherSections({
  zone = "action",
  proposals,
  proposalsLoading,
  stats,
  extra,
  extraLoading,
  setView,
  readingMine,
}: {
  zone?: "pulse" | "action" | "more";
  proposals: Proposal[] | null | undefined;
  proposalsLoading: boolean;
  stats: { proposalTotal: number; proposalPending: number; proposalApproved: number; proposalRejected: number };
  extra: TeacherDashExtra | null | undefined;
  extraLoading: boolean;
  setView: (view: ViewKey, params?: Record<string, string>) => void;
  readingMine?: { classGrades: string[]; items: { note?: string | null; book: BookLite }[] } | null;
}) {
  const pulse = extra?.pulseTotal;
  const pulseText = pulse ? describePulse(pulse) : null;

  if (zone === "pulse") {
    return (
      <div className="space-y-4">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="font-semibold flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4 text-amber-700" />
              Pulsa Kelas
            </h2>
            <Badge variant="outline" className="shrink-0">
              {extraLoading ? "..." : `${extra?.studentCount ?? 0} siswa`}
            </Badge>
          </div>
          {extraLoading ? (
            <Spinner />
          ) : extra?.needsClassSetup ? (
            <RoleEmptyState
              context="no-class-overview"
              userRole="TEACHER"
              title="Kelas yang Anda ajar belum diatur"
              description="Atur kelas di Pengaturan agar pulsa kelas hanya menghitung siswa Anda."
              primaryAction={{ label: "Atur Kelas", onClick: () => setView("settings") }}
              compact
              className="border-dashed"
            />
          ) : pulse && pulse.studentCount > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-medium">{pulseText}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  ["Sedang baca", pulse.readingCount],
                  ["Terlambat", pulse.overdueStudentCount],
                  ["Diam 30 hari", pulse.silentCount],
                  ["Belum pinjam bulan ini", pulse.noLoanThisMonthCount],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-lg border bg-muted/40 px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">{label}</p>
                    <p className="text-lg font-semibold">{value}</p>
                  </div>
                ))}
              </div>
              {(extra.pulse?.length ?? 0) > 1 && (
                <div className="space-y-1.5">
                  {extra.pulse!.map((row) => (
                    <p key={row.classGrade} className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{row.classGrade}:</span>{" "}
                      {describePulse(row)}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <RoleEmptyState context="no-class-overview" userRole="TEACHER" compact className="border-dashed" />
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="font-semibold flex items-center gap-2 text-sm">
              <GraduationCap className="h-4 w-4 text-amber-700" />
              Statistik Literasi Kelas
            </h2>
            <Badge variant="outline" className="shrink-0">
              {extraLoading ? "..." : `${extra?.studentCount ?? 0} siswa`}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Hanya kelas yang Anda ajar
            {extra?.taughtClasses?.length ? ` (${extra.taughtClasses.join(", ")})` : ""}. Data
            pribadi terbatas pada nama dan kelas.
          </p>
          {extraLoading ? (
            <Spinner />
          ) : extra?.needsClassSetup ? (
            <RoleEmptyState
              context="no-class-overview"
              userRole="TEACHER"
              title="Kelas yang Anda ajar belum diatur"
              description="Atur kelas di Pengaturan agar hanya siswa Anda yang tampil di sini."
              primaryAction={{ label: "Atur Kelas", onClick: () => setView("settings") }}
              compact
              className="border-dashed"
            />
          ) : extra && extra.classSummary.length > 0 ? (
            <div className="space-y-2 max-h-56 overflow-y-auto scrollbar-thin">
              {extra.classSummary.map((row) => (
                <div key={row.classGrade} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{row.classGrade}</p>
                    <p className="text-muted-foreground">
                      {row.studentCount} siswa · {row.booksReadThisYear} selesai tahun ini
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-medium">{row.activeLoans} aktif</p>
                    {row.overdueLoans > 0 && (
                      <p className="text-red-600 font-semibold">{row.overdueLoans} terlambat</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <RoleEmptyState context="no-class-overview" userRole="TEACHER" compact className="border-dashed" />
          )}
        </Card>
      </div>
    );
  }

  if (zone === "action") {
    return (
      <div className="space-y-4">
        <ReadingListEditor
          taughtClasses={extra?.taughtClasses ?? []}
          initialItems={readingMine?.items ?? []}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="font-semibold flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                Siswa Perlu Perhatian
              </h2>
              <Badge variant="outline" className="shrink-0">
                {extraLoading ? "..." : `${extra?.overdueCount ?? 0} terlambat`}
              </Badge>
            </div>
            {extraLoading ? (
              <Spinner />
            ) : extra && extra.overdueStudents.length > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto scrollbar-thin">
                {extra.overdueStudents.map((row) => (
                  <button
                    key={row.id}
                    onClick={() => setView("book-detail", { id: row.bookId })}
                    className="w-full text-left flex items-center gap-2 rounded-lg border px-3 py-2 text-xs hover:bg-accent/40"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{row.memberName}</p>
                      <p className="text-muted-foreground truncate">
                        {row.classGrade ?? "Tanpa kelas"} · {row.bookTitle}
                      </p>
                    </div>
                    <span className="text-red-600 font-medium shrink-0">
                      {formatDateShort(row.dueDate)}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <RoleEmptyState context="no-overdue" userRole="TEACHER" compact className="border-dashed" />
            )}
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="font-semibold flex items-center gap-2 text-sm">
                <UserX className="h-4 w-4 text-amber-700" />
                Diam 30 hari
              </h2>
            </div>
            {extraLoading ? (
              <Spinner />
            ) : (extra?.silentStudents?.length ?? 0) > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto scrollbar-thin">
                {extra!.silentStudents!.map((row) => (
                  <div key={row.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs">
                    <div>
                      <p className="font-semibold">{row.fullName}</p>
                      <p className="text-muted-foreground">{row.classGrade ?? "Tanpa kelas"}</p>
                    </div>
                    <span className="text-muted-foreground">
                      {row.daysSinceActivity == null ? "Belum pernah pinjam" : `${row.daysSinceActivity} hari`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Tidak ada siswa yang diam 30 hari.</p>
            )}
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="font-semibold flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-sky-700" />
            Siswa Saya
          </h2>
          <Badge variant="outline" className="shrink-0">
            {extraLoading ? "..." : `${extra?.studentCount ?? 0} siswa`}
          </Badge>
        </div>
        {extraLoading ? (
          <Spinner />
        ) : extra?.needsClassSetup ? (
          <p className="text-xs text-muted-foreground">
            Atur kelas yang Anda ajar di Pengaturan untuk melihat daftar siswa.
          </p>
        ) : extra && extra.students?.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
            {extra.students.map((row) => (
              <div key={row.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{row.fullName}</p>
                  <p className="text-muted-foreground truncate">
                    {row.classGrade ?? "Tanpa kelas"} · {row.memberNumber}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-medium">{row.activeLoans} pinjam</p>
                  {row.overdueLoans > 0 && (
                    <p className="text-red-600 font-semibold">{row.overdueLoans} terlambat</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Belum ada siswa aktif di kelas yang Anda ajar.
          </p>
        )}
      </Card>

      <Card className="p-5 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="font-semibold flex items-center gap-2 text-sm">
            <BookPlus className="h-4 w-4 text-primary" />
            Usulan Buku Saya
          </h2>
          <Badge variant="outline" className="shrink-0">
            {proposalsLoading ? "..." : stats.proposalTotal} usulan
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Ajukan buku yang Anda butuhkan untuk pembelajaran; tinjau status usulan di sini.
        </p>
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Badge className="border-amber-200 bg-amber-100 text-amber-700">
            <Hourglass className="h-3 w-3 mr-1" />
            {proposalsLoading ? "..." : stats.proposalPending} menunggu
          </Badge>
          <Badge className="border-emerald-200 bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {proposalsLoading ? "..." : stats.proposalApproved} disetujui
          </Badge>
          <Badge className="border-red-200 bg-red-100 text-red-700">
            <XCircle className="h-3 w-3 mr-1" />
            {proposalsLoading ? "..." : stats.proposalRejected} ditolak
          </Badge>
        </div>
        {proposals && proposals.length > 0 ? (
          <div className="space-y-2 mb-4">
            {proposals.slice(0, 3).map((p, i) => (
              <div key={p.id ?? i} className="flex items-center gap-2 text-xs p-2 rounded bg-muted/50">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{p.title || p.bookTitle || "Usulan Buku"}</p>
                  {p.reason && <p className="text-muted-foreground line-clamp-1">{p.reason}</p>}
                </div>
                <Badge
                  variant="outline"
                  className={
                    p.status === "PENDING"
                      ? "border-amber-200 text-amber-700"
                      : p.status === "APPROVED"
                      ? "border-emerald-200 text-emerald-700"
                      : "border-red-200 text-red-700"
                  }
                >
                  {p.status === "PENDING" ? "Menunggu" : p.status === "APPROVED" ? "Disetujui" : "Ditolak"}
                </Badge>
              </div>
            ))}
          </div>
        ) : !proposalsLoading ? (
          <div className="mb-4">
            <RoleEmptyState context="no-proposals" userRole="TEACHER" compact className="border-dashed" />
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <Button size="sm" className="h-8 gap-1" onClick={() => setView("proposals")}>
            <BookPlus className="h-3.5 w-3.5" />
            Ajukan Usulan
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setView("proposals")}>
            Riwayat
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="font-semibold flex items-center gap-2 text-sm">
            <Library className="h-4 w-4 text-primary" />
            Referensi {extra?.subject ? extra.subject : "Mengajar"}
          </h2>
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => setView("catalog")}>
            Buka Katalog
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Buku yang relevan dengan mata pelajaran Anda, termasuk koleksi digital SIBI.
        </p>
        {extraLoading ? (
          <Spinner />
        ) : extra && extra.subjectBooks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {extra.subjectBooks.map((book) => (
              <button
                key={book.id}
                onClick={() => setView("book-detail", { id: book.id })}
                className="flex items-center gap-3 rounded-lg border p-2 text-left hover:bg-accent/40"
              >
                <div className="w-10 shrink-0">
                  <BookCover
                    title={book.title}
                    author={book.author}
                    color={book.coverColor}
                    coverImage={book.coverImage}
                    size="sm"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{book.title}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">{book.author}</p>
                  <p className="text-[11px] text-emerald-700">{book.available} tersedia</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <RoleEmptyState context="no-recommendations" userRole="TEACHER" compact className="border-dashed" />
        )}
      </Card>
    </div>
  );
}

function StudentSections({
  recommended,
  recLoading,
  recLabel,
  extra,
  extraLoading,
  setView,
}: {
  recommended: BookLite[];
  recLoading: boolean;
  recLabel: string;
  extra: StudentDashExtra | null | undefined;
  extraLoading: boolean;
  setView: (view: ViewKey, params?: Record<string, string>) => void;
}) {
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="font-semibold flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-amber-500" />
            {recLabel}
          </h2>
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => setView("catalog")}>
            Lihat Katalog
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
        {recLoading ? (
          <Spinner />
        ) : recommended && recommended.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto scrollbar-thin pb-3 -mx-1 px-1">
            {recommended.slice(0, 6).map((book) => (
              <div key={book.id} className="w-32 sm:w-36 shrink-0">
                <BookCard book={book} />
              </div>
            ))}
          </div>
        ) : (
          <RoleEmptyState context="no-recommendations" userRole="STUDENT" compact className="border-dashed" />
        )}
      </Card>

      <Card className="p-5 bg-gradient-to-br from-violet-50 to-pink-50 dark:from-violet-950/20 dark:to-pink-950/20 border-violet-200/50">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 text-white">
            <Trophy className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-violet-600" />
              Tantangan Baca
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {extraLoading
                ? "Menghitung progres tahun ini..."
                : extra
                ? `Kamu sudah menyelesaikan ${extra.booksReadThisYear} buku tahun ini. Raih badge di bagian Gamifikasi di bawah.`
                : "Raih badge dengan meminjam dan menyelesaikan bacaan."}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setView("catalog")}>
                <TrendingUp className="h-3.5 w-3.5" />
                Mulai Baca
              </Button>
              <Button size="sm" variant="ghost" className="h-8 gap-1" onClick={() => setView("reading-history")}>
                <BookMarked className="h-3.5 w-3.5" />
                Riwayat Baca
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="font-semibold flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-sky-600" />
            Ranking Sekelas
          </h2>
          {extra?.classGrade && (
            <Badge variant="outline" className="text-[11px]">
              Kelas {extra.classGrade}
            </Badge>
          )}
        </div>
        {extra?.ranking?.myRank && extra.ranking.classSize > 0 && (
          <p className="text-xs text-muted-foreground mb-3">
            Kamu peringkat <span className="font-semibold text-foreground">{extra.ranking.myRank}</span> dari{" "}
            {extra.ranking.classSize} di kelas ini · {extra.ranking.myLoanCount} pinjaman.
          </p>
        )}
        {extraLoading ? (
          <Spinner />
        ) : extra?.ranking && extra.ranking.rows.length > 0 ? (
          <div className="space-y-2">
            {extra.ranking.rows.map((mate) => (
              <div
                key={mate.id}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                  mate.isMe ? "border-primary/40 bg-primary/5" : ""
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    mate.rank === 1
                      ? "bg-yellow-100 text-yellow-700"
                      : mate.rank === 2
                      ? "bg-gray-100 text-gray-600"
                      : mate.rank === 3
                      ? "bg-orange-100 text-orange-700"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {mate.rank}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {mate.fullName}
                    {mate.isMe ? " · kamu" : ""}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-mono">{mate.memberNumber}</p>
                </div>
                <span className="text-sm font-bold text-primary shrink-0">{mate.loanCount}</span>
              </div>
            ))}
          </div>
        ) : extra && extra.classmates.length > 0 ? (
          <div className="space-y-2">
            {extra.classmates.map((mate) => (
              <div key={mate.id} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    mate.rank === 1
                      ? "bg-yellow-100 text-yellow-700"
                      : mate.rank === 2
                      ? "bg-gray-100 text-gray-600"
                      : mate.rank === 3
                      ? "bg-orange-100 text-orange-700"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {mate.rank}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{mate.fullName}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{mate.memberNumber}</p>
                </div>
                <span className="text-sm font-bold text-primary shrink-0">{mate.loanCount}</span>
              </div>
            ))}
          </div>
        ) : (
          <RoleEmptyState context="no-classmates" userRole="STUDENT" compact className="border-dashed" />
        )}
      </Card>
    </div>
  );
}
