import { NextRequest, NextResponse } from "next/server";
import {
  exchangeGoogleCodeForUser,
  upsertGoogleUserAndCreateSession,
  getCallbackUri,
  getBaseUrl,
  getSessionCookieOptions,
  getOAuthStateCookieOptions,
  OAUTH_STATE_COOKIE_NAME,
} from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const baseUrl = getBaseUrl(req);
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const stateParam = searchParams.get("state");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      console.warn("[OAuth Callback] Google OAuth returned error:", errorParam);
      return NextResponse.redirect(new URL(`/?auth_error=${encodeURIComponent(errorParam)}`, baseUrl));
    }

    // Extract returnUrl from state: state_random:::encodedReturnUrl
    let returnUrl = "/";
    if (stateParam && stateParam.includes(":::")) {
      const parts = stateParam.split(":::");
      if (parts[1]) {
        try {
          const decoded = decodeURIComponent(parts[1]);
          if (decoded.startsWith("/") && !decoded.startsWith("//")) {
            returnUrl = decoded;
          }
        } catch {
          returnUrl = "/";
        }
      }
    }

    if (!code || !stateParam) {
      const redirectUrl = new URL(returnUrl, baseUrl);
      redirectUrl.searchParams.set("auth_error", "missing_oauth_code");
      return NextResponse.redirect(redirectUrl, { status: 302 });
    }

    // CSRF verification
    const cookieState = req.cookies.get(OAUTH_STATE_COOKIE_NAME)?.value;
    if (!cookieState || cookieState !== stateParam) {
      console.warn("[OAuth Callback] CSRF state mismatch:", { cookieState, stateParam });
      const redirectUrl = new URL(returnUrl, baseUrl);
      redirectUrl.searchParams.set("auth_error", "csrf_state_mismatch");
      return NextResponse.redirect(redirectUrl, { status: 302 });
    }

    const callbackUri = getCallbackUri(req);
    const googleUser = await exchangeGoogleCodeForUser(code, callbackUri);
    const { user, sessionToken } = await upsertGoogleUserAndCreateSession(googleUser);

    const isEn = returnUrl.startsWith("/en") || returnUrl.includes("lang=en");
    const localePrefix = isEn ? "/en" : "/vi";

    let targetPath = returnUrl;
    if (user.status === "locked" || user.status === "suspended") {
      targetPath = `${localePrefix}/locked`;
    }

    const redirectTarget = new URL(targetPath, baseUrl);
    const response = NextResponse.redirect(redirectTarget, { status: 302 });

    // Set HttpOnly session cookie
    const sessionCookieOpts = getSessionCookieOptions();
    response.cookies.set(sessionCookieOpts.name, sessionToken, sessionCookieOpts);

    // Clear state cookie
    const stateCookieOpts = getOAuthStateCookieOptions();
    response.cookies.set(stateCookieOpts.name, "", {
      ...stateCookieOpts,
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("[API /api/auth/google/callback] Error:", error);
    const message = error instanceof Error ? error.message : "Xác thực Google thất bại.";
    return NextResponse.redirect(
      new URL(`/?auth_error=${encodeURIComponent(message)}`, baseUrl)
    );
  }
}
