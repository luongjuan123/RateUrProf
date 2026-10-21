import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/server/auth";
import { getEmailSuppressions, removeEmailSuppression, addEmailSuppression } from "@/lib/server/db";
import { isValidEmailAddress } from "@/lib/server/email/emailSanitizer";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/email/suppressions
 * Lists suppressed email addresses.
 */
export async function GET(req: NextRequest) {
  try {
    await requirePermission(req, "settings:read");

    const { searchParams } = new URL(req.url);
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : 0;

    const list = await getEmailSuppressions(limit, offset);
    return NextResponse.json({ success: true, suppressions: list });
  } catch (error: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.status || 500;
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to load suppressions" },
      { status }
    );
  }
}

/**
 * POST /api/admin/email/suppressions
 * Manually adds an email address to the suppression list.
 */
export async function POST(req: NextRequest) {
  try {
    await requirePermission(req, "settings:manage");
    const body = await req.json().catch(() => ({}));
    const email = (body.email || "").trim().toLowerCase();

    if (!isValidEmailAddress(email)) {
      return NextResponse.json({ error: "Địa chỉ email không hợp lệ." }, { status: 400 });
    }

    await addEmailSuppression(email, body.reason || "manual_block", body.details || "Blocked by admin");
    return NextResponse.json({ success: true, email });
  } catch (error: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.status || 500;
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to suppress email" },
      { status }
    );
  }
}

/**
 * DELETE /api/admin/email/suppressions
 * Removes an email address from the suppression list.
 */
export async function DELETE(req: NextRequest) {
  try {
    await requirePermission(req, "settings:manage");
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email")?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Thiếu email cần gỡ bỏ." }, { status: 400 });
    }

    const removed = await removeEmailSuppression(email);
    return NextResponse.json({ success: true, removed, email });
  } catch (error: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.status || 500;
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to unsuppress email" },
      { status }
    );
  }
}
