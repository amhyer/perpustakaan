/**
 * Predictive Analytics — Forecast perpustakaan growth.
 *
 * Konsep:
 * 1. Linear regression sederhana untuk forecast:
 *    - Total loans per minggu
 *    - Poin beredar
 *    - Active members
 *    - New members per bulan
 * 2. Anomaly detection:
 *    - Lonjakan pinjam di luar kebiasaan → notifikasi
 *    - Buku yang diprediksi akan habis → alert restock
 * 3. Trend analysis:
 *    - Genre paling naik daun
 *    - Waktu peak (hari, jam)
 * 4. Forecasting accuracy:
 *    - Confidence interval
 *    - Mean absolute error
 *
 * Untuk advanced: pakai Prophet (Facebook) atau LSTM model.
 * Untuk single-instance SQLite: simple moving average + linear regression.
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// =========================================================================
// TYPES
// =========================================================================

export interface ForecastPoint {
  date: string;
  value: number;
  predicted: number;
  lower: number; // Lower bound CI
  upper: number; // Upper bound CI
}

export interface ForecastResult {
  metric: string;
  unit: string;
  historical: { date: string; value: number }[];
  forecast: ForecastPoint[];
  trend: "UP" | "DOWN" | "STABLE";
  growthRate: number; // % per period
  confidence: number; // 0-1
}

export interface AnomalyAlert {
  type: "SPIKE" | "DROP" | "TREND_CHANGE";
  metric: string;
  currentValue: number;
  expectedValue: number;
  deviation: number; // standard deviations
  severity: "LOW" | "MEDIUM" | "HIGH";
  date: string;
  message: string;
}

export interface StockPrediction {
  bookId: string;
  bookTitle: string;
  currentStock: number;
  averageMonthlyLoan: number;
  monthsUntilOut: number; // float, null kalau gak cukup data
  risk: "HIGH" | "MEDIUM" | "LOW";
  recommendation: string;
}

// =========================================================================
// LINEAR REGRESSION
// =========================================================================

interface RegressionData {
  slope: number;
  intercept: number;
  r2: number; // 0-1, quality of fit
}

/**
 * Simple linear regression: y = mx + b
 * Returns slope, intercept, dan R².
 */
function linearRegression(points: { x: number; y: number }[]): RegressionData {
  if (points.length < 2) {
    return { slope: 0, intercept: points[0]?.y || 0, r2: 0 };
  }

  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);
  const sumYY = points.reduce((s, p) => s + p.y * p.y, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // R² calculation
  const meanY = sumY / n;
  const ssTot = points.reduce((s, p) => s + Math.pow(p.y - meanY, 2), 0);
  const ssRes = points.reduce(
    (s, p) => s + Math.pow(p.y - (slope * p.x + intercept), 2),
    0
  );
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return { slope, intercept, r2: Math.max(0, Math.min(1, r2)) };
}

/**
 * Calculate standard deviation of residuals.
 */
function stdResiduals(points: { x: number; y: number }[], reg: RegressionData): number {
  if (points.length < 2) return 0;
  const squaredResiduals = points.map(
    (p) => Math.pow(p.y - (reg.slope * p.x + reg.intercept), 2)
  );
  return Math.sqrt(
    squaredResiduals.reduce((s, r) => s + r, 0) / (points.length - 1)
  );
}

// =========================================================================
// FORECAST LOANS
// =========================================================================

/**
 * Forecast total loans per minggu untuk N minggu ke depan.
 */
export async function forecastLoans(weeksAhead = 4): Promise<ForecastResult> {
  // Ambil data historical (12 minggu terakhir)
  const since = new Date(Date.now() - 12 * 7 * 86400000);
  const loans = await db.loan.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
  });

  // Group by week
  const weeklyData = new Map<string, number>();
  for (const loan of loans) {
    const weekStart = getWeekStart(loan.createdAt);
    const key = weekStart.toISOString().split("T")[0];
    weeklyData.set(key, (weeklyData.get(key) || 0) + 1);
  }

  // Sort by date
  const historical = Array.from(weeklyData.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({ date, value }));

  // Linear regression
  const points = historical.map((h, i) => ({ x: i, y: h.value }));
  const reg = linearRegression(points);
  const std = stdResiduals(points, reg);

  // Forecast future weeks
  const forecast: ForecastPoint[] = [];
  for (let i = 1; i <= weeksAhead; i++) {
    const x = historical.length + i - 1;
    const predicted = Math.max(0, Math.round(reg.slope * x + reg.intercept));
    const lastDate = new Date(
      new Date(historical[historical.length - 1]?.date || new Date()).getTime() +
        i * 7 * 86400000
    );
    forecast.push({
      date: lastDate.toISOString().split("T")[0],
      value: 0, // Unknown future
      predicted,
      lower: Math.max(0, Math.round(predicted - 1.96 * std)),
      upper: Math.round(predicted + 1.96 * std),
    });
  }

  // Trend direction
  const lastWeek = historical[historical.length - 1]?.value || 0;
  const firstWeek = historical[0]?.value || 0;
  const growthRate =
    firstWeek > 0 ? ((lastWeek - firstWeek) / firstWeek) * 100 : 0;
  const trend: "UP" | "DOWN" | "STABLE" =
    growthRate > 5 ? "UP" : growthRate < -5 ? "DOWN" : "STABLE";

  return {
    metric: "loans_per_week",
    unit: "loans",
    historical,
    forecast,
    trend,
    growthRate: Number(growthRate.toFixed(1)),
    confidence: reg.r2,
  };
}

