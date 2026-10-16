"use client";

import { useState, useEffect, useTransition, useCallback, useMemo, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  SearchFilters,
  SearchSortOption,
  SearchResult,
  SearchFacets,
  VerificationStatus,
} from "@/types";
import { searchProfessors, getSearchFacets } from "./searchService";

export interface ActiveChip {
  key: string;
  label: string;
  value: string;
  onRemove: () => void;
}

export function useProfessorSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // Parse initial filters from current URL search parameters
  const parseFiltersFromUrl = useCallback((): {
    filters: SearchFilters;
    sort: SearchSortOption;
    page: number;
    pageSize: number;
  } => {
    const q = searchParams.get("q") || undefined;
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
    const page = searchParams.get("page") ? Math.max(1, parseInt(searchParams.get("page")!, 10)) : 1;
    const pageSize = searchParams.get("pageSize")
      ? Math.max(1, Math.min(50, parseInt(searchParams.get("pageSize")!, 10)))
      : 12;

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

    return { filters, sort, page, pageSize };
  }, [searchParams]);

  const initialParsed = useMemo(() => parseFiltersFromUrl(), [parseFiltersFromUrl]);

  // State
  const [filters, setFilters] = useState<SearchFilters>(initialParsed.filters);
  const [sort, setSort] = useState<SearchSortOption>(initialParsed.sort);
  const [page, setPage] = useState<number>(initialParsed.page);
  const [pageSize, setPageSize] = useState<number>(initialParsed.pageSize);

  const [result, setResult] = useState<SearchResult | null>(null);
  const [facets, setFacets] = useState<SearchFacets | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Synchronize internal state when browser Back/Forward changes searchParams
  const lastUrlString = useRef(searchParams.toString());
  useEffect(() => {
    const currentUrlStr = searchParams.toString();
    if (currentUrlStr !== lastUrlString.current) {
      lastUrlString.current = currentUrlStr;
      const parsed = parseFiltersFromUrl();
      setFilters(parsed.filters);
      setSort(parsed.sort);
      setPage(parsed.page);
      setPageSize(parsed.pageSize);
    }
  }, [searchParams, parseFiltersFromUrl]);

  // Update URL search parameters
  const updateUrl = useCallback(
    (newFilters: SearchFilters, newSort: SearchSortOption, newPage: number, newPageSize: number) => {
      const params = new URLSearchParams();

      if (newFilters.query?.trim()) params.set("q", newFilters.query.trim());
      if (newFilters.name?.trim()) params.set("name", newFilters.name.trim());
      if (newFilters.universityIds && newFilters.universityIds.length > 0) {
        params.set("university", newFilters.universityIds.join(","));
      }
      if (newFilters.majorIds && newFilters.majorIds.length > 0) {
        params.set("major", newFilters.majorIds.join(","));
      }
      if (newFilters.facultyIds && newFilters.facultyIds.length > 0) {
        params.set("faculty", newFilters.facultyIds.join(","));
      }
      if (newFilters.departmentIds && newFilters.departmentIds.length > 0) {
        params.set("department", newFilters.departmentIds.join(","));
      }
      if (newFilters.courseIds && newFilters.courseIds.length > 0) {
        params.set("course", newFilters.courseIds.join(","));
      }
      if (newFilters.cityIds && newFilters.cityIds.length > 0) {
        params.set("city", newFilters.cityIds.join(","));
      }
      if (newFilters.academicTitles && newFilters.academicTitles.length > 0) {
        params.set("title", newFilters.academicTitles.join(","));
      }
      if (newFilters.researchInterests && newFilters.researchInterests.length > 0) {
        params.set("interest", newFilters.researchInterests.join(","));
      }
      if (typeof newFilters.minRating === "number" && newFilters.minRating > 0) {
        params.set("minRating", newFilters.minRating.toString());
      }
      if (typeof newFilters.maxRating === "number" && newFilters.maxRating > 0) {
        params.set("maxRating", newFilters.maxRating.toString());
      }
      if (typeof newFilters.minReviewCount === "number" && newFilters.minReviewCount > 0) {
        params.set("minReviews", newFilters.minReviewCount.toString());
      }
      if (newFilters.includeUnrated) {
        params.set("unrated", "true");
      }
      if (newFilters.verificationStatuses && newFilters.verificationStatuses.length > 0) {
        params.set("verified", newFilters.verificationStatuses.join(","));
      }
      if (newFilters.hasPhoto) {
        params.set("photo", "true");
      }
      if (newSort !== "relevance") {
        params.set("sort", newSort);
      }
      if (newPage > 1) {
        params.set("page", newPage.toString());
      }
      if (newPageSize !== 12) {
        params.set("pageSize", newPageSize.toString());
      }

      const queryString = params.toString();
      startTransition(() => {
        router.replace(`${pathname}${queryString ? `?${queryString}` : ""}`, { scroll: false });
      });
    },
    [pathname, router]
  );
  // Search execution
  const executeSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const searchRes = await searchProfessors(filters, sort, { page, pageSize });
      setResult(searchRes);
      const facetRes = await getSearchFacets();
      setFacets(facetRes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đã xảy ra lỗi khi tìm kiếm";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [filters, sort, page, pageSize]);

  // Search execution with cancellation
  useEffect(() => {
    let ignore = false;
    const timer = setTimeout(() => {
      if (!ignore) {
        executeSearch();
      }
    }, 0);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [executeSearch]);

  // Public Actions
  const setQuery = useCallback(
    (newQuery: string) => {
      const updated: SearchFilters = { ...filters, query: newQuery || undefined };
      setFilters(updated);
      setPage(1);
      updateUrl(updated, sort, 1, pageSize);
    },
    [filters, sort, pageSize, updateUrl]
  );

  const applyFilters = useCallback(
    (newFilters: Partial<SearchFilters>) => {
      const updated: SearchFilters = { ...filters, ...newFilters };
      setFilters(updated);
      setPage(1);
      updateUrl(updated, sort, 1, pageSize);
    },
    [filters, sort, pageSize, updateUrl]
  );

  const setSingleFilter = useCallback(
    <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
      const updated: SearchFilters = { ...filters, [key]: value };
      setFilters(updated);
      setPage(1);
      updateUrl(updated, sort, 1, pageSize);
    },
    [filters, sort, pageSize, updateUrl]
  );

  const removeFilter = useCallback(
    (key: keyof SearchFilters, specificValue?: string) => {
      const updated = { ...filters };

      if (specificValue && Array.isArray(updated[key])) {
        const arr = (updated[key] as string[]).filter((v) => v !== specificValue);
        (updated as Record<string, unknown>)[key] = arr.length > 0 ? arr : undefined;
      } else {
        delete updated[key];
      }

      setFilters(updated);
      setPage(1);
      updateUrl(updated, sort, 1, pageSize);
    },
    [filters, sort, pageSize, updateUrl]
  );

  const clearAllFilters = useCallback(() => {
    const emptyFilters: SearchFilters = {};
    setFilters(emptyFilters);
    setSort("relevance");
    setPage(1);
    updateUrl(emptyFilters, "relevance", 1, pageSize);
  }, [pageSize, updateUrl]);

  const changeSort = useCallback(
    (newSort: SearchSortOption) => {
      setSort(newSort);
      setPage(1);
      updateUrl(filters, newSort, 1, pageSize);
    },
    [filters, pageSize, updateUrl]
  );

  const goToPage = useCallback(
    (newPage: number) => {
      setPage(newPage);
      updateUrl(filters, sort, newPage, pageSize);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [filters, sort, pageSize, updateUrl]
  );

  // Active filter chips computation
  const activeChips = useMemo((): ActiveChip[] => {
    const chips: ActiveChip[] = [];

    if (filters.query?.trim()) {
      chips.push({
        key: "query",
        label: `Từ khóa: "${filters.query.trim()}"`,
        value: filters.query.trim(),
        onRemove: () => removeFilter("query"),
      });
    }

    if (filters.name?.trim()) {
      chips.push({
        key: "name",
        label: `Tên: "${filters.name.trim()}"`,
        value: filters.name.trim(),
        onRemove: () => removeFilter("name"),
      });
    }

    if (filters.universityIds && filters.universityIds.length > 0) {
      for (const u of filters.universityIds) {
        chips.push({
          key: `uni-${u}`,
          label: `Trường: ${u.toUpperCase()}`,
          value: u,
          onRemove: () => removeFilter("universityIds", u),
        });
      }
    }

    if (filters.majorIds && filters.majorIds.length > 0) {
      for (const m of filters.majorIds) {
        chips.push({
          key: `major-${m}`,
          label: `Ngành: ${m}`,
          value: m,
          onRemove: () => removeFilter("majorIds", m),
        });
      }
    }

    if (filters.facultyIds && filters.facultyIds.length > 0) {
      for (const f of filters.facultyIds) {
        chips.push({
          key: `fac-${f}`,
          label: `Khoa: ${f}`,
          value: f,
          onRemove: () => removeFilter("facultyIds", f),
        });
      }
    }

    if (filters.departmentIds && filters.departmentIds.length > 0) {
      for (const d of filters.departmentIds) {
        chips.push({
          key: `dept-${d}`,
          label: `Bộ môn: ${d}`,
          value: d,
          onRemove: () => removeFilter("departmentIds", d),
        });
      }
    }

    if (filters.courseIds && filters.courseIds.length > 0) {
      for (const c of filters.courseIds) {
        chips.push({
          key: `course-${c}`,
          label: `Môn học: ${c}`,
          value: c,
          onRemove: () => removeFilter("courseIds", c),
        });
      }
    }

    if (filters.cityIds && filters.cityIds.length > 0) {
      for (const city of filters.cityIds) {
        chips.push({
          key: `city-${city}`,
          label: `Địa điểm: ${city}`,
          value: city,
          onRemove: () => removeFilter("cityIds", city),
        });
      }
    }

    if (filters.academicTitles && filters.academicTitles.length > 0) {
      for (const t of filters.academicTitles) {
        chips.push({
          key: `title-${t}`,
          label: `Học hàm: ${t}`,
          value: t,
          onRemove: () => removeFilter("academicTitles", t),
        });
      }
    }

    if (filters.researchInterests && filters.researchInterests.length > 0) {
      for (const ri of filters.researchInterests) {
        chips.push({
          key: `interest-${ri}`,
          label: `Nghiên cứu: ${ri}`,
          value: ri,
          onRemove: () => removeFilter("researchInterests", ri),
        });
      }
    }

    if (typeof filters.minRating === "number" && filters.minRating > 0) {
      chips.push({
        key: "minRating",
        label: `Đánh giá ≥ ${filters.minRating} ★`,
        value: filters.minRating.toString(),
        onRemove: () => removeFilter("minRating"),
      });
    }

    if (typeof filters.maxRating === "number" && filters.maxRating > 0) {
      chips.push({
        key: "maxRating",
        label: `Đánh giá ≤ ${filters.maxRating} ★`,
        value: filters.maxRating.toString(),
        onRemove: () => removeFilter("maxRating"),
      });
    }

    if (typeof filters.minReviewCount === "number" && filters.minReviewCount > 0) {
      chips.push({
        key: "minReviews",
        label: `Tối thiểu ${filters.minReviewCount} đánh giá`,
        value: filters.minReviewCount.toString(),
        onRemove: () => removeFilter("minReviewCount"),
      });
    }

    if (filters.includeUnrated) {
      chips.push({
        key: "includeUnrated",
        label: "Bao gồm chưa đánh giá",
        value: "true",
        onRemove: () => removeFilter("includeUnrated"),
      });
    }

    if (filters.verificationStatuses && filters.verificationStatuses.length > 0) {
      chips.push({
        key: "verificationStatuses",
        label: `Trạng thái: ${filters.verificationStatuses.join(", ")}`,
        value: filters.verificationStatuses.join(","),
        onRemove: () => removeFilter("verificationStatuses"),
      });
    }

    if (filters.hasPhoto) {
      chips.push({
        key: "hasPhoto",
        label: "Có ảnh đại diện",
        value: "true",
        onRemove: () => removeFilter("hasPhoto"),
      });
    }

    return chips;
  }, [filters, removeFilter]);

  return {
    filters,
    sort,
    page,
    pageSize,
    result,
    facets,
    loading,
    error,
    activeChips,
    activeFilterCount: activeChips.length,
    setQuery,
    applyFilters,
    setSingleFilter,
    removeFilter,
    clearAllFilters,
    changeSort,
    goToPage,
    retry: executeSearch,
  };
}
