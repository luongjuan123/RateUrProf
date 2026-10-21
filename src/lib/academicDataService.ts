import {
  University,
  Professor,
  SourceRegistryItem,
  EntityMatchCandidate,
  DataQualityReport,
  IngestionRun,
  SearchFilters
} from "@/types";

interface AcademicDataBundle {
  metadata: {
    version: string;
    last_updated: number;
    generated_by: string;
    run_id: string;
  };
  universities: University[];
  professors: Professor[];
  sources: SourceRegistryItem[];
  entity_candidates: EntityMatchCandidate[];
  qa_report: DataQualityReport;
  search_documents: Record<string, unknown>[];
  ingestion_run: IngestionRun;
}

import { getInitialBundle, getInitialProfessorById, getInitialUniversityById } from "./initialData";

let cachedBundle: AcademicDataBundle | null = null;

function getLocalData(): AcademicDataBundle {
  if (cachedBundle) return cachedBundle;
  const bundle = getInitialBundle();
  if (bundle && bundle.universities) {
    cachedBundle = bundle as AcademicDataBundle;
    return cachedBundle;
  }
  if (typeof window !== "undefined") {
    cachedBundle = {
      metadata: { version: "1.0.0", last_updated: 0, generated_by: "", run_id: "" },
      universities: [],
      professors: [],
      sources: [],
      entity_candidates: [],
      qa_report: {} as DataQualityReport,
      search_documents: [],
      ingestion_run: {} as IngestionRun,
    };
    return cachedBundle;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path");
    const p = path.join(process.cwd(), "src", "data", "verified_academic_data.json");
    if (fs.existsSync(p)) {
      cachedBundle = JSON.parse(fs.readFileSync(p, "utf-8")) as AcademicDataBundle;
      return cachedBundle;
    }
  } catch (err) {
    console.warn("Could not read verified_academic_data.json in academicDataService:", err);
  }
  cachedBundle = {
    metadata: { version: "1.0.0", last_updated: 0, generated_by: "", run_id: "" },
    universities: [],
    professors: [],
    sources: [],
    entity_candidates: [],
    qa_report: {} as DataQualityReport,
    search_documents: [],
    ingestion_run: {} as IngestionRun,
  };
  return cachedBundle;
}

/**
 * Returns nationwide universities across North, Central, and South Vietnam.
 */
export async function getVerifiedUniversities(): Promise<University[]> {
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/universities");
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn("Could not fetch /api/universities:", err);
    }
  }
  return getLocalData().universities || [];
}

/**
 * Returns university by ID.
 */
export async function getVerifiedUniversityById(id: string): Promise<University | null> {
  if (typeof window === "undefined") {
    const uni = getInitialUniversityById(id);
    if (uni) return uni;
  }
  const all = await getVerifiedUniversities();
  return all.find(u => u.id === id) || null;
}

/**
 * Returns verified professors with filtering support (by university, region, rank, faculty).
 */
export async function getVerifiedProfessors(filters?: SearchFilters): Promise<Professor[]> {
  const list = getLocalData().professors || [];

  if (!filters) return list;

  return list.filter(p => {
    if (filters.universityIds && filters.universityIds.length > 0 && !filters.universityIds.includes(p.universityId)) return false;
    if (filters.facultyIds && filters.facultyIds.length > 0 && (!p.faculty || !filters.facultyIds.includes(p.faculty))) return false;
    if (filters.academicTitles && filters.academicTitles.length > 0 && (!p.academicTitle || !filters.academicTitles.includes(p.academicTitle))) return false;
    if (filters.minRating && (p.ratingAverage ?? 0) < filters.minRating) return false;
    if (filters.verificationStatuses && filters.verificationStatuses.length > 0 && (!p.verificationStatus || !filters.verificationStatuses.includes(p.verificationStatus))) return false;
    return true;
  });
}

/**
 * Returns professor by ID.
 */
export async function getVerifiedProfessorById(id: string): Promise<Professor | null> {
  if (typeof window === "undefined") {
    const prof = getInitialProfessorById(id);
    if (prof) return prof;
  }
  const list = await getVerifiedProfessors();
  return list.find(p => p.id === id) || null;
}

/**
 * Returns the latest Data Quality and Nationwide Coverage Report.
 */
export async function getDataQualityReport(): Promise<DataQualityReport> {
  return getLocalData().qa_report;
}

/**
 * Returns entity match candidates for administrative duplicate and cross-institution review.
 */
export async function getEntityMatchCandidates(): Promise<EntityMatchCandidate[]> {
  return getLocalData().entity_candidates || [];
}

/**
 * Resolves an entity match candidate (approve merge or dismiss as distinct individuals).
 */
export async function resolveEntityCandidate(
  candidateId: string,
  action: "merged" | "dismissed",
  resolvedBy: string = "admin"
): Promise<boolean> {
  const cand = getLocalData().entity_candidates.find(c => c.id === candidateId);
  if (cand) {
    cand.status = action;
    cand.resolvedAt = Date.now();
    cand.resolvedBy = resolvedBy;
    return true;
  }
  return true;
}

/**
 * Returns the Source Registry items and their crawl statuses.
 */
export async function getSourceRegistry(): Promise<SourceRegistryItem[]> {
  return getLocalData().sources || [];
}

/**
 * Returns structured search and RAG retrieval documents.
 */
export function getSearchDocuments(): Record<string, unknown>[] {
  return getLocalData().search_documents || [];
}
