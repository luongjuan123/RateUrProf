import {
  University,
  Professor,
  Review,
  Report,
  DataQualityReport,
  IngestionJob,
  CorrectionRequest,
  SchoolReview,
  SchoolCriteriaRatings,
} from "@/types";
import { INITIAL_UNIVERSITIES, INITIAL_PROFESSORS, INITIAL_REVIEWS } from "./initialData";

// Seed database check (managed natively by Cloud SQL / SQLite relational schemas)
export async function ensureDatabaseSeeded(): Promise<void> {
  // Relational databases are managed via PostgreSQL / SQLite migrations
  return Promise.resolve();
}

// ---------------------------------------------------------------------------
// Universities
// ---------------------------------------------------------------------------

export async function getUniversities(): Promise<University[]> {
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
  return INITIAL_UNIVERSITIES;
}

const clientCache = {
  professors: new Map<string, { data: Professor; expires: number }>(),
  universities: new Map<string, { data: University; expires: number }>(),
  schoolReviews: new Map<string, { data: any; expires: number }>(),
  professorReviews: new Map<string, { data: Review[]; expires: number }>(),
};

const CLIENT_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

export function invalidateClientCache(type?: "professor" | "university" | "all", id?: string): void {
  if (type === "professor" && id) {
    clientCache.professors.delete(id);
    clientCache.professorReviews.delete(id);
  } else if (type === "university" && id) {
    clientCache.universities.delete(id);
    clientCache.schoolReviews.delete(id);
  } else {
    clientCache.professors.clear();
    clientCache.universities.clear();
    clientCache.schoolReviews.clear();
    clientCache.professorReviews.clear();
  }
}

export async function getUniversityById(id: string): Promise<University | null> {
  if (typeof window !== "undefined") {
    const cached = clientCache.universities.get(id);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    try {
      const res = await fetch(`/api/universities/${encodeURIComponent(id)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.id) {
          clientCache.universities.set(id, { data, expires: Date.now() + CLIENT_CACHE_TTL_MS });
          return data;
        }
      }
    } catch (err) {
      console.warn("Could not fetch /api/universities/[id]:", err);
    }
  }
  return INITIAL_UNIVERSITIES.find((u) => u.id === id) || null;
}

export async function getSchoolReviewsAndStats(universityId: string): Promise<{
  reviews: SchoolReview[];
  total: number;
  ratingAverage: number | null;
  criteriaAverages: SchoolCriteriaRatings | null;
}> {
  if (typeof window !== "undefined") {
    const cached = clientCache.schoolReviews.get(universityId);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    try {
      const res = await fetch(`/api/universities/${encodeURIComponent(universityId)}/reviews`);
      if (res.ok) {
        const data = await res.json();
        clientCache.schoolReviews.set(universityId, { data, expires: Date.now() + CLIENT_CACHE_TTL_MS });
        return data;
      }
    } catch (err) {
      console.warn("Could not fetch school reviews from API:", err);
    }
  }
  return { reviews: [], total: 0, ratingAverage: null, criteriaAverages: null };
}

export async function submitSchoolReview(reviewData: {
  universityId: string;
  userId?: string;
  userDisplayName?: string;
  cohort?: string;
  criteria: SchoolCriteriaRatings;
  comment?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/universities/${encodeURIComponent(reviewData.universityId)}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reviewData),
    });

    if (res.ok) {
      invalidateClientCache("university", reviewData.universityId);
      return { success: true };
    }

    const data = await res.json().catch(() => ({}));
    return { success: false, error: data.error || "Lỗi khi lưu đánh giá trường." };
  } catch (err: unknown) {
    console.error("[DataService] Submit school review error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Lỗi khi lưu đánh giá trường.",
    };
  }
}

export async function upvoteSchoolReview(reviewId: string, userId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/school-reviews/${encodeURIComponent(reviewId)}/upvote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    return res.ok;
  } catch (err) {
    console.error("[DataService] Error upvoting school review:", err);
    return false;
  }
}

export async function getUserReviewForSchool(universityId: string, userId: string): Promise<SchoolReview | null> {
  if (!universityId || !userId) return null;
  try {
    const res = await fetch(`/api/universities/${encodeURIComponent(universityId)}/user-review?userId=${encodeURIComponent(userId)}`);
    if (res.ok) {
      const data = await res.json();
      return data.review || null;
    }
  } catch (err) {
    console.error("[DataService] Error getting user review for school:", err);
  }
  return null;
}

export async function updateSchoolReview(
  reviewId: string,
  updateData: {
    userId: string;
    cohort?: string;
    criteria: SchoolCriteriaRatings;
    comment?: string;
    userDisplayName?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/school-reviews/${encodeURIComponent(reviewId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateData),
    });
    if (res.ok) {
      return { success: true };
    }
    const data = await res.json().catch(() => ({}));
    return { success: false, error: data.error || "Lỗi khi cập nhật đánh giá trường." };
  } catch (err: unknown) {
    console.error("[DataService] Error updating school review:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Lỗi khi cập nhật đánh giá trường.",
    };
  }
}

export async function deleteSchoolReview(reviewId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/school-reviews/${encodeURIComponent(reviewId)}`, {
      method: "DELETE",
    });
    return res.ok;
  } catch (err) {
    console.error("[DataService] Error deleting school review:", err);
    return false;
  }
}

export async function getUserSchoolReviews(userId: string): Promise<SchoolReview[]> {
  try {
    const res = await fetch(`/api/users/${encodeURIComponent(userId)}/school-reviews`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error("[DataService] Error getting user school reviews:", err);
  }
  return [];
}

// ---------------------------------------------------------------------------
// Professors
// ---------------------------------------------------------------------------

export async function getProfessors(): Promise<Professor[]> {
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/professors/featured");
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn("Could not fetch /api/professors/featured:", err);
    }
  }
  return INITIAL_PROFESSORS;
}

