export interface CriteriaRatings {
  teachingQuality: number; // 1-5 (Chất lượng giảng dạy)
  clarity: number;         // 1-5 (Độ rõ ràng & Dễ hiểu)
  gradingFairness: number; // 1-5 (Tính công bằng chấm điểm)
  difficulty: number;      // 1-5 (Khối lượng & Độ khó bài tập)
  communication: number;   // 1-5 (Khả năng tiếp cận & Hỗ trợ)
}

export type AcademicRank = 'GS' | 'PGS' | 'TS' | 'ThS' | 'GVC' | 'GV' | 'other';

export type PhotoStatus = 'verified_photo' | 'default_avatar' | 'pending_verification';

export type VerificationStatus = 'verified' | 'partially_verified' | 'unverified' | 'conflicting' | 'pending_review' | 'social_lead_unverified' | 'provisional';

export type SearchSortOption =
  | 'relevance'
  | 'rating_desc'
  | 'rating_asc'
  | 'reviews_desc'
  | 'difficulty_asc'
  | 'difficulty_desc'
  | 'name_asc'
  | 'recent_review';

export interface SearchPagination {
  page: number;
  pageSize: number;
  cursor?: string;
}

export interface SearchFilters {
  query?: string;
  universityIds?: string[];
  university?: string;
  name?: string;
  majorIds?: string[];
  major?: string;
  facultyIds?: string[];
  faculty?: string;
  departmentIds?: string[];
  courseIds?: string[];
  cityIds?: string[];
  academicTitles?: string[];
  academicRank?: string;
  minRating?: number;
  maxRating?: number;
  minReviewCount?: number;
  includeUnrated?: boolean;
  verificationStatuses?: VerificationStatus[];
  verificationStatus?: VerificationStatus;
  hasPhoto?: boolean;
  hasPublicProfile?: boolean;
  institutionType?: 'university' | 'academy' | 'college';
  researchInterests?: string[];
}

export interface FacetOption {
  id: string;
  value: string;
  label: string;
  sublabel?: string;
  count: number;
}

export interface SearchFacets {
  universities: FacetOption[];
  majors: FacetOption[];
  faculties: FacetOption[];
  departments: FacetOption[];
  courses: FacetOption[];
  cities: FacetOption[];
  academicTitles: FacetOption[];
  researchInterests: FacetOption[];
  verificationStatuses?: FacetOption[];
}

