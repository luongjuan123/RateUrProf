import { NextRequest, NextResponse } from "next/server";
import { CampaignManager } from "@/lib/server/crawler/campaignManager";
import { requireAdminSession } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession(req);
    const { id } = await params;
    const campaign = await CampaignManager.syncCampaignProgress(id);
    if (!campaign) {
      return NextResponse.json({ success: false, error: "Campaign not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, campaign });
  } catch (error: unknown) {
    console.error("[API /api/admin/crawler/campaigns/[id] GET] Error:", error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.status || 500;
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession(req);
    const { id } = await params;
    const body = await req.json();
    const { action } = body;

    let success = false;
    if (action === "start" || action === "resume") {
      success = await CampaignManager.startCampaign(id);
    } else if (action === "pause") {
      success = await CampaignManager.pauseCampaign(id);
    } else if (action === "cancel") {
      success = await CampaignManager.cancelCampaign(id);
    } else {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }

    const campaign = await CampaignManager.getCampaign(id);
    return NextResponse.json({ success, campaign });
  } catch (error: unknown) {
    console.error("[API /api/admin/crawler/campaigns/[id] PATCH] Error:", error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.status || 500;
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status }
    );
  }
}
