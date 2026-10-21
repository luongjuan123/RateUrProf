import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/server/auth";
import { updateAdminLecturer } from "@/lib/server/adminDb";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await requirePermission(req, "lecturers:manage");
    const body = await req.json();

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    const result = await updateAdminLecturer(id, body, {
      id: session.user.uid,
      email: session.user.email || "unknown",
      role: session.user.role || "student",
      ip: clientIp,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.status || 400;
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Lỗi cập nhật giảng viên." },
      { status }
    );
  }
}