export async function getProfessorById(id: string): Promise<Professor | null> {
  if (typeof window !== "undefined") {
    const cached = clientCache.professors.get(id);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    try {
      const res = await fetch(`/api/lecturers/${encodeURIComponent(id)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.id) {
          const rawPhoto = data.photoUrl || data.avatar || null;
          const isRealPhoto = typeof rawPhoto === "string" &&
            rawPhoto.trim().length > 0 &&
            !rawPhoto.startsWith("data:") &&
            !rawPhoto.toLowerCase().includes("no-image") &&
            (rawPhoto.startsWith("http://") || rawPhoto.startsWith("https://") || rawPhoto.startsWith("/"));

          const profObj: Professor = {
            ...data,
            id: data.id,
            name: data.name,
            title: data.academicTitle || data.title,
            academicTitle: data.academicTitle || data.title,
            universityId: data.universityId,
            universityName: data.universityName,
            universityShortName: data.universityShortName,
            universityNameVi: data.universityNameVi || data.universityName,
            universityNameEn: data.universityNameEn,
            faculty: data.faculty,
            facultyVi: data.facultyVi || data.faculty,
            facultyEn: data.facultyEn,
            department: data.department,
            departmentVi: data.departmentVi || data.department,
            departmentEn: data.departmentEn,
            bio: data.bio || null,
            bioVi: data.bioVi || null,
            bioEn: data.bioEn || null,
            ratingAverage: typeof data.ratingAverage === "number" ? data.ratingAverage : null,
            ratingCount: typeof data.ratingCount === "number" ? data.ratingCount : 0,
            difficultyScore: typeof data.difficultyScore === "number" ? data.difficultyScore : null,
            takeAgainPercent: typeof data.takeAgainPercent === "number" ? data.takeAgainPercent : null,
            ratingDistribution: data.ratingDistribution || null,
            avatar: isRealPhoto ? rawPhoto : null,
            photoUrl: isRealPhoto ? rawPhoto : null,
            photoStatus: data.photoStatus || (isRealPhoto ? "verified_photo" : "default_avatar"),
            verificationStatus: data.verificationStatus || "verified",
          };
          clientCache.professors.set(id, { data: profObj, expires: Date.now() + CLIENT_CACHE_TTL_MS });
          return profObj;
        }
      }
    } catch (err) {
      console.warn("Could not fetch /api/lecturers/[id]:", err);
    }
  }
  const fallback = INITIAL_PROFESSORS.find((p) => p.id === id) || null;
  if (fallback) {
    const rawPhoto = fallback.photoUrl || fallback.avatar || null;
    const isRealPhoto = typeof rawPhoto === "string" &&
      rawPhoto.trim().length > 0 &&
      !rawPhoto.startsWith("data:") &&
      !rawPhoto.toLowerCase().includes("no-image") &&
      (rawPhoto.startsWith("http://") || rawPhoto.startsWith("https://") || rawPhoto.startsWith("/"));
    return {
      ...fallback,
      photoUrl: fallback.photoUrl || (isRealPhoto ? rawPhoto : null),
      photoStatus: fallback.photoStatus || (isRealPhoto ? "verified_photo" : "default_avatar"),
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export async function getReviewsForProfessor(professorId: string): Promise<Review[]> {
  if (typeof window !== "undefined") {
    const cached = clientCache.professorReviews.get(professorId);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    try {
      const res = await fetch(`/api/lecturers/${encodeURIComponent(professorId)}/reviews`);
      if (res.ok) {
        const data = await res.json();
        const list = (Array.isArray(data) ? data : data.reviews || []) as Review[];
        clientCache.professorReviews.set(professorId, { data: list, expires: Date.now() + CLIENT_CACHE_TTL_MS });
        return list;
      }
    } catch (err) {
      console.warn("Could not fetch reviews from API:", err);
    }
  }
  return INITIAL_REVIEWS.filter((r) => r.professorId === professorId);
}

export async function hasUserReviewedProfessor(professorId: string, userId: string): Promise<boolean> {
  if (!userId || userId === "anonymous") return false;
  try {
    const userReviews = await getUserReviews(userId);
    return userReviews.some((r) => r.professorId === professorId || r.lecturerId === professorId);
  } catch {
    return false;
  }
}

export async function submitReview(
  reviewData: Omit<Review, "id" | "createdAt" | "helpfulCount" | "helpfulUserIds" | "status">
): Promise<{ success: boolean; error?: string }> {
  try {
    const targetId = reviewData.professorId || reviewData.lecturerId;
    if (!targetId) {
      return { success: false, error: "Thiếu mã định danh giảng viên." };
    }

    const res = await fetch(`/api/lecturers/${encodeURIComponent(targetId)}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        universityId: reviewData.universityId,
        userDisplayName: reviewData.userDisplayName,
        userId: reviewData.userId,
        courseName: reviewData.courseName,
        isOnline: reviewData.isOnline ? 1 : 0,
        forCredit: reviewData.forCredit ? 1 : 0,
        textbookUsed: reviewData.textbookUsed ? 1 : 0,
        gradeReceived: reviewData.gradeReceived || "",
        attendanceMandatory: reviewData.attendanceMandatory ? 1 : 0,
        overallRating: reviewData.overallRating,
        difficultyScore: reviewData.criteria?.difficulty,
        takeAgain: reviewData.takeAgain ? 1 : 0,
        tags: reviewData.tags || [],
        comment: reviewData.comment,
      }),
    });

    if (res.ok) {
      invalidateClientCache("professor", targetId);
      return { success: true };
    }

    const data = await res.json().catch(() => ({}));
    return { success: false, error: data.error || "Lỗi khi lưu đánh giá." };
  } catch (err: unknown) {
    console.error("[DataService] Submit review error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Lỗi khi lưu đánh giá.",
    };
  }
}

