import { NextRequest, NextResponse } from "next/server";
import { CrawlerWorker } from "@/lib/server/crawler/worker";
import { requireAdminSession } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await requireAdminSession(req);
    let batchSize = 5;
    try {
      const body = await req.json();
      if (body?.batchSize && typeof body.batchSize === "number") {
        batchSize = Math.min(20, Math.max(1, body.batchSize));
      }
    } catch {
      // Body may be empty
    }

    const result = await CrawlerWorker.tick(batchSize);
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    console.error("[API /api/admin/crawler/worker/tick POST] Error:", error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.status || 500;
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status }
    );
  }
}
