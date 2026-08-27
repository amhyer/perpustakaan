import { db } from "@/lib/db";
import { AUDIT_ACTIONS, type AuditAction } from "@/lib/audit-actions";

export { AUDIT_ACTIONS, type AuditAction };

export async function logAudit(
  userId: string,
  action: AuditAction,
  entityType: string,
  entityId?: string,
  detail?: string
) {
  try {
    await db.auditLog.create({
      data: { userId, action, entityType, entityId: entityId ?? null, detail: detail ?? null },
    });
  } catch {
    // Silently fail — audit logging should never block the main operation
  }
}
