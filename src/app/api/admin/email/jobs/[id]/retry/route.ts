import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/server/auth";
import { getEmailJobById, updateEmailJobStatus } from "@/lib/server/db";
import { processEmailOutboxBatch } from "@/lib/server/email/emailService";
import { recordAuditLog } from "@/lib/server/adminAudit";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/email/jobs/[id]/retry
 * Resets a failed or dead-lettered job to 'queued' and triggers immediate delivery.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission(req, "settings:manage");
    const { id } = await context.params;

    const job = await getEmailJobById(id);
    if (!job) {
      return NextResponse.json({ error: "Không tìm thấy tác vụ email này." }, { status: 404 });
    }

    await updateEmailJobStatus(id, {
      status: "queued",
      retry_count: 0,
      next_retry_at: null,
      last_error: null,
    });

    // Execute immediate outbox worker batch
    await processEmailOutboxBatch(1);

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    await recordAuditLog({
      actorId: session.user.uid,
      actorEmail: session.user.email || "unknown",
      actorRole: session.user.role || "student",
      action: "email.retry_job",
      targetType: "email_job",
      targetId: id,
      reason: `Thử lại tác vụ gửi email tới ${job.recipient}`,
      beforeState: { status: job.status, retryCount: job.retry_count },
      afterState: { status: "queued", retryCount: 0 },
      ipAddress: clientIp,
    });

    const updated = await getEmailJobById(id);
    return NextResponse.json({ success: true, job: updated });
  } catch (error: unknown) {
    console.error("[API /api/admin/email/jobs/[id]/retry] Error:", error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.status || 500;
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to retry email job",
      },
      { status }
    );
  }
}
