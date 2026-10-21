import {
  Professor,
  SearchFilters,
  SearchSortOption,
  SearchPagination,
  SearchResult,
  SearchFacets,
  AutocompleteSuggestion,
} from "@/types";
import { SearchEngine } from "./searchEngine";
import { INITIAL_PROFESSORS } from "../initialData";
import { getProfessors } from "../dataService";

// Shared in-process singleton search engine for server-side / test execution
let searchEngineInstance: SearchEngine | null = null;
let isInitialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Returns the singleton SearchEngine instance, initializing it if necessary (Node/Server/Tests).
 */
export async function getSharedSearchEngine(): Promise<SearchEngine> {
  if (!searchEngineInstance) {
    searchEngineInstance = new SearchEngine();
  }

  if (!isInitialized) {
    if (!initPromise) {
      initPromise = (async () => {
        try {
          // Fetch canonical professors from database / fallback
          let profs: Professor[] = [];
          try {
            profs = await getProfessors();
          } catch (err) {
            console.warn("getProfessors failed during search engine init, using INITIAL_PROFESSORS:", err);
            profs = INITIAL_PROFESSORS;
          }

          if (!profs || profs.length === 0) {
            profs = INITIAL_PROFESSORS;
          }

          searchEngineInstance!.clear();
          searchEngineInstance!.bulkIndex(profs);
          isInitialized = true;
        } finally {
          initPromise = null;
        }
      })();
    }
    await initPromise;
  }

  return searchEngineInstance;
}

/**
 * Checks if search filters have any active query or filter condition.
 */
function hasActiveFilters(filters: SearchFilters): boolean {
  if (filters.query && filters.query.trim().length > 0) return true;
  if (filters.name && filters.name.trim().length > 0) return true;
  if (filters.universityIds && filters.universityIds.length > 0) return true;
  if (filters.university && filters.university !== "all") return true;
  if (filters.majorIds && filters.majorIds.length > 0) return true;
  if (filters.major) return true;
  if (filters.facultyIds && filters.facultyIds.length > 0) return true;
  if (filters.faculty && filters.faculty !== "all") return true;
  if (filters.departmentIds && filters.departmentIds.length > 0) return true;
  if (filters.courseIds && filters.courseIds.length > 0) return true;
  if (filters.cityIds && filters.cityIds.length > 0) return true;
  if (filters.academicTitles && filters.academicTitles.length > 0) return true;
  if (filters.researchInterests && filters.researchInterests.length > 0) return true;
  if (typeof filters.minRating === "number" && filters.minRating > 0) return true;
  if (typeof filters.maxRating === "number" && filters.maxRating > 0) return true;
  if (typeof filters.minReviewCount === "number" && filters.minReviewCount > 0) return true;
  if (filters.includeUnrated) return true;
  if (filters.verificationStatuses && filters.verificationStatuses.length > 0) return true;
  if (filters.hasPhoto) return true;
  return false;
}

/**
 * Centralized Professor Search Service.
 * - In Browser: Calls backend endpoint /api/lecturers/search without loading lecturer database.
 * - On Server / Tests: Uses indexed search engine in memory.
 */
