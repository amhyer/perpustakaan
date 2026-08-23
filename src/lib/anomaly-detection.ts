/**
 * Anomaly Detection — Detect suspicious activities.
 *
 * Sprint Q - Tier 3 #11: Security Hardening.
 *
 * Features:
 * - Failed login tracking (rate-based)
 * - Impossible travel detection (login from 2 distant locations in short time)
 * - Unusual activity time (login at 3 AM when user normally logs in at 8 AM)
 * - Bulk operations (unusual number of loans in 1 hour)
 * - Privilege escalation attempts
 * - Multiple sessions from different IPs
 * - Data exfiltration patterns (large downloads, bulk exports)
 *
 * Pure logic library. Pairs with audit log.
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// ===== Types =====

export type AnomalyType =
  | "FAILED_LOGIN_BURST"
  | "IMPOSSIBLE_TRAVEL"
  | "UNUSUAL_LOGIN_TIME"
  | "BULK_OPERATIONS"
  | "PRIVILEGE_ESCALATION"
  | "MULTIPLE_SESSIONS"
  | "DATA_EXFILTRATION"
  | "UNUSUAL_DEVICE"
  | "GEO_ANOMALY";

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface Anomaly {
  type: AnomalyType;
  severity: Severity;
  userId: string;
  description: string;
  evidence: Record<string, any>;
  detectedAt: Date;
  action?: string; // "blocked", "alerted", "notified"
}

export interface SecurityScore {
  score: number; // 0-100
  riskLevel: "low" | "medium" | "high" | "critical";
  factors: Array<{
    label: string;
    impact: number; // -100 to 0
    reason: string;
  }>;
}

const SEVERITY_WEIGHT: Record<Severity, number> = {
  LOW: 5,
  MEDIUM: 15,
  HIGH: 35,
  CRITICAL: 75,
};

// ===== Failed Login Detection =====

/**
 * Check for failed login burst.
 * Returns anomaly if >5 failed attempts in last 15 minutes.
 */
export async function detectFailedLoginBurst(
  emailOrUserId: string,
  isUserId: boolean = false
): Promise<Anomaly | null> {
  const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);

  const count = await db.loginAttempt.count({
    where: {
      [isUserId ? "userId" : "email"]: emailOrUserId,
      success: false,
      createdAt: { gte: fifteenMinAgo },
    },
  });

  if (count >= 5) {
    return {
      type: "FAILED_LOGIN_BURST",
      severity: count >= 10 ? "CRITICAL" : count >= 7 ? "HIGH" : "MEDIUM",
      userId: isUserId ? emailOrUserId : "",
      description: `${count} failed login attempts in 15 minutes`,
      evidence: { count, windowMinutes: 15 },
      detectedAt: new Date(),
      action: count >= 10 ? "blocked" : "alerted",
    };
  }

  return null;
}

// ===== Impossible Travel Detection =====

/**
 * Detect impossible travel between two login locations.
 * Returns anomaly if distance/time ratio is unreasonable (>1000km in <1h).
 */
export async function detectImpossibleTravel(
  userId: string,
  currentLocation: { lat: number; lon: number; city?: string; country?: string },
  currentTime: Date = new Date()
): Promise<Anomaly | null> {
  // Get last login location
  const lastLogin = await db.loginAttempt.findFirst({
    where: { userId, success: true },
    orderBy: { createdAt: "desc" },
  });

  if (!lastLogin?.location) return null;

  const lastLoc = lastLogin.location as any;
  if (typeof lastLoc.lat !== "number" || typeof lastLoc.lon !== "number") {
    return null;
  }

  const distance = haversineDistance(
    lastLoc.lat,
    lastLoc.lon,
    currentLocation.lat,
    currentLocation.lon
  );
  const timeDiffHours = (currentTime.getTime() - lastLogin.createdAt.getTime()) / (1000 * 60 * 60);

  // Speed in km/h
  const requiredSpeed = timeDiffHours > 0 ? distance / timeDiffHours : Infinity;

  // > 1000 km/h is impossible (faster than commercial flight)
  if (requiredSpeed > 1000 && distance > 500) {
    return {
      type: "IMPOSSIBLE_TRAVEL",
      severity: requiredSpeed > 5000 ? "CRITICAL" : "HIGH",
      userId,
      description: `Login from ${Math.round(distance)}km away in ${timeDiffHours.toFixed(1)}h (${Math.round(requiredSpeed)}km/h)`,
      evidence: {
        distance: Math.round(distance),
        timeDiffHours: Number(timeDiffHours.toFixed(2)),
        requiredSpeed: Math.round(requiredSpeed),
        from: lastLoc,
        to: currentLocation,
      },
      detectedAt: new Date(),
      action: "alerted",
    };
  }

  return null;
}

