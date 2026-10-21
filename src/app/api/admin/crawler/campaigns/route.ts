import { NextRequest, NextResponse } from "next/server";
import { CampaignManager } from "@/lib/server/crawler/campaignManager";
import { requireAdminSession } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdminSession(req);
    const campaigns = await CampaignManager.listCampaigns(20);
    return NextResponse.json({ success: true, campaigns });
  } catch (error: unknown) {
    console.error("[API /api/admin/crawler/campaigns GET] Error:", error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.status || 500;
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminSession(req);
    const body = await req.json();
    const { name, scope, institutionId, region } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Campaign name is required" },
        { status: 400 }
      );
    }

    const campaign = await CampaignManager.createCampaign({
      name,
      scope,
      institutionId,
      region,
    });

    // Auto-start campaign
    await CampaignManager.startCampaign(campaign.id);

    return NextResponse.json({ success: true, campaign });
  } catch (error: unknown) {
    console.error("[API /api/admin/crawler/campaigns POST] Error:", error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.status || 500;
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status }
    );
  }
}
