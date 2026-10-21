import { NextRequest, NextResponse } from "next/server";
import { getReportsList, createReport } from "@/lib/server/db";
import { requireActiveUser } from "@/lib/server/auth";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const reports = await getReportsList();
    return NextResponse.json(reports, { status: 200 });
  } catch (error) {
    console.error("[API GET /api/reports] Error:", error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    let session;
    try {
      session = await requireActiveUser(req);
    } catch (authErr: any) {
      return NextResponse.json(
        { error: authErr.code || "unauthorized", message: authErr.message },
        { status: authErr.status || 403 }
      );
    }

    const body = await req.json();

    const id = `rep-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;

    await createReport({
      id,
      reviewId: body.reviewId,
      professorId: body.professorId,
      professorName: body.professorName,
      reviewCommentSnippet: body.reviewCommentSnippet,
      reportedByUserId: session.user.uid,
      reason: body.reason || "Khác",
      details: body.details,
    });

    // Notify admin of incoming abuse report asynchronously
    const { queueEmail } = await import("@/lib/server/email/emailService");
    queueEmail({
      recipient: "admin@rateurprofs.site",
      templateId: "admin_alert",
      templateVars: {
        title: `Báo cáo đánh giá giảng viên: ${body.professorName || body.professorId || "N/A"}`,
        priority: "MEDIUM",
        message: `Người dùng đã báo cáo đánh giá với lý do: "${body.reason || "Khác"}". Chi tiết: ${body.details || "Không có"}`,
        metadata: {
          reportId: id,
          reviewId: body.reviewId,
          professorId: body.professorId,
          snippet: body.reviewCommentSnippet,
        },
      },
    }).catch((err) => console.warn("[API /api/reports] Admin email alert notice:", err));

    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (error) {
    console.error("[API POST /api/reports] Error:", error);
    return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
  }
}
