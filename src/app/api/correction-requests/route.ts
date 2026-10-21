import { NextRequest, NextResponse } from "next/server";
import { getCorrectionRequestsList, createCorrectionRequest } from "@/lib/server/db";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const list = await getCorrectionRequestsList();
    return NextResponse.json(list, { status: 200 });
  } catch (error) {
    console.error("[API GET /api/correction-requests] Error:", error);
    return NextResponse.json({ error: "Failed to fetch correction requests" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = `req-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;

    const targetEmail = body.contactEmail || body.requesterEmail;
    await createCorrectionRequest({
      id,
      professorId: body.professorId || "",
      professorName: body.professorName || "",
      requesterEmail: targetEmail,
      requesterRelation: body.requestType || body.requesterRelation,
      details: body.notes || body.details,
    });

    if (targetEmail && targetEmail.includes("@")) {
      const { queueEmail } = await import("@/lib/server/email/emailService");
      queueEmail({
        recipient: targetEmail,
        templateId: "correction_update",
        templateVars: {
          professorName: body.professorName || "Giảng viên",
          requestId: id,
          details: body.notes || body.details,
          status: "received",
        },
      }).catch((err) => console.warn("[API /api/correction-requests] Confirmation email notice:", err));
    }

    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (error) {
    console.error("[API POST /api/correction-requests] Error:", error);
    return NextResponse.json({ error: "Failed to submit correction request" }, { status: 500 });
  }
}