export async function searchProfessors(
  filters: SearchFilters = {},
  sort: SearchSortOption = "relevance",
  pagination: SearchPagination = { page: 1, pageSize: 20 }
): Promise<SearchResult> {
  const page = Math.max(1, pagination.page || 1);
  const pageSize = Math.max(1, Math.min(50, pagination.pageSize || 20));

  // If in browser: strictly query backend on-demand
  if (typeof window !== "undefined") {
    // If no query and no filters, return 0 items immediately without making a request
    if (!hasActiveFilters(filters)) {
      return {
        items: [],
        totalCount: 0,
        page,
        pageSize,
        totalPages: 0,
        hasNextPage: false,
        appliedFilters: filters,
        activeFilterCount: 0,
        executionTimeMs: 0,
      };
    }

    const params = new URLSearchParams();
    if (filters.query?.trim()) params.set("q", filters.query.trim());
    if (filters.name?.trim()) params.set("name", filters.name.trim());
    if (filters.universityIds && filters.universityIds.length > 0) {
      params.set("university", filters.universityIds.join(","));
    } else if (filters.university && filters.university !== "all") {
      params.set("university", filters.university);
    }
    if (filters.majorIds && filters.majorIds.length > 0) params.set("major", filters.majorIds.join(","));
    if (filters.facultyIds && filters.facultyIds.length > 0) {
      params.set("faculty", filters.facultyIds.join(","));
    } else if (filters.faculty && filters.faculty !== "all") {
      params.set("faculty", filters.faculty);
    }
    if (filters.departmentIds && filters.departmentIds.length > 0) params.set("department", filters.departmentIds.join(","));
    if (filters.courseIds && filters.courseIds.length > 0) params.set("course", filters.courseIds.join(","));
    if (filters.cityIds && filters.cityIds.length > 0) params.set("city", filters.cityIds.join(","));
    if (filters.academicTitles && filters.academicTitles.length > 0) params.set("title", filters.academicTitles.join(","));
    if (filters.researchInterests && filters.researchInterests.length > 0) params.set("interest", filters.researchInterests.join(","));
    if (typeof filters.minRating === "number" && filters.minRating > 0) params.set("minRating", filters.minRating.toString());
    if (typeof filters.maxRating === "number" && filters.maxRating > 0) params.set("maxRating", filters.maxRating.toString());
    if (typeof filters.minReviewCount === "number" && filters.minReviewCount > 0) params.set("minReviews", filters.minReviewCount.toString());
    if (filters.includeUnrated) params.set("unrated", "true");
    if (sort && sort !== "relevance") params.set("sort", sort);
    params.set("page", page.toString());
    params.set("pageSize", pageSize.toString());

    const res = await fetch(`/api/search?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`Search request failed (${res.status})`);
    }
    return await res.json();
  }

  // Server / Unit Test environment: evaluate in-process
  const engine = await getSharedSearchEngine();
  return engine.search(filters, sort, { page, pageSize });
}

/**
 * Retrieves dynamic facets (categories with counts) for dropdown filters.
 */
export async function getSearchFacets(): Promise<SearchFacets> {
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/facets");
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback
    }
    return {
      universities: [],
      majors: [],
      faculties: [],
      departments: [],
      courses: [],
      cities: [],
      academicTitles: [],
      researchInterests: [],
      verificationStatuses: [],
    };
  }

  const engine = await getSharedSearchEngine();
  return engine.getFacets();
}

/**
 * Re-indexes all professors from canonical storage.
 */
export async function reindexSearchData(): Promise<{ indexedCount: number }> {
  const engine = await getSharedSearchEngine();
  const profs = await getProfessors();
  engine.clear();
  engine.bulkIndex(profs.length > 0 ? profs : INITIAL_PROFESSORS);
  return { indexedCount: engine.getIndexedCount() };
}

/**
 * Dynamically updates or inserts an individual professor in the search index.
 */
export async function syncProfessorToIndex(prof: Professor): Promise<void> {
  const engine = await getSharedSearchEngine();
  engine.indexProfessor(prof);
}

/**
 * Dynamically removes an individual professor from the search index.
 */
export async function removeProfessorFromIndex(professorId: string): Promise<void> {
  const engine = await getSharedSearchEngine();
  engine.removeProfessor(professorId);
}

/**
 * Autocomplete suggestions for search input.
 * In browser: queries /api/lecturers/autocomplete
 * On server / tests: calls searchEngine directly.
 */
export async function getAutocomplete(
  query: string,
  limit: number = 8,
  type?: string
): Promise<AutocompleteSuggestion[]> {
  const cleanQ = query?.trim();
  if (!cleanQ || cleanQ.length < 2) return [];

  if (typeof window !== "undefined") {
    try {
      const typeParam = type ? `&type=${encodeURIComponent(type)}` : "";
      const res = await fetch(`/api/autocomplete?q=${encodeURIComponent(cleanQ)}&limit=${limit}${typeParam}`);
      if (res.ok) {
        const data = await res.json();
        const suggestions: AutocompleteSuggestion[] = data.suggestions || [];
        if (type === "school" || type === "university") {
          return suggestions.filter((s) => s.type === "university");
        }
        if (type === "professor" || type === "lecturer" || type === "teacher") {
          return suggestions.filter((s) => s.type === "lecturer");
        }
        return suggestions;
      }
    } catch {
      return [];
    }
    return [];
  }

  if (type === "school" || type === "university") {
    return [];
  }

  const engine = await getSharedSearchEngine();
  return engine.getAutocompleteSuggestions(cleanQ, limit);
}
