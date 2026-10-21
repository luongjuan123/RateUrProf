import { NextRequest, NextResponse } from "next/server";
import {
  verifyGoogleIdToken,
  upsertGoogleUserAndCreateSession,
  getSessionCookieOptions,
} from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = body.idToken || body.credential;

    if (!token) {
      return NextResponse.json(
        { error: "Thiếu ID token từ Google." },
        { status: 400 }
      );
    }

    const googleUser = await verifyGoogleIdToken(token);
    const { user, profile, sessionToken } =
      await upsertGoogleUserAndCreateSession(googleUser);

    const response = NextResponse.json(
      { success: true, user, profile },
      { status: 200 }
    );

    const cookieOpts = getSessionCookieOptions();
    response.cookies.set(cookieOpts.name, sessionToken, cookieOpts);

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Xác thực Google thất bại.";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