export interface SearchResult {
  items: Professor[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  nextCursor?: string;
  appliedFilters: SearchFilters;
  activeFilterCount: number;
  executionTimeMs: number;
}

export interface AutocompleteSuggestion {
  id: string;
  type: "lecturer" | "university";
  title: string;
  subtitle: string;
  universityShortName?: string;
  avatar?: string | null;
  photoUrl?: string | null;
  photoStatus?: PhotoStatus;
  ratingAverage?: number | null;
  ratingCount?: number;
}

export interface University {
  id: string;
  name?: string;
  shortName: string;
  city?: string;
  region?: 'Miền Bắc' | 'Miền Trung' | 'Miền Nam';
  description?: string;
  englishName?: string;
  nameVi?: string;
  nameEn?: string;
  cityVi?: string;
  cityEn?: string;
  regionVi?: 'Miền Bắc' | 'Miền Trung' | 'Miền Nam';
  regionEn?: 'Northern Vietnam' | 'Central Vietnam' | 'Southern Vietnam';
  descriptionVi?: string;
  descriptionEn?: string;
  aliasesVi?: string[];
  aliasesEn?: string[];
  officialWebsite?: string;
  officialDomain?: string;
  logoUrl?: string;
  coverImage?: string;
  faculties?: string[];
  facultiesVi?: string[];
  facultiesEn?: string[];
  facultyDirectoryUrls?: string[];
  staffDirectoryUrls?: string[];
  researchInstituteUrls?: string[];
  courseCatalogUrls?: string[];
  sourceUrls?: string[];
  verifiedSocialLinks?: { platform: string; url: string; verified: boolean }[];
  ratingAverage?: number | null;
  totalReviews?: number;
  totalProfessors?: number;
  sourceEvidence?: {
    sourceUrl?: string;
    nameViSource?: string;
    nameEnSource?: string;
    descriptionSource?: string;
    verificationDate?: string;
  };
  institutionType?: 'university' | 'academy' | 'college';
  translationStatus?: 'official' | 'verified_bilingual' | 'community_contributed' | 'fallback';
  schoolCriteriaAverages?: SchoolCriteriaRatings | null;
  officialCode?: string | null;
  officialCodeSource?: string | null;
  officialCodeVerifiedAt?: number | null;
  officialCodeStatus?: 'verified' | 'unverified' | 'conflicting' | 'not_found' | 'needs_review';
  commonAbbreviations?: string[];
  externalIdentifiers?: Record<string, string>;
  sourceUrl?: string;
  sourceId?: string;
  importBatchId?: string;
}

export interface SchoolCriteriaRatings {
  reputation: number;    // 1-5 (Danh tiếng)
  location: number;      // 1-5 (Vị trí)
  opportunities: number; // 1-5 (Cơ hội)
  facilities: number;    // 1-5 (Cơ sở vật chất)
  internet: number;      // 1-5 (Internet)
  food: number;          // 1-5 (Ẩm thực)
  clubs: number;         // 1-5 (CLB)
  social: number;        // 1-5 (Đời sống xã hội)
  happiness: number;     // 1-5 (Hạnh phúc)
  safety: number;        // 1-5 (An toàn)
}

export interface SchoolReview {
  id: string;
  universityId: string;
  universityName?: string;
  userId: string;
  userDisplayName: string;
  cohort?: string;
  criteria: SchoolCriteriaRatings;
  overallRating: number; // 1-5
  comment: string;
  helpfulCount: number;
  helpfulUserIds?: string[];
  status: 'published' | 'pending' | 'flagged' | 'hidden';
  createdAt: number;
}

export interface Faculty {
  id: string;
  universityId: string;
  name: string;
  nameEn?: string;
  websiteUrl?: string;
  directoryUrl?: string;
  deanName?: string;
  departments: string[];
}

export interface Department {
  id: string;
  facultyId: string;
  universityId: string;
  name: string;
  nameEn?: string;
  headName?: string;
}

export interface AcademicPublication {
  id: string;
  professorId: string;
  title: string;
  authors?: string[];
  year?: number;
  venue?: string; // Journal / Conference
  doi?: string;
  url?: string;
  citationCount?: number;
}

export interface Course {
  id: string;
  universityId: string;
  code?: string;
  name: string;
  nameEn?: string;
  facultyId?: string;
  description?: string;
  syllabusUrl?: string;
}

export interface ProfessorCourse {
  id: string;
  professorId: string;
  courseId: string;
  semester?: string;
  year?: number;
  role?: 'giang_vien_chinh' | 'tro_giang' | 'dong_giang_day';
}

export interface ImageAsset {
  id: string;
  professorId?: string;
  sourceUrl: string;
  storageUrl?: string;
  licenseCategory: 'official_academic_public' | 'open_license' | 'fair_use_educational' | 'restricted' | 'unknown';
  permissionStatus: 'approved' | 'pending_review' | 'rejected';
  storageMode: 'gcp_storage' | 'source_url' | 'neutral_placeholder';
  verifiedAt?: number;
  sha256?: string;
}

export interface FieldProvenance {
  field: string;
  sourceUrl: string;
  sourceName?: string;
  sourceType: 'official_faculty_page' | 'university_portal' | 'pdf_directory' | 'authorized_social_lead' | 'manual_verified' | 'publication_repository' | 'other';
  extractedTextExcerpt?: string;
  retrievedAt: number;
  lastVerifiedAt?: number;
  extractionMethod: 'direct_crawl' | 'rag_pipeline' | 'structured_jsonld' | 'manual_entry';
  verificationStatus: VerificationStatus;
  confidenceScore?: number;
  conflictingEvidence?: {
    sourceUrl: string;
    sourceName?: string;
    excerpt?: string;
    value: string;
  }[];
}

export interface SourceRecord {
  id: string;
  url: string;
  domain: string;
  title: string;
  institution: string;
  retrievedAt: number;
  lastVerifiedAt?: number;
  reliability: 'official_primary' | 'institutional_repository' | 'secondary';
  sourceType?: string;
  fetchedAt?: number;
  sourceName?: string;
  excerpt?: string;
  sourceUrl?: string;
}

export interface CorrectionRequest {
  id: string;
  professorId: string;
  professorName: string;
  universityId: string;
  requestType: 'correction' | 'removal' | 'conflict_report';
  targetField?: string;
  currentValue?: string;
  proposedValue?: string;
  evidenceUrl: string;
  notes: string;
  contactEmail?: string;
  createdAt: number;
  status: 'pending' | 'reviewed' | 'resolved' | 'rejected';
}

export interface ProvenanceEvidence {
  field: string;
  sourceUrl: string;
  extractedAt: number;
  confidence: number;
  sourceType: 'official_faculty_page' | 'university_portal' | 'pdf_directory' | 'authorized_social_lead' | 'manual_verified';
}

export interface Professor {
  id: string;
  name: string;
  slug?: string;
  normalizedName?: string;
  fullName?: string;
  nameVariants?: string[];
  englishName?: string;
  universityIds?: string[];
  majorIds?: string[];
  facultyIds?: string[];
  departmentIds?: string[];
  courseIds?: string[];
  cityIds?: string[];
  title?: string | null; // 'PGS. TS', 'TS', 'ThS', 'GV', etc.
  titleVi?: string | null;
  titleEn?: string | null;
  academicTitle?: string | null;
  academicRank?: AcademicRank | null;
  position?: string | null;
  professionalPosition?: string | null;
  universityId: string;
  universityName?: string;
  universityShortName: string;
  universityNameVi?: string;
  universityNameEn?: string;
  faculty?: string | null;
  facultyVi?: string | null;
  facultyEn?: string | null;
  department?: string | null;
  departmentVi?: string | null;
  departmentEn?: string | null;
  facultyId?: string;
  departmentId?: string;
  avatar?: string | null;
  photoUrl?: string | null;
  photoStatus?: PhotoStatus;
  hasPhoto?: boolean;
  hasPublicProfile?: boolean;
  bio?: string | null;
  bioVi?: string | null;
  bioEn?: string | null;
  courses?: string[] | null;
  coursesVi?: string[] | null;
  coursesEn?: string[] | null;
  qualifications?: { degree: string; institution: string; year?: number }[] | null;
  researchInterests?: string[] | null;
  researchInterestsVi?: string[] | null;
  researchInterestsEn?: string[] | null;
  publications?: AcademicPublication[];
  officialProfileUrls?: string[];
  identifiers?: {
    orcid?: string;
    googleScholar?: string;
    scopus?: string;
    institutionalEmail?: string;
    staffCode?: string;
    [key: string]: string | undefined;
  };
  imageRights?: {
    sourceUrl: string;
    licenseCategory: string;
    permissionStatus: 'approved' | 'pending_review' | 'rejected';
  };
  provenance?: ProvenanceEvidence[];
  fieldProvenances?: Record<string, FieldProvenance>;
  sources?: SourceRecord[];
  isConflictFlagged?: boolean;
  previousAffiliations?: { universityId: string; role: string; period: string }[];
  verificationStatus?: VerificationStatus;
  confidenceScore?: number;
  lastVerifiedAt?: number;
  ratingAverage: number | null; // null if 0 reviews
  averageRating?: number | null;
  ratingCount: number;
  publishedReviewCount?: number;
  ratingAggregateUpdatedAt?: number;
  updatedAt?: number;
  ratingDistribution?: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  } | null;
  criteriaAverages?: CriteriaRatings | null;
  featured?: boolean;
  trending?: boolean;
  featuredQuote?: string | null;
  featuredQuoteVi?: string | null;
  featuredQuoteEn?: string | null;
  takeAgainPercent?: number | null;
  difficultyScore?: number | null;
  difficultyAverage?: number | null;
  sourceUrls?: string[];
}

