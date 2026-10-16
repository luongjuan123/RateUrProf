import {
  University,
  Professor,
  SourceRegistryItem,
  EntityMatchCandidate,
  DataQualityReport,
  IngestionRun,
  SearchFilters
} from "@/types";
import verifiedAcademicData from "@/data/verified_academic_data.json";
import { db } from "./firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

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

const localData = verifiedAcademicData as unknown as AcademicDataBundle;

/**
 * Returns nationwide universities across North, Central, and South Vietnam.
 * Attempts Firestore fetch first, falling back to verified_academic_data.json.
 */
export async function getVerifiedUniversities(): Promise<University[]> {
  try {
    const snap = await getDocs(collection(db, "universities"));
    if (!snap.empty) {
      const fromFirestore = snap.docs.map(d => ({ ...d.data(), id: d.id } as University));
      const idMap = new Map<string, University>();
      localData.universities.forEach(u => idMap.set(u.id, u));
      fromFirestore.forEach(u => idMap.set(u.id, { ...idMap.get(u.id), ...u }));
      return Array.from(idMap.values());
    }
  } catch (err) {
    console.warn("Using verified local academic universities fallback:", err);
  }
  return localData.universities || [];
}

/**
 * Returns university by ID.
 */
export async function getVerifiedUniversityById(id: string): Promise<University | null> {
  const all = await getVerifiedUniversities();
  return all.find(u => u.id === id) || null;
}

/**
 * Returns verified professors with filtering support (by university, region, rank, faculty).
 */
export async function getVerifiedProfessors(filters?: SearchFilters): Promise<Professor[]> {
  let list = localData.professors || [];

  try {
    const snap = await getDocs(collection(db, "professors"));
    if (!snap.empty) {
      const fromFirestore = snap.docs.map(d => ({ ...d.data(), id: d.id } as Professor));
      const idMap = new Map<string, Professor>();
      list.forEach(p => idMap.set(p.id, p));
      fromFirestore.forEach(p => idMap.set(p.id, { ...idMap.get(p.id), ...p }));
      list = Array.from(idMap.values());
    }
  } catch (err) {
    console.warn("Using verified local academic professors fallback:", err);
  }

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
  const list = await getVerifiedProfessors();
  return list.find(p => p.id === id) || null;
}

/**
 * Returns the latest Data Quality and Nationwide Coverage Report.
 */
export async function getDataQualityReport(): Promise<DataQualityReport> {
  try {
    const snap = await getDocs(collection(db, "dataQualityReports"));
    if (!snap.empty) {
      const reports = snap.docs.map(d => ({ ...d.data(), id: d.id } as DataQualityReport));
      reports.sort((a, b) => ((b.generatedAt ? Number(b.generatedAt) : 0) - (a.generatedAt ? Number(a.generatedAt) : 0)));
      return reports[0];
    }
  } catch (err) {
    console.warn("Using verified local data quality report fallback:", err);
  }

  return localData.qa_report;
}

/**
 * Returns entity match candidates for administrative duplicate and cross-institution review.
 */
export async function getEntityMatchCandidates(): Promise<EntityMatchCandidate[]> {
  try {
    const snap = await getDocs(collection(db, "entityMatchCandidates"));
    if (!snap.empty) {
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as EntityMatchCandidate));
    }
  } catch (err) {
    console.warn("Using verified local entity match candidates fallback:", err);
  }

  return localData.entity_candidates || [];
}

/**
 * Resolves an entity match candidate (approve merge or dismiss as distinct individuals).
 */
export async function resolveEntityCandidate(
  candidateId: string,
  action: "merged" | "dismissed",
  resolvedBy: string = "admin"
): Promise<boolean> {
  try {
    const candRef = doc(db, "entityMatchCandidates", candidateId);
    await updateDoc(candRef, {
      status: action,
      resolvedAt: Date.now(),
      resolvedBy,
    });
    return true;
  } catch (err) {
    console.warn("Could not update candidate in Firestore, updating local memory state:", err);
    const cand = localData.entity_candidates.find(c => c.id === candidateId);
    if (cand) {
      cand.status = action;
      cand.resolvedAt = Date.now();
      cand.resolvedBy = resolvedBy;
      return true;
    }
    return false;
  }
}

/**
 * Returns the Source Registry items and their crawl statuses.
 */
export async function getSourceRegistry(): Promise<SourceRegistryItem[]> {
  try {
    const snap = await getDocs(collection(db, "sourceRegistry"));
    if (!snap.empty) {
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as SourceRegistryItem));
    }
  } catch (err) {
    console.warn("Using verified local source registry fallback:", err);
  }

  return localData.sources || [];
}

/**
 * Returns structured search and RAG retrieval documents.
 */
export function getSearchDocuments(): Record<string, unknown>[] {
  return localData.search_documents || [];
}