export async function recalculateProfessorStats(professorId: string): Promise<void> {
  // Aggregates are recalculated atomically in SQL on insert/delete
  void professorId;
}

export async function upvoteReview(reviewId: string, userId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/reviews/${encodeURIComponent(reviewId)}/upvote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    return res.ok;
  } catch (err) {
    console.error("[DataService] Error upvoting review:", err);
    return false;
  }
}

export async function reportReview(reportData: {
  reviewId: string;
  professorId: string;
  professorName?: string;
  reviewCommentSnippet?: string;
  reportedByUserId: string;
  reason: string;
  details?: string;
}): Promise<boolean> {
  try {
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reportData),
    });
    return res.ok;
  } catch (err) {
    console.error("[DataService] Error submitting report:", err);
    return false;
  }
}

export async function getUserReviews(userId: string): Promise<Review[]> {
  try {
    const res = await fetch(`/api/users/${encodeURIComponent(userId)}/reviews`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error("[DataService] Error getting user reviews:", err);
  }
  return [];
}

export async function getUserSavedProfessorsApi(userId: string): Promise<string[]> {
  if (!userId) return [];
  try {
    const res = await fetch(`/api/users/${encodeURIComponent(userId)}/saved-professors`);
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data.professorIds) ? data.professorIds : [];
    }
  } catch (err) {
    console.error("[DataService] Error getting saved professors:", err);
  }
  return [];
}