export interface Review {
  id: string;
  professorId: string;
  lecturerId?: string;
  professorName: string;
  universityId: string;
  userId: string;
  userDisplayName: string; // Pseudonymous e.g. "Sinh viên K64 - CNTT"
  courseName: string;
  isOnline?: boolean;
  forCredit?: boolean;
  textbookUsed?: boolean;
  gradeReceived?: string; // 'A', 'B+', 'B', 'C', 'Đạt', 'Qua môn'
  attendanceMandatory: boolean;
  takeAgain: boolean;
  overallRating: number; // 1 - 5
  criteria: CriteriaRatings;
  comment: string;
  reviewLanguage?: 'vi' | 'en';
  translatedCommentVi?: string;
  translatedCommentEn?: string;
  tags: string[];
  createdAt: number; // epoch ms
  updatedAt?: number;
  helpfulCount: number;
  helpfulUserIds: string[];
  status: 'published' | 'pending' | 'flagged' | 'hidden';
}

export interface Report {
  id: string;
  reviewId: string;
  professorId: string;
  professorName?: string;
  universityName?: string;
  universityShortName?: string;
  reviewCommentSnippet?: string;
  reviewFullComment?: string;
  courseName?: string;
  overallRating?: number;
  difficultyScore?: number;
  takeAgain?: boolean;
  gradeReceived?: string | null;
  attendanceMandatory?: boolean;
  reviewerName?: string;
  reviewStatus?: string;
  reviewCreatedAt?: number;
  reportedByUserId: string;
  reason: string;
  details?: string;
  createdAt: number;
  status: 'pending' | 'resolved' | 'dismissed';
}
export type AccountStatus = 'active' | 'locked' | 'suspended' | 'pending_deletion' | 'deleted';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
  role?: 'student' | 'admin' | 'moderator' | 'super_admin' | 'support' | 'security';
  status?: 'active' | 'locked' | 'suspended' | 'pending_deletion' | 'deleted';
  lockReason?: string | null;
  lockedAt?: number | null;
  deletionRequestedAt?: number | null;
  deletionScheduledAt?: number | null;
  university?: string;
  cohort?: string;
  firstName?: string;
  lastName?: string;
  school?: string;
  fieldOfStudy?: string;
  expectedGraduationYear?: string | number;
}

