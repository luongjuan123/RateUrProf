import { NextRequest, NextResponse } from "next/server";
import { authenticateSessionToken, SESSION_COOKIE_NAME } from "@/lib/server/auth";
import {
  createAccountAppeal,
  getAccountAppealByUserId,
} from "@/lib/server/db";
import { queueEmail } from "@/lib/server/email/emailService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const cookieToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const authHeader = req.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : null;

    const token = cookieToken || bearerToken;
    if (!token) {
      return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });
    }

    const session = await authenticateSessionToken(token);
    if (!session) {
      return NextResponse.json({ error: "Phiên làm việc hết hạn." }, { status: 401 });
    }

    const appeal = await getAccountAppealByUserId(session.user.uid);
    return NextResponse.json({ appeal }, { status: 200 });
  } catch (error) {
    console.error("[API GET /api/account/appeal] Error:", error);
    return NextResponse.json({ error: "Không thể lấy thông tin kháng nghị." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const authHeader = req.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : null;

    const token = cookieToken || bearerToken;
    if (!token) {
      return NextResponse.json({ error: "Vui lòng đăng nhập để gửi kháng nghị." }, { status: 401 });
    }

    const session = await authenticateSessionToken(token);
    if (!session) {
      return NextResponse.json({ error: "Phiên làm việc hết hạn. Vui lòng đăng nhập lại." }, { status: 401 });
    }

    // Check if an existing open appeal already exists
    const existingAppeal = await getAccountAppealByUserId(session.user.uid);
    if (existingAppeal && (existingAppeal.status === "submitted" || existingAppeal.status === "under_review")) {
      return NextResponse.json(
        {
          error: "Bạn đã có đơn kháng nghị đang được xử lý. Vui lòng chờ phản hồi từ Ban Quản trị.",
          appeal: existingAppeal,
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const category = typeof body.category === "string" && body.category.trim() ? body.category.trim() : "Khác";
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    const supportingInfo = typeof body.supportingInfo === "string" ? body.supportingInfo.trim() : null;

    if (!reason || reason.length < 10) {
      return NextResponse.json(
        { error: "Nội dung giải trình kháng nghị phải có tối thiểu 10 ký tự." },
        { status: 400 }
      );
    }

    const appeal = await createAccountAppeal({
      userId: session.user.uid,
      userEmail: session.user.email || "no-reply@rateurprofs.site",
      userDisplayName: session.profile.displayName || session.user.displayName,
      category,
      reason,
      supportingInfo,
    });

    // Send confirmation email to user
    if (session.user.email) {
      queueEmail({
        recipient: session.user.email,
        templateId: "appeal_submitted",
        templateVars: {
          appealId: appeal.id,
          category: appeal.category,
          reason: appeal.reason,
        },
      }).catch((err) => console.warn("[API /api/account/appeal] User email dispatch notice:", err));
    }

    // Send high-priority alert to moderation team
    queueEmail({
      recipient: "admin@rateurprofs.site",
      templateId: "admin_alert",
      templateVars: {
        title: `Đơn kháng nghị tài khoản mới: [${appeal.id}]`,
        priority: "HIGH",
        message: `Người dùng ${session.user.email} (${session.user.uid}) vừa gửi đơn kháng nghị cho tài khoản bị khóa. Danh mục: ${appeal.category}. Lý do: "${appeal.reason}"`,
        metadata: {
          appealId: appeal.id,
          userId: session.user.uid,
          userEmail: session.user.email,
        },
      },
    }).catch((err) => console.warn("[API /api/account/appeal] Admin email alert notice:", err));

    return NextResponse.json({ success: true, appeal }, { status: 201 });
  } catch (error) {
    console.error("[API POST /api/account/appeal] Error:", error);
    return NextResponse.json({ error: "Không thể gửi đơn kháng nghị. Vui lòng thử lại sau." }, { status: 500 });
  }
}