// =========================================================================
// FORECAST ACTIVE MEMBERS
// =========================================================================

export async function forecastActiveMembers(monthsAhead = 3): Promise<ForecastResult> {
  // Get active members per month (yang ada transaksi di bulan tersebut)
  const since = new Date();
  since.setMonth(since.getMonth() - 6);

  const txns = await db.pointTransaction.findMany({
    where: { createdAt: { gte: since } },
    select: { memberId: true, createdAt: true },
  });

  const monthlyData = new Map<string, Set<string>>();
  for (const txn of txns) {
    const monthKey = `${txn.createdAt.getFullYear()}-${String(txn.createdAt.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyData.has(monthKey)) monthlyData.set(monthKey, new Set());
    monthlyData.get(monthKey)!.add(txn.memberId);
  }

  const historical = Array.from(monthlyData.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, members]) => ({ date, value: members.size }));

  // Linear regression
  const points = historical.map((h, i) => ({ x: i, y: h.value }));
  const reg = linearRegression(points);
  const std = stdResiduals(points, reg);

  const forecast: ForecastPoint[] = [];
  for (let i = 1; i <= monthsAhead; i++) {
    const x = historical.length + i - 1;
    const predicted = Math.max(0, Math.round(reg.slope * x + reg.intercept));
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + i);
    const dateKey = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, "0")}`;

    forecast.push({
      date: dateKey,
      value: 0,
      predicted,
      lower: Math.max(0, Math.round(predicted - 1.96 * std)),
      upper: Math.round(predicted + 1.96 * std),
    });
  }

  const trend: "UP" | "DOWN" | "STABLE" =
    reg.slope > 0.5 ? "UP" : reg.slope < -0.5 ? "DOWN" : "STABLE";

  return {
    metric: "active_members_per_month",
    unit: "members",
    historical,
    forecast,
    trend,
    growthRate: Number((reg.slope * 100 / Math.max(1, reg.intercept)).toFixed(1)),
    confidence: reg.r2,
  };
}

// =========================================================================
// ANOMALY DETECTION
// =========================================================================

/**
 * Detect anomali dalam metrics (spike, drop, trend change).
 */
export async function detectAnomalies(
  metric: "loans" | "members" | "points" = "loans"
): Promise<AnomalyAlert[]> {
  const alerts: AnomalyAlert[] = [];

  if (metric === "loans") {
    const last30 = await db.loan.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
      select: { createdAt: true },
    });

    // Group by day
    const daily = new Map<string, number>();
    for (const l of last30) {
      const key = l.createdAt.toISOString().split("T")[0];
      daily.set(key, (daily.get(key) || 0) + 1);
    }
    const sortedDays = Array.from(daily.entries()).sort();

    // Calculate mean & std (exclude today & yesterday)
    const values = sortedDays.slice(0, -2).map(([, v]) => v);
    if (values.length < 7) return alerts; // Need at least 1 week of data
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const std = Math.sqrt(
      values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
    );

    // Check yesterday
    const yesterday = sortedDays[sortedDays.length - 2];
    if (yesterday) {
      const [date, value] = yesterday;
      const deviation = std > 0 ? (value - mean) / std : 0;
      if (deviation > 2) {
        alerts.push({
          type: "SPIKE",
          metric: "loans",
          currentValue: value,
          expectedValue: Math.round(mean),
          deviation,
          severity: deviation > 3 ? "HIGH" : deviation > 2.5 ? "MEDIUM" : "LOW",
          date,
          message: `Lonjakan ${Math.round((value / Math.max(1, mean) - 1) * 100)}% pinjaman di ${date}`,
        });
      } else if (deviation < -2) {
        alerts.push({
          type: "DROP",
          metric: "loans",
          currentValue: value,
          expectedValue: Math.round(mean),
          deviation,
          severity: Math.abs(deviation) > 3 ? "HIGH" : Math.abs(deviation) > 2.5 ? "MEDIUM" : "LOW",
          date,
          message: `Penurunan ${Math.round((1 - value / Math.max(1, mean)) * 100)}% pinjaman di ${date}`,
        });
      }
    }
  }

  return alerts;
}

// =========================================================================
// STOCK PREDICTION
// =========================================================================

/**
 * Prediksi berapa bulan lagi stok buku akan habis.
 */