export interface AcademicTerminologyItem {
  canonicalId: string;
  termVi: string;
  termEn: string;
  aliasesVi: string[];
  aliasesEn: string[];
  category: 'major' | 'faculty' | 'department' | 'keyword';
}

export interface SourceRegistryItem {
  id: string;
  universityId: string;
  sourceType: 'official_homepage' | 'faculty_directory' | 'staff_profile' | 'course_catalog' | 'authorized_social_export';
  url: string;
  domain: string;
  crawlPolicy: 'allowed' | 'disallowed_robots' | 'requires_auth' | 'manual_only';
  status: 'active' | 'pending_crawl' | 'crawled' | 'failed' | 'rate_limited';
  lastCrawledAt?: number;
  etag?: string;
  contentHash?: string;
  failureCount: number;
  lastErrorMessage?: string;
}

export interface SourceDocument {
  id: string;
  sourceUrl: string;
  domain: string;
  fetchedAt: number;
  contentHash: string;
  httpStatus: number;
  title?: string;
  extractedTextLength: number;
  entitiesExtractedCount: number;
  structuredJsonLd?: boolean;
}

export interface EntityMatchCandidate {
  id: string;
  sourceProfessorId: string;
  candidateProfessorId: string;
  sourceName: string;
  candidateName: string;
  sourceUniversity: string;
  candidateUniversity: string;
  matchScore: number; // 0.0 to 1.0
  matchReasons: string[];
  status: 'pending' | 'merged' | 'rejected' | 'dismissed';
  detectedAt: number;
  resolvedAt?: number;
  resolvedBy?: string;
}

export interface DataQualityReport {
  id?: string;
  generatedAt?: number;
  totalEntities?: {
    universities: number;
    professors: number;
    reviews: number;
  };
  totalUniversities?: number;
  universitiesWithRegisteredDomains?: number;
  totalFaculties?: number;
  totalProfessors?: number;
  verifiedProfessorsCount?: number;
  unverifiedProfessorsCount?: number;
  duplicateCandidatesCount?: number;
  profilesWithImagesCount?: number;
  imagesPendingReviewCount?: number;
  missingKeyFields?: {
    missingBio: number;
    missingCourses: number;
    missingResearchInterests: number;
    missingAvatar: number;
  };
  coverageByRegion?: {
    north: { universities: number; professors: number };
    central: { universities: number; professors: number };
    south: { universities: number; professors: number };
  };
  sourcesHealth?: {
    active: number;
    failed: number;
    rateLimited: number;
    pending?: number;
  };
  bilingualCompletenessScore?: number;
  missingEnglishBiosCount?: number;
  missingEnglishTitlesCount?: number;
  verifiedOfficialNameCount?: number;
  lastAuditedAt?: number;
  lastSuccessfulIngestionDate?: number;
}

export interface IngestionJob {
  id: string;
  name: string;
  status: 'success' | 'running' | 'failed';
  itemsProcessed: number;
  startedAt: number;
  completedAt?: number;
  errorDetails?: string;
}

export interface IngestionRun {
  id: string;
  runType: 'discovery' | 'full_pilot' | 'single_university' | 'incremental';
  startedAt: number;
  completedAt?: number;
  status: 'running' | 'completed' | 'failed';
  universitiesProcessed: number;
  professorsExtracted: number;
  professorsUpdated: number;
  sourcesCrawled: number;
  errorsLogged: string[];
}

export interface RagCitation {
  sourceUrl: string;
  sourceTitle: string;
  universityName?: string;
  extractedAt?: number;
  snippet?: string;
  confidence?: number;
}

export interface RagQueryRequest {
  query: string;
  filters?: {
    universityId?: string;
    city?: string;
    region?: string;
    academicRank?: string;
    topic?: string;
  };
}

export interface RagQueryResponse {
  answer: string;
  citations: RagCitation[];
  groundingConfidence: number;
  isGrounded: boolean;
  relatedProfessors: {
    id: string;
    name: string;
    academicTitle?: string;
    universityShortName: string;
    faculty: string;
    ratingAverage: number;
    avatar: string;
    officialProfileUrl?: string;
    verificationStatus?: string;
  }[];
  queryLanguage: 'vi' | 'en';
}