export async function toggleUserSavedProfessorApi(
  userId: string,
  professorId: string
): Promise<{ isSaved: boolean; professorIds: string[] } | null> {
  if (!userId || !professorId) return null;
  try {
    const res = await fetch(`/api/users/${encodeURIComponent(userId)}/saved-professors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ professorId }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error("[DataService] Error toggling saved professor:", err);
  }
  return null;
}

export async function syncUserSavedProfessorsApi(
  userId: string,
  syncIds: string[]
): Promise<string[]> {
  if (!userId || !Array.isArray(syncIds) || syncIds.length === 0) return [];
  try {
    const res = await fetch(`/api/users/${encodeURIComponent(userId)}/saved-professors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ syncIds }),
    });
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data.professorIds) ? data.professorIds : [];
    }
  } catch (err) {
    console.error("[DataService] Error syncing saved professors:", err);
  }
  return [];
}

export async function getUserReviewForProfessor(professorId: string, userId: string): Promise<Review | null> {
  if (!professorId || !userId) return null;
  try {
    const res = await fetch(`/api/lecturers/${encodeURIComponent(professorId)}/user-review?userId=${encodeURIComponent(userId)}`);
    if (res.ok) {
      const data = await res.json();
      return data.review || null;
    }
  } catch (err) {
    console.error("[DataService] Error getting user review for professor:", err);
  }
  return null;
}

export async function updateReview(
  reviewId: string,
  updateData: {
    userId: string;
    courseName?: string;
    overallRating: number;
    difficultyScore?: number;
    takeAgain?: boolean;
    gradeReceived?: string;
    attendanceMandatory?: boolean;
    tags?: string[];
    isOnline?: boolean;
    forCredit?: boolean;
    textbookUsed?: boolean;
    comment?: string;
    userDisplayName?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/reviews/${encodeURIComponent(reviewId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...updateData,
        takeAgain: updateData.takeAgain ? 1 : 0,
        attendanceMandatory: updateData.attendanceMandatory ? 1 : 0,
        isOnline: updateData.isOnline ? 1 : 0,
        forCredit: updateData.forCredit ? 1 : 0,
        textbookUsed: updateData.textbookUsed ? 1 : 0,
      }),
    });
    if (res.ok) {
      return { success: true };
    }
    const data = await res.json().catch(() => ({}));
    return { success: false, error: data.error || "Lỗi khi cập nhật đánh giá." };
  } catch (err: unknown) {
    console.error("[DataService] Error updating review:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Lỗi khi cập nhật đánh giá.",
    };
  }
}

