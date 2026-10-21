import { NextRequest, NextResponse } from "next/server";
import { UniversityRegistryService } from "@/lib/server/crawler/registry";
import { requireAdminSession } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdminSession(req);
    const institutions = await UniversityRegistryService.getAllInstitutions();
    return NextResponse.json({ success: true, institutions });
  } catch (error: unknown) {
    console.error("[API /api/admin/crawler/institutions GET] Error:", error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.status || 500;
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status }
    );
  }
}
