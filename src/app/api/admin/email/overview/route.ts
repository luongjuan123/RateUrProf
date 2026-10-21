import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/server/auth";
import { getEmailOutboxStats } from "@/lib/server/db";
import { getActiveEmailProvider, auditDomainDns } from "@/lib/server/email/emailProvider";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/email/overview
 * Returns provider status, deliverability metrics, and live DNS verification report.
 */
export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "settings:read");

    const provider = getActiveEmailProvider();
    const [configStatus, outboxStats, dnsReport] = await Promise.all([
      provider.verifyConfiguration(),
      getEmailOutboxStats(),
      auditDomainDns("rateurprofs.site"),
    ]);

    return NextResponse.json({
      success: true,
      provider: configStatus,
      stats: outboxStats,
      dns: dnsReport,
      timestamp: Date.now(),
    });
  } catch (error: unknown) {
    console.error("[API /api/admin/email/overview] Error:", error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.status || 500;
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load email overview",
      },
      { status }
    );
  }
}
