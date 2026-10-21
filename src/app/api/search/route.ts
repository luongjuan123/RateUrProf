import { NextRequest, NextResponse } from "next/server";
import { executeServerSearch } from "@/lib/server/searchIndex";
import { SearchFilters, SearchSortOption, VerificationStatus } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const q = searchParams.get("q") || searchParams.get("query") || undefined;
    const name = searchParams.get("name") || undefined;

    const parseList = (param: string): string[] | undefined => {
      const val = searchParams.get(param);
      if (!val) return undefined;
      const arr = val.split(",").map((s) => s.trim()).filter(Boolean);
      return arr.length > 0 ? arr : undefined;
    };

    const universityIds = parseList("university") || parseList("universityIds");
    const majorIds = parseList("major") || parseList("majorIds");
    const facultyIds = parseList("faculty") || parseList("facultyIds");
    const departmentIds = parseList("department") || parseList("departmentIds");
    const courseIds = parseList("course") || parseList("courseIds");
    const cityIds = parseList("city") || parseList("cityIds");
    const academicTitles = parseList("title") || parseList("academicTitles");
    const researchInterests = parseList("interest") || parseList("researchInterests");

    const minRating = searchParams.get("minRating")
      ? parseFloat(searchParams.get("minRating")!)
      : undefined;
    const maxRating = searchParams.get("maxRating")
      ? parseFloat(searchParams.get("maxRating")!)
      : undefined;
    const minReviewCount = searchParams.get("minReviews")
      ? parseInt(searchParams.get("minReviews")!, 10)
      : undefined;

    const includeUnrated =
      searchParams.get("unrated") === "true" ||
      searchParams.get("unrated") === "1" ||
      searchParams.get("includeUnrated") === "true";

    const verificationStatuses = parseList("verified") as VerificationStatus[] | undefined;
    const hasPhoto = searchParams.get("photo") === "true" || undefined;

    const sort = (searchParams.get("sort") || "relevance") as SearchSortOption;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const pageSize = searchParams.get("pageSize") ? parseInt(searchParams.get("pageSize")!, 10) : 12;

    const filters: SearchFilters = {
      query: q,
      name,
      universityIds,
      majorIds,
      facultyIds,
      departmentIds,
      courseIds,
      cityIds,
      academicTitles,
      researchInterests,
      minRating,
      maxRating,
      minReviewCount,
      includeUnrated,
      verificationStatuses,
      hasPhoto,
    };

    const includeFacets = searchParams.get("facets") === "true";
    const result = await executeServerSearch(filters, sort, { page, pageSize }, { includeFacets });

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("[API /api/search] Search failed:", error);
    return NextResponse.json(
      { error: "Internal server error during search execution" },
      { status: 500 }
    );
  }
}
