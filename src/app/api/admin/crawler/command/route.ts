import { NextRequest, NextResponse } from "next/server";
import { NlpCommandHandler } from "@/lib/server/crawler/nlpCommandHandler";
import { requireAdminSession } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await requireAdminSession(req);

    const body = await req.json();
    const { command } = body;

    const result = await NlpCommandHandler.executeCommand(command);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("[API /api/admin/crawler/command POST] Error:", error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.status || 500;
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        understood: false,
        intent: "unknown",
        feedbackMessage: message,
      },
      { status }
    );
  }
}
