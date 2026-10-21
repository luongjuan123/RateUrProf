import { NextRequest, NextResponse } from "next/server";
import {
  generateGoogleAuthUrl,
  getCallbackUri,
  getBaseUrl,
  getOAuthStateCookieOptions,
} from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const baseUrl = getBaseUrl(req);
  try {
    const { searchParams } = new URL(req.url);
    const returnUrl = searchParams.get("returnUrl") || "/";

    const clientId =
      process.env.GOOGLE_CLIENT_ID ||
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    if (!clientId) {
      const safeReturn = returnUrl.startsWith("/") && !returnUrl.startsWith("//") ? returnUrl : "/";
      const redirectUrl = new URL(safeReturn, baseUrl);
      redirectUrl.searchParams.set("auth_error", "google_credentials_missing");
      return NextResponse.redirect(redirectUrl, { status: 302 });
    }

    const callbackUri = getCallbackUri(req);
    const { url, state } = generateGoogleAuthUrl(callbackUri, returnUrl);

    const response = NextResponse.redirect(url, { status: 302 });

    const cookieOpts = getOAuthStateCookieOptions();
    response.cookies.set(cookieOpts.name, state, cookieOpts);

    return response;
  } catch (error) {
    console.error("[API /api/auth/google/signin] Error:", error);
    const redirectUrl = new URL("/", baseUrl);
    redirectUrl.searchParams.set("auth_error", "signin_failed");
    return NextResponse.redirect(redirectUrl, { status: 302 });
  }
}
