import { NextRequest, NextResponse } from "next/server";
import { revokeSessionToken, SESSION_COOKIE_NAME, getSessionCookieOptions } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const cookieToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const authHeader = req.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : null;

    const token = cookieToken || bearerToken;
    if (token) {
      await revokeSessionToken(token);
    }

    const response = NextResponse.json({ success: true }, { status: 200 });
    const cookieOpts = getSessionCookieOptions();
    response.cookies.set(cookieOpts.name, "", {
      ...cookieOpts,
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("[API /api/auth/logout] Error:", error);
    return NextResponse.json({ success: true }, { status: 200 });
  }
}
