import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/server/auth";
import { processEmailOutboxBatch } from "@/lib/server/email/emailService";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/email/worker/tick
 * Triggers batch processing of queued outbox emails.
 * Authorized by admin session or EMAIL_CRON_SECRET bearer token.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.EMAIL_CRON_SECRET;
    const isCronAuthorized =
      cronSecret &&
      authHeader?.startsWith("Bearer ") &&
      authHeader.substring(7) === cronSecret;

    if (!isCronAuthorized) {
      // Must be authenticated admin with settings:manage permission
      await requirePermission(req, "settings:manage");
    }

    const { searchParams } = new URL(req.url);
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 10;

    const stats = await processEmailOutboxBatch(Math.min(50, Math.max(1, limit)));

    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
      ...stats,
    });
  } catch (error: unknown) {
    console.error("[API /api/admin/email/worker/tick] Error:", error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.status || 500;
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Outbox worker tick failed",
      },
      { status }
    );
  }
}
