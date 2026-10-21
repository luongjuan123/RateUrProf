import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const supportedLocales = ["vi", "en"];
const defaultLocale = "vi";

function getPreferredLocale(request: NextRequest): string {
  // 1. Check user cookie preference
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  if (cookieLocale && supportedLocales.includes(cookieLocale)) {
    return cookieLocale;
  }

  // 2. Check Accept-Language header
  const acceptLang = request.headers.get("accept-language");
  if (acceptLang) {
    const preferred = acceptLang
      .split(",")
      .map(lang => lang.split(";")[0].trim().toLowerCase().slice(0, 2));

    for (const l of preferred) {
      if (supportedLocales.includes(l)) {
        return l;
      }
    }
  }

  // 3. Fallback to sensible default
  return defaultLocale;
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Ignore internal Next.js assets, api routes, and static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") // e.g. favicon.ico, images, robots.txt
  ) {
    return NextResponse.next();
  }

  // Check if pathname already starts with a supported locale
  const pathnameHasLocale = supportedLocales.some(
    (loc) => pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)
  );

  // Redirect directory pages (/professors and /universities) directly to Home search
  const cleanPath = pathname.replace(/^\/(vi|en)/, "") || "/";
  if (cleanPath === "/professors") {
    const currentLocale = pathnameHasLocale ? pathname.split("/")[1] : getPreferredLocale(request);
    const q = request.nextUrl.searchParams.get("q") || request.nextUrl.searchParams.get("query");
    const target = q ? `/${currentLocale}?mode=professor&q=${encodeURIComponent(q)}` : `/${currentLocale}`;
    return NextResponse.redirect(new URL(target, request.url));
  }
  if (cleanPath === "/universities") {
    const currentLocale = pathnameHasLocale ? pathname.split("/")[1] : getPreferredLocale(request);
    const q = request.nextUrl.searchParams.get("q") || request.nextUrl.searchParams.get("query");
    const target = q ? `/${currentLocale}?mode=school&q=${encodeURIComponent(q)}` : `/${currentLocale}?mode=school`;
    return NextResponse.redirect(new URL(target, request.url));
  }

  // Handle RateMyProfessors compatibility aliases
  if (pathname.includes("/add/school-rating/")) {
    const id = pathname.split("/add/school-rating/")[1];
    const currentLocale = pathnameHasLocale ? pathname.split("/")[1] : getPreferredLocale(request);
    return NextResponse.redirect(new URL(`/${currentLocale}/universities/${id}/rate${search}`, request.url));
  }
  if (pathname.includes("/add/professor-rating/")) {
    const id = pathname.split("/add/professor-rating/")[1];
    const currentLocale = pathnameHasLocale ? pathname.split("/")[1] : getPreferredLocale(request);
    return NextResponse.redirect(new URL(`/${currentLocale}/professors/${id}/rate${search}`, request.url));
  }

  if (pathnameHasLocale) {
    return NextResponse.next();
  }

  // Redirect to localized path while preserving subpath and query parameters
  const locale = getPreferredLocale(request);
  const targetUrl = new URL(`/${locale}${pathname === "/" ? "" : pathname}${search}`, request.url);

  return NextResponse.redirect(targetUrl);
}

export const config = {
  matcher: [
    // Match all request paths except _next and static files
    "/((?!_next|api|favicon.ico|.*\\..*).*)"
  ],
};