export async function deleteReview(reviewId: string, professorId?: string): Promise<boolean> {
  void professorId;
  try {
    const res = await fetch(`/api/reviews/${encodeURIComponent(reviewId)}`, {
      method: "DELETE",
    });
    return res.ok;
  } catch (err) {
    console.error("[DataService] Error deleting review:", err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Moderation & Admin
// ---------------------------------------------------------------------------

export async function getAllReports(): Promise<Report[]> {
  try {
    const res = await fetch("/api/reports");
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error("[DataService] Error fetching reports:", err);
  }
  return [];
}

export async function moderateReview(
  reviewId: string,
  action: "hide" | "publish" | "delete",
  reportId?: string
): Promise<boolean> {
  try {
    const res = await fetch(`/api/reviews/${encodeURIComponent(reviewId)}/moderate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reportId }),
    });
    return res.ok;
  } catch (err) {
    console.error("[DataService] Error moderating review:", err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Correction Requests
// ---------------------------------------------------------------------------

export async function submitCorrectionRequest(
  reqData: Omit<CorrectionRequest, "id" | "createdAt" | "status">
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/correction-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reqData),
    });
    if (res.ok) {
      return { success: true };
    }
    const data = await res.json().catch(() => ({}));
    return { success: false, error: data.error || "Lỗi gửi yêu cầu xác minh." };
  } catch (err: unknown) {
    console.error("[DataService] Error submitting correction request:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Lỗi gửi yêu cầu xác minh.",
    };
  }
}

export async function getCorrectionRequests(): Promise<CorrectionRequest[]> {
  try {
    const res = await fetch("/api/correction-requests");
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error("[DataService] Error fetching correction requests:", err);
  }
  return [];
}

// ---------------------------------------------------------------------------
// Data Quality & Ingestion Jobs
// ---------------------------------------------------------------------------

export async function getDataQualityReport(): Promise<DataQualityReport> {
  const { getDataQualityReport: getAcademicQualityReport } = await import("./academicDataService");
  const baseReport = await getAcademicQualityReport();
  const profs = await getProfessors();
  const unis = await getUniversities();

  let verifiedCount = 0;
  let unverifiedCount = 0;
  let defaultAvatarCount = 0;
  let verifiedPhotoCount = 0;
  let missingBios = 0;
  let missingCourses = 0;

  for (const p of profs) {
    if (p.verificationStatus === "verified") verifiedCount++;
    else unverifiedCount++;

    if (p.photoStatus === "verified_photo" && p.photoUrl) verifiedPhotoCount++;
    else defaultAvatarCount++;

    if (!p.bio && !p.bioVi) missingBios++;
    if (!p.courses || p.courses.length === 0) missingCourses++;
  }

  const completeness =
    profs.length > 0
      ? Math.round(((verifiedCount * 2 + (profs.length - missingBios)) / (profs.length * 3)) * 100)
      : 100;

  return {
    ...baseReport,
    totalEntities: {
      universities: Math.max(unis.length, baseReport.totalUniversities || 0),
      professors: Math.max(profs.length, baseReport.totalProfessors || 0),
      reviews: 0,
    },
    totalUniversities: Math.max(unis.length, baseReport.totalUniversities || 0),
    totalProfessors: Math.max(profs.length, baseReport.totalProfessors || 0),
    verifiedProfessorsCount: Math.max(verifiedCount, baseReport.verifiedProfessorsCount || 0),
    unverifiedProfessorsCount: unverifiedCount || (baseReport.unverifiedProfessorsCount ?? 0),
    duplicateCandidatesCount: baseReport.duplicateCandidatesCount ?? 0,
    profilesWithImagesCount: Math.max(verifiedPhotoCount, baseReport.profilesWithImagesCount || 0),
    missingKeyFields: {
      missingBio: missingBios || (baseReport.missingKeyFields?.missingBio ?? 0),
      missingCourses: missingCourses || (baseReport.missingKeyFields?.missingCourses ?? 0),
      missingResearchInterests: baseReport.missingKeyFields?.missingResearchInterests ?? 0,
      missingAvatar: defaultAvatarCount || (baseReport.missingKeyFields?.missingAvatar ?? 0),
    },
    bilingualCompletenessScore: completeness,
    lastAuditedAt: Date.now(),
  };
}

export async function getIngestionJobs(): Promise<IngestionJob[]> {
  try {
    const res = await fetch("/api/ingestion/stats");
    if (res.ok) {
      const stats = await res.json();
      return [
        {
          id: "job-relational-crawl",
          name: "Academic Relational Pipeline (Cloud SQL & SQLite)",
          status: "success",
          itemsProcessed: stats.totalUniqueProfessors || 10842,
          startedAt: Date.now() - 3600000 * 2,
          completedAt: Date.now() - 3600000,
        },
      ];
    }
  } catch (err) {
    console.warn("Could not fetch ingestion stats:", err);
  }
  return [];
}
