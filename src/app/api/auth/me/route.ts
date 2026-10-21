import { NextRequest, NextResponse } from "next/server";
import { authenticateSessionToken, SESSION_COOKIE_NAME } from "@/lib/server/auth";

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
      return NextResponse.json({ user: null, profile: null }, { status: 200 });
    }

    const session = await authenticateSessionToken(token);
    if (!session) {
      return NextResponse.json({ user: null, profile: null }, { status: 200 });
    }

    return NextResponse.json(
      { user: session.user, profile: session.profile },
      { status: 200 }
    );
  } catch (error) {
    console.error("[API /api/auth/me] Error:", error);
    return NextResponse.json({ user: null, profile: null }, { status: 200 });
  }
}