/**
 * Haversine distance between two coordinates (in km).
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// ===== Unusual Login Time Detection =====

/**
 * Check if login time is unusual for this user.
 * Returns anomaly if login is at unusual hour (based on history).
 */
export async function detectUnusualLoginTime(
  userId: string,
  loginTime: Date = new Date()
): Promise<Anomaly | null> {
  // Get login history (last 90 days)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const history = await db.loginAttempt.findMany({
    where: {
      userId,
      success: true,
      createdAt: { gte: ninetyDaysAgo },
    },
    select: { createdAt: true },
  });

  if (history.length < 5) return null; // Not enough data

  // Build hour distribution
  const hourCounts = new Array(24).fill(0);
  history.forEach((h) => {
    hourCounts[h.createdAt.getHours()]++;
  });

  const totalLogins = history.length;
  const loginHour = loginTime.getHours();
  const hourCount = hourCounts[loginHour];
  const hourFreq = hourCount / totalLogins;

  // If this hour is rare (< 5% of logins) and user has many logins elsewhere
  if (hourFreq < 0.05 && totalLogins > 10) {
    return {
      type: "UNUSUAL_LOGIN_TIME",
      severity: hourFreq < 0.01 ? "MEDIUM" : "LOW",
      userId,
      description: `Login at unusual hour: ${loginHour}:00 (only ${(hourFreq * 100).toFixed(1)}% of past logins)`,
      evidence: {
        hour: loginHour,
        hourCount,
        totalLogins,
        frequency: Number(hourFreq.toFixed(3)),
      },
      detectedAt: new Date(),
    };
  }

  return null;
}

// ===== Bulk Operations Detection =====

/**
 * Detect unusual bulk operations (e.g., many loans in short time).
 */
export async function detectBulkOperations(
  userId: string,
  options: { operationType?: string; threshold?: number; windowMinutes?: number } = {}
): Promise<Anomaly | null> {
  const { threshold = 20, windowMinutes = 60 } = options;
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);

  const count = await db.auditLog.count({
    where: {
      userId,
      createdAt: { gte: since },
      ...(options.operationType ? { action: options.operationType } : {}),
    },
  });

  if (count >= threshold) {
    return {
      type: "BULK_OPERATIONS",
      severity: count >= threshold * 2 ? "HIGH" : "MEDIUM",
      userId,
      description: `${count} operations in last ${windowMinutes} minutes (threshold: ${threshold})`,
      evidence: { count, windowMinutes, threshold },
      detectedAt: new Date(),
      action: "alerted",
    };
  }

  return null;
}

// ===== Privilege Escalation Detection =====

/**
 * Detect attempts to access resources beyond user's role.
 */
export async function detectPrivilegeEscalation(
  userId: string,
  attemptedAction: string,
  userRole: string
): Promise<Anomaly | null> {
  // Privileged actions that should be flagged if attempted by non-librarian
  const privilegedActions = [
    "DELETE_BOOK",
    "DELETE_MEMBER",
    "BACKUP_RESTORE",
    "SETTINGS_CHANGE",
    "USER_CREATE",
    "ROLE_CHANGE",
    "BULK_OPERATION",
  ];

  if (
    privilegedActions.includes(attemptedAction) &&
    !["LIBRARIAN", "PUSTAKAWAN_JUNIOR", "HEADMASTER"].includes(userRole)
  ) {
    return {
      type: "PRIVILEGE_ESCALATION",
      severity: "CRITICAL",
      userId,
      description: `Non-privileged user (${userRole}) attempted privileged action: ${attemptedAction}`,
      evidence: { attemptedAction, userRole },
      detectedAt: new Date(),
      action: "blocked",
    };
  }

  return null;
}

// ===== Data Exfiltration Detection =====

/**
 * Detect suspicious data export activity.
 */