export async function predictStockOut(): Promise<StockPrediction[]> {
  // Get semua buku dengan stock tracking
  const books = await db.book.findMany({
    where: { items: { some: {} } },
    include: {
      items: { select: { status: true } },
    },
    take: 200,
  });

  // Get loan history (3 bulan terakhir)
  const since = new Date(Date.now() - 90 * 86400000);
  const loans = await db.loan.findMany({
    where: { createdAt: { gte: since } },
    select: { bookId: true },
  });

  // Group by book
  const loansByBook = new Map<string, number>();
  for (const l of loans) {
    loansByBook.set(l.bookId, (loansByBook.get(l.bookId) || 0) + 1);
  }

  const predictions: StockPrediction[] = [];

  for (const book of books) {
    // Hitung stok tersedia saat ini
    const availableItems = book.items.filter((i) => i.status === "AVAILABLE").length;
    const totalItems = book.items.length;
    if (availableItems === 0) continue;

    // Loan rate (per bulan, 3 bulan terakhir)
    const totalLoans = loansByBook.get(book.id) || 0;
    const monthlyRate = totalLoans / 3; // 3 months

    if (monthlyRate < 0.5) continue; // Too few loans, skip

    // Months until out
    const monthsUntilOut = availableItems / monthlyRate;

    let risk: "HIGH" | "MEDIUM" | "LOW" = "LOW";
    if (monthsUntilOut < 1) risk = "HIGH";
    else if (monthsUntilOut < 3) risk = "MEDIUM";

    let recommendation = "Stok cukup untuk beberapa bulan ke depan";
    if (risk === "HIGH") {
      recommendation = `🚨 Restock segera! Buku akan habis dalam ${monthsUntilOut.toFixed(1)} bulan.`;
    } else if (risk === "MEDIUM") {
      recommendation = `⚠️ Rencanakan restock dalam 1-2 bulan.`;
    }

    predictions.push({
      bookId: book.id,
      bookTitle: book.title,
      currentStock: availableItems,
      averageMonthlyLoan: Math.round(monthlyRate * 10) / 10,
      monthsUntilOut: Math.round(monthsUntilOut * 10) / 10,
      risk,
      recommendation,
    });
  }

  // Sort by risk (HIGH first)
  predictions.sort((a, b) => {
    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return order[a.risk] - order[b.risk];
  });

  return predictions.slice(0, 20); // Top 20
}

// =========================================================================
// GENRE TRENDS
// =========================================================================

/**
 * Genre paling trending 3 bulan terakhir vs 3 bulan sebelumnya.
 */
export async function getGenreTrends(): Promise<
  Array<{ category: string; current: number; previous: number; change: number; trend: "UP" | "DOWN" | "STABLE" }>
> {
  const now = new Date();
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(now.getMonth() - 3);
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(now.getMonth() - 6);

  const currentLoans = await db.loan.findMany({
    where: { createdAt: { gte: threeMonthsAgo } },
    include: { bookItem: { include: { book: { include: { category: true } } } } },
  });

  const previousLoans = await db.loan.findMany({
    where: { createdAt: { gte: sixMonthsAgo, lt: threeMonthsAgo } },
    include: { bookItem: { include: { book: { include: { category: true } } } } },
  });

  // Group by category
  const current = new Map<string, number>();
  const previous = new Map<string, number>();

  for (const l of currentLoans) {
    const cat = l.bookItem.book.category?.name || "Lainnya";
    current.set(cat, (current.get(cat) || 0) + 1);
  }
  for (const l of previousLoans) {
    const cat = l.bookItem.book.category?.name || "Lainnya";
    previous.set(cat, (previous.get(cat) || 0) + 1);
  }

  const allCategories = new Set([...current.keys(), ...previous.keys()]);
  const trends = Array.from(allCategories).map((cat) => {
    const cur = current.get(cat) || 0;
    const prev = previous.get(cat) || 0;
    const change = prev > 0 ? ((cur - prev) / prev) * 100 : 0;
    return {
      category: cat,
      current: cur,
      previous: prev,
      change: Number(change.toFixed(1)),
      trend: (change > 10 ? "UP" : change < -10 ? "DOWN" : "STABLE") as "UP" | "DOWN" | "STABLE",
    };
  });

  return trends.sort((a, b) => b.change - a.change);
}

// =========================================================================
// HELPERS
// =========================================================================

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

/**
 * Master predict function — panggil semua analytics.
 */
export async function getPredictiveDashboard() {
  const [loans, members, anomalies, stockOut, genreTrends] = await Promise.all([
    forecastLoans(4),
    forecastActiveMembers(3),
    detectAnomalies("loans"),
    predictStockOut(),
    getGenreTrends(),
  ]);

  logger.info("Predictive dashboard generated");

  return {
    loans,
    members,
    anomalies,
    stockOut,
    genreTrends,
    generatedAt: new Date().toISOString(),
  };
}
