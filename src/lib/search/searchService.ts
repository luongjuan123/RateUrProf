import {
  Professor,
  SearchFilters,
  SearchSortOption,
  SearchPagination,
  SearchResult,
  SearchFacets,
} from "@/types";
import { SearchEngine } from "./searchEngine";
import { INITIAL_PROFESSORS } from "../initialData";
import { getProfessors } from "../dataService";

// Shared in-process singleton search engine
let searchEngineInstance: SearchEngine | null = null;
let isInitialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Returns the singleton SearchEngine instance, initializing it if necessary.
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
 * Centralized Professor Search Service.
 * Used uniformly across the homepage search bar, professor directory,
 * advanced filter drawer, and API routes.
 */
export async function searchProfessors(
  filters: SearchFilters = {},
  sort: SearchSortOption = "relevance",
  pagination: SearchPagination = { page: 1, pageSize: 12 }
): Promise<SearchResult> {
  const engine = await getSharedSearchEngine();
  return engine.search(filters, sort, pagination);
}

/**
 * Retrieves dynamic facets (categories with counts) for dropdown filters.
 */
export async function getSearchFacets(): Promise<SearchFacets> {
  const engine = await getSharedSearchEngine();
  return engine.getFacets();
}

/**
 * Re-indexes all professors from canonical storage.
 * Call this when records are batch-updated or imported.
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