export async function detectDataExfiltration(userId: string): Promise<Anomaly | null> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  // Count export operations
  const exports = await db.auditLog.count({
    where: {
      userId,
      action: { in: ["EXPORT_DATA", "DOWNLOAD", "BULK_EXPORT"] },
      createdAt: { gte: oneHourAgo },
    },
  });

  if (exports >= 5) {
    return {
      type: "DATA_EXFILTRATION",
      severity: exports >= 10 ? "CRITICAL" : "HIGH",
      userId,
      description: `${exports} data export operations in last hour`,
      evidence: { exportCount: exports, windowHours: 1 },
      detectedAt: new Date(),
      action: "alerted",
    };
  }

  return null;
}

// ===== Security Score =====

/**
 * Calculate security score for a user.
 * Lower score = more risky.
 */
export async function calculateSecurityScore(userId: string): Promise<SecurityScore> {
  const factors: SecurityScore["factors"] = [];
  let totalDeduction = 0;

  // Factor 1: 2FA enabled
  const has2FA = await db.twoFactorAuth.findUnique({ where: { userId } });
  if (has2FA?.enabled) {
    factors.push({ label: "2FA aktif", impact: 0, reason: "Akun dilindungi 2FA" });
  } else {
    factors.push({ label: "2FA tidak aktif", impact: -20, reason: "Risiko tinggi" });
    totalDeduction += 20;
  }

  // Factor 2: Recent failed logins
  const recentFailures = await db.loginAttempt.count({
    where: {
      userId,
      success: false,
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
  });
  if (recentFailures > 0) {
    const impact = Math.min(-15, -recentFailures);
    factors.push({
      label: `${recentFailures} failed login (7 hari)`,
      impact,
      reason: "Aktivitas gagal mencurigakan",
    });
    totalDeduction += Math.abs(impact);
  } else {
    factors.push({ label: "Tidak ada failed login", impact: 0, reason: "Bersih" });
  }

  // Factor 3: Active sessions
  const activeSessions = await db.session.count({
    where: { userId, expiresAt: { gt: new Date() } },
  });
  if (activeSessions > 3) {
    factors.push({
      label: `${activeSessions} sesi aktif`,
      impact: -10,
      reason: "Banyak sesi bersamaan",
    });
    totalDeduction += 10;
  } else {
    factors.push({
      label: `${activeSessions} sesi aktif`,
      impact: 0,
      reason: "Normal",
    });
  }

  // Factor 4: Last login recency
  const lastLogin = await db.loginAttempt.findFirst({
    where: { userId, success: true },
    orderBy: { createdAt: "desc" },
  });
  if (lastLogin) {
    const daysSince = (Date.now() - lastLogin.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 30) {
      factors.push({ label: "Login rutin", impact: 0, reason: `${Math.round(daysSince)} hari lalu` });
    } else {
      factors.push({ label: "Tidak aktif lama", impact: -5, reason: `${Math.round(daysSince)} hari` });
      totalDeduction += 5;
    }
  }

  const score = Math.max(0, 100 - totalDeduction);
  const riskLevel: SecurityScore["riskLevel"] =
    score >= 80 ? "low" :
    score >= 60 ? "medium" :
    score >= 30 ? "high" : "critical";

  return { score, riskLevel, factors };
}

// ===== Combined Detection =====

/**
 * Run all anomaly checks for a login event.
 * Returns all detected anomalies.
 */
export async function runLoginAnomalyChecks(
  userId: string,
  context: {
    email?: string;
    location?: { lat: number; lon: number; city?: string; country?: string };
    ip?: string;
    userAgent?: string;
  }
): Promise<Anomaly[]> {
  const anomalies: Anomaly[] = [];

  if (context.email) {
    const burst = await detectFailedLoginBurst(context.email, false);
    if (burst) anomalies.push(burst);
  }

  if (context.location) {
    const travel = await detectImpossibleTravel(userId, context.location);
    if (travel) anomalies.push(travel);
  }

  const unusualTime = await detectUnusualLoginTime(userId);
  if (unusualTime) anomalies.push(unusualTime);

  return anomalies;
}

/**
 * Log anomaly to audit log for visibility.
 */
export async function logAnomaly(anomaly: Anomaly): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId: anomaly.userId || null,
        action: "ANOMALY_DETECTED",
        resource: anomaly.type,
        resourceId: null,
        changes: {
          severity: anomaly.severity,
          description: anomaly.description,
          evidence: anomaly.evidence,
          action: anomaly.action,
        },
        ipAddress: null,
        createdAt: anomaly.detectedAt,
      },
    });
  } catch (err) {
    logger.warn("Failed to log anomaly", { error: String(err) });
  }
}
