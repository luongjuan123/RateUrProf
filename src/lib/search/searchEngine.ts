import {
  Professor,
  SearchFilters,
  SearchSortOption,
  SearchPagination,
  SearchResult,
  SearchFacets,
  FacetOption,
} from "@/types";
import {
  normalizeSearchString,
  tokenizeVietnamese,
  generateNameVariants,
  matchesSearchQuery,
  matchesProfessorName,
  computeRelevanceScore,
} from "./vietnameseNormalizer";

export class SearchEngine {
  private professors: Map<string, Professor> = new Map();

  // Inverted indexes
  private tokenIndex: Map<string, Set<string>> = new Map();
  private universityIndex: Map<string, Set<string>> = new Map();
  private majorIndex: Map<string, Set<string>> = new Map();
  private facultyIndex: Map<string, Set<string>> = new Map();
  private departmentIndex: Map<string, Set<string>> = new Map();
  private courseIndex: Map<string, Set<string>> = new Map();
  private cityIndex: Map<string, Set<string>> = new Map();
  private titleIndex: Map<string, Set<string>> = new Map();
  private interestIndex: Map<string, Set<string>> = new Map();
  private verificationIndex: Map<string, Set<string>> = new Map();

  constructor() {}

  /**
   * Resets all internal indices.
   */
  public clear(): void {
    this.professors.clear();
    this.tokenIndex.clear();
    this.universityIndex.clear();
    this.majorIndex.clear();
    this.facultyIndex.clear();
    this.departmentIndex.clear();
    this.courseIndex.clear();
    this.cityIndex.clear();
    this.titleIndex.clear();
    this.interestIndex.clear();
    this.verificationIndex.clear();
  }

  /**
   * Adds or updates a professor record in the search engine index.
   */
  public indexProfessor(prof: Professor): void {
    if (!prof || !prof.id) return;

    // If professor already indexed, remove old index references first
    if (this.professors.has(prof.id)) {
      this.removeProfessor(prof.id);
    }

    // Ensure normalized fields are populated
    const fullName = prof.fullName || prof.name || "";
    const normalizedName = prof.normalizedName || normalizeSearchString(fullName);
    const nameVariants = prof.nameVariants || [fullName, normalizedName];
    const revCount = prof.publishedReviewCount ?? prof.ratingCount ?? 0;
    const avgRating = (revCount > 0 && prof.averageRating !== null && prof.averageRating !== undefined)
      ? prof.averageRating
      : (revCount > 0 && prof.ratingAverage !== null && prof.ratingAverage !== undefined ? prof.ratingAverage : null);

    const universityIds = Array.from(
      new Set([
        ...(prof.universityIds || []),
        ...(prof.universityId ? [prof.universityId] : []),
      ])
    );

    const facultyIds = Array.from(
      new Set([
        ...(prof.facultyIds || []),
        ...(prof.faculty ? [prof.faculty] : []),
      ])
    );

    const departmentIds = Array.from(
      new Set([
        ...(prof.departmentIds || []),
        ...(prof.department ? [prof.department] : []),
      ])
    );

    const enrichedProf: Professor = {
      ...prof,
      fullName,
      name: fullName,
      normalizedName,
      nameVariants,
      universityIds,
      facultyIds,
      departmentIds,
      majorIds: prof.majorIds || [],
      courseIds: prof.courseIds || [],
      cityIds: prof.cityIds || [],
      researchInterests: prof.researchInterests || [],
      averageRating: avgRating,
      ratingAverage: avgRating,
      publishedReviewCount: revCount,
      ratingCount: revCount,
      verificationStatus: prof.verificationStatus || "verified",
      hasPublicProfile: prof.hasPublicProfile ?? true,
      hasPhoto: prof.hasPhoto ?? Boolean(prof.avatar && prof.avatar.trim().length > 0),
    };

    const id = enrichedProf.id;
    this.professors.set(id, enrichedProf);

    // 1. Index tokens for free-text search
    const textPool = [
      fullName,
      ...nameVariants,
      enrichedProf.title,
      enrichedProf.academicTitle || "",
      enrichedProf.professionalPosition || "",
      enrichedProf.universityName,
      enrichedProf.universityShortName,
      enrichedProf.faculty,
      enrichedProf.department || "",
      ...(enrichedProf.courses || []),
      ...(enrichedProf.researchInterests || []),
      ...(enrichedProf.cityIds || []),
    ].join(" ");

    const tokens = tokenizeVietnamese(textPool);
    for (const tok of tokens) {
      if (!this.tokenIndex.has(tok)) {
        this.tokenIndex.set(tok, new Set());
      }
      this.tokenIndex.get(tok)!.add(id);
    }

    // 2. Index Universities (Multi-affiliation support)
    for (const uId of universityIds) {
      const uNorm = uId.toLowerCase();
      if (!this.universityIndex.has(uNorm)) {
        this.universityIndex.set(uNorm, new Set());
      }
      this.universityIndex.get(uNorm)!.add(id);
    }

    // 3. Index Majors
    for (const mId of enrichedProf.majorIds || []) {
      const mNorm = mId.toLowerCase();
      if (!this.majorIndex.has(mNorm)) {
        this.majorIndex.set(mNorm, new Set());
      }
      this.majorIndex.get(mNorm)!.add(id);
    }

    // 4. Index Faculties
    for (const fId of facultyIds) {
      const fNorm = normalizeSearchString(fId);
      if (!this.facultyIndex.has(fNorm)) {
        this.facultyIndex.set(fNorm, new Set());
      }
      this.facultyIndex.get(fNorm)!.add(id);
    }

    // 5. Index Departments
    for (const dId of departmentIds) {
      const dNorm = normalizeSearchString(dId);
      if (!this.departmentIndex.has(dNorm)) {
        this.departmentIndex.set(dNorm, new Set());
      }
      this.departmentIndex.get(dNorm)!.add(id);
    }

    // 6. Index Courses
    for (const c of [...(enrichedProf.courses || []), ...(enrichedProf.courseIds || [])]) {
      const cNorm = normalizeSearchString(c);
      if (!this.courseIndex.has(cNorm)) {
        this.courseIndex.set(cNorm, new Set());
      }
      this.courseIndex.get(cNorm)!.add(id);
    }

    // 7. Index Cities
    for (const city of enrichedProf.cityIds || []) {
      const cityNorm = normalizeSearchString(city);
      if (!this.cityIndex.has(cityNorm)) {
        this.cityIndex.set(cityNorm, new Set());
      }
      this.cityIndex.get(cityNorm)!.add(id);
    }

    // 8. Index Academic Titles
    const rawTitle = enrichedProf.academicTitle || enrichedProf.title;
    if (rawTitle) {
      const tNorm = normalizeSearchString(rawTitle);
      if (!this.titleIndex.has(tNorm)) {
        this.titleIndex.set(tNorm, new Set());
      }
      this.titleIndex.get(tNorm)!.add(id);
    }

    // 9. Index Research Interests
    for (const ri of enrichedProf.researchInterests || []) {
      const riNorm = normalizeSearchString(ri);
      if (!this.interestIndex.has(riNorm)) {
        this.interestIndex.set(riNorm, new Set());
      }
      this.interestIndex.get(riNorm)!.add(id);
    }

    // 10. Index Verification Status
    const vStatus = (enrichedProf.verificationStatus || "verified").toLowerCase();
    if (!this.verificationIndex.has(vStatus)) {
      this.verificationIndex.set(vStatus, new Set());
    }
    this.verificationIndex.get(vStatus)!.add(id);
  }

  /**
   * Bulk indexes an array of professors.
   */
  public bulkIndex(professors: Professor[]): void {
    for (const p of professors) {
      this.indexProfessor(p);
    }
  }

  /**
   * Removes a professor from all indexes.
   */
  public removeProfessor(id: string): void {
    this.professors.delete(id);

    // Remove from inverted indices
    const removeFromMap = (map: Map<string, Set<string>>) => {
      for (const set of map.values()) {
        set.delete(id);
      }
    };

    removeFromMap(this.tokenIndex);
    removeFromMap(this.universityIndex);
    removeFromMap(this.majorIndex);
    removeFromMap(this.facultyIndex);
    removeFromMap(this.departmentIndex);
    removeFromMap(this.courseIndex);
    removeFromMap(this.cityIndex);
    removeFromMap(this.titleIndex);
    removeFromMap(this.interestIndex);
    removeFromMap(this.verificationIndex);
  }

  /**
   * Executes multi-criteria search with strict AND/OR semantics,
   * diacritic-insensitive matching, rating exclusion, sorting, and pagination.
   */
  public search(
    filters: SearchFilters = {},
    sort: SearchSortOption = "relevance",
    pagination: SearchPagination = { page: 1, pageSize: 12 }
  ): SearchResult {
    const startTime = performance.now();
    let candidateIds: Set<string> | null = null;

    // Helper to intersect candidate sets (AND logic across categories)
    const intersect = (newSet: Set<string>) => {
      if (candidateIds === null) {
        candidateIds = new Set(newSet);
      } else {
        const intersection = new Set<string>();
        for (const id of candidateIds) {
          if (newSet.has(id)) {
            intersection.add(id);
          }
        }
        candidateIds = intersection;
      }
    };

    // 1. Free-Text Search (`query`)
    const query = filters.query?.trim();
    if (query) {
      const qTokens = tokenizeVietnamese(query);
      const queryMatchSet = new Set<string>();

      // Check all professors for free-text match
      for (const [id, prof] of this.professors.entries()) {
        const fullName = prof.fullName || prof.name || "";
        const variants = prof.nameVariants || [];
        const uniName = prof.universityName || "";
        const uniShort = prof.universityShortName || "";
        const faculty = prof.faculty || "";
        const dept = prof.department || "";
        const courses = prof.courses || [];
        const interests = prof.researchInterests || [];

        // Full text match
        const isMatch =
          matchesSearchQuery(fullName, query) ||
          variants.some((v) => matchesSearchQuery(v, query)) ||
          matchesSearchQuery(uniName, query) ||
          matchesSearchQuery(uniShort, query) ||
          matchesSearchQuery(faculty, query) ||
          matchesSearchQuery(dept, query) ||
          courses.some((c) => matchesSearchQuery(c, query)) ||
          interests.some((ri) => matchesSearchQuery(ri, query));

        if (isMatch) {
          queryMatchSet.add(id);
        } else if (qTokens.length > 0) {
          // Token intersection match
          const allTokensFound = qTokens.every((tok) => {
            const tokenMatches = this.tokenIndex.get(tok);
            if (tokenMatches && tokenMatches.has(id)) return true;
            for (const [indexedTok, ids] of this.tokenIndex.entries()) {
              if (indexedTok.startsWith(tok) && ids.has(id)) return true;
            }
            return false;
          });
          if (allTokensFound) {
            queryMatchSet.add(id);
          }
        }
      }
      intersect(queryMatchSet);
    }

    // 2. Specific Professor Name Filter (`name`)
    const nameFilter = filters.name?.trim();
    if (nameFilter) {
      const nameMatchSet = new Set<string>();
      for (const [id, prof] of this.professors.entries()) {
        const fullName = prof.fullName || prof.name || "";
        const variants = prof.nameVariants || [];
        if (matchesProfessorName(fullName, variants, nameFilter)) {
          nameMatchSet.add(id);
        }
      }
      intersect(nameMatchSet);
    }

    // 3. University Filter (`universityIds` - OR within category)
    if (filters.universityIds && filters.universityIds.length > 0) {
      const uniMatches = new Set<string>();
      for (const [id, prof] of this.professors.entries()) {
        const profUnis = prof.universityIds || [prof.universityId];
        const matchesUni = filters.universityIds.some((uId) => {
          const uNorm = uId.toLowerCase();
          return profUnis.some((pU) => pU.toLowerCase() === uNorm);
        });
        if (matchesUni) {
          uniMatches.add(id);
        }
      }
      intersect(uniMatches);
    }

    // 4. Major Filter (`majorIds` - OR within category)
    if (filters.majorIds && filters.majorIds.length > 0) {
      const majorMatches = new Set<string>();
      for (const [id, prof] of this.professors.entries()) {
        const profMajors = prof.majorIds || [];
        const matchesMajor = filters.majorIds.some((mId) => {
          const mNorm = mId.toLowerCase();
          return profMajors.some((pM) => pM.toLowerCase() === mNorm);
        });
        if (matchesMajor) {
          majorMatches.add(id);
        }
      }
      intersect(majorMatches);
    }

    // 5. Faculty Filter (`facultyIds` - OR within category)
    if (filters.facultyIds && filters.facultyIds.length > 0) {
      const facMatches = new Set<string>();
      for (const [id, prof] of this.professors.entries()) {
        const profFacs = prof.facultyIds || (prof.faculty ? [prof.faculty] : []);
        const matchesFac = filters.facultyIds.some((fId) => {
          const fNorm = normalizeSearchString(fId);
          return profFacs.some((pF) => pF && (normalizeSearchString(pF) === fNorm || normalizeSearchString(pF).includes(fNorm)));
        });
        if (matchesFac) {
          facMatches.add(id);
        }
      }
      intersect(facMatches);
    }

    // 6. Department Filter (`departmentIds` - OR within category)
    if (filters.departmentIds && filters.departmentIds.length > 0) {
      const deptMatches = new Set<string>();
      for (const [id, prof] of this.professors.entries()) {
        const profDepts = prof.departmentIds || (prof.department ? [prof.department] : []);
        const matchesDept = filters.departmentIds.some((dId) => {
          const dNorm = normalizeSearchString(dId);
          return profDepts.some((pD) => normalizeSearchString(pD) === dNorm || normalizeSearchString(pD).includes(dNorm));
        });
        if (matchesDept) {
          deptMatches.add(id);
        }
      }
      intersect(deptMatches);
    }

    // 7. Course Filter (`courseIds` - OR within category)
    if (filters.courseIds && filters.courseIds.length > 0) {
      const courseMatches = new Set<string>();
      for (const [id, prof] of this.professors.entries()) {
        const profCourses = [
          ...(prof.courses || []),
          ...(prof.courseIds || []),
        ];
        const matchesCourse = filters.courseIds.some((cId) => {
          const cNorm = normalizeSearchString(cId);
          return profCourses.some((pC) => {
            const pNorm = normalizeSearchString(pC);
            return pNorm === cNorm || pNorm.includes(cNorm);
          });
        });
        if (matchesCourse) {
          courseMatches.add(id);
        }
      }
      intersect(courseMatches);
    }

    // 8. City Filter (`cityIds` - OR within category)
    if (filters.cityIds && filters.cityIds.length > 0) {
      const cityMatches = new Set<string>();
      for (const [id, prof] of this.professors.entries()) {
        const profCities = prof.cityIds || [];
        const matchesCity = filters.cityIds.some((cId) => {
          const cNorm = normalizeSearchString(cId);
          return profCities.some((pC) => normalizeSearchString(pC) === cNorm);
        });
        if (matchesCity) {
          cityMatches.add(id);
        }
      }
      intersect(cityMatches);
    }

    // 9. Academic Titles Filter (`academicTitles` - OR within category)
    if (filters.academicTitles && filters.academicTitles.length > 0) {
      const titleMatches = new Set<string>();
      for (const [id, prof] of this.professors.entries()) {
        const profTitle = prof.academicTitle || prof.title || "";
        const matchesTitle = filters.academicTitles.some((t) => {
          const tNorm = normalizeSearchString(t);
          return normalizeSearchString(profTitle).includes(tNorm);
        });
        if (matchesTitle) {
          titleMatches.add(id);
        }
      }
      intersect(titleMatches);
    }

    // 10. Research Interests Filter (`researchInterests` - OR within category)
    if (filters.researchInterests && filters.researchInterests.length > 0) {
      const riMatches = new Set<string>();
      for (const [id, prof] of this.professors.entries()) {
        const profInterests = prof.researchInterests || [];
        const matchesRI = filters.researchInterests.some((ri) => {
          const riNorm = normalizeSearchString(ri);
          return profInterests.some((pRI) => {
            const pNorm = normalizeSearchString(pRI);
            return pNorm === riNorm || pNorm.includes(riNorm);
          });
        });
        if (matchesRI) {
          riMatches.add(id);
        }
      }
      intersect(riMatches);
    }

    // 11. Rating Range Filters (`minRating`, `maxRating`, `includeUnrated`)
    const hasMinRating = typeof filters.minRating === "number" && filters.minRating > 0;
    const hasMaxRating = typeof filters.maxRating === "number" && filters.maxRating > 0;
    const includeUnrated = Boolean(filters.includeUnrated);

    if (hasMinRating || hasMaxRating) {
      const min = hasMinRating ? filters.minRating! : 1.0;
      const max = hasMaxRating ? filters.maxRating! : 5.0;
      const ratingMatches = new Set<string>();

      for (const [id, prof] of this.professors.entries()) {
        const reviewCount = prof.publishedReviewCount ?? prof.ratingCount ?? 0;
        const rating = prof.averageRating ?? prof.ratingAverage ?? 0;
        const isUnrated = reviewCount === 0;

        if (isUnrated) {
          // If includeUnrated is true, keep them; otherwise exclude
          if (includeUnrated) {
            ratingMatches.add(id);
          }
        } else {
          // Compare rating
          if (rating >= min && rating <= max) {
            ratingMatches.add(id);
          }
        }
      }
      intersect(ratingMatches);
    }

    // 12. Minimum Review Count Filter (`minReviewCount`)
    if (typeof filters.minReviewCount === "number" && filters.minReviewCount > 0) {
      const reviewCountMatches = new Set<string>();
      for (const [id, prof] of this.professors.entries()) {
        const revCount = prof.publishedReviewCount ?? prof.ratingCount ?? 0;
        if (revCount >= filters.minReviewCount) {
          reviewCountMatches.add(id);
        }
      }
      intersect(reviewCountMatches);
    }

    // 13. Verification Status Filter (`verificationStatuses`)
    if (filters.verificationStatuses && filters.verificationStatuses.length > 0) {
      const vStatuses = filters.verificationStatuses.map((s) => s.toLowerCase());
      const vMatches = new Set<string>();
      for (const [id, prof] of this.professors.entries()) {
        const status = (prof.verificationStatus || "verified").toLowerCase();
        if (vStatuses.includes(status)) {
          vMatches.add(id);
        }
      }
      intersect(vMatches);
    }

    // 14. Availability of Photo / Profile
    if (filters.hasPhoto) {
      const photoMatches = new Set<string>();
      for (const [id, prof] of this.professors.entries()) {
        if (prof.hasPhoto || (prof.avatar && prof.avatar.trim().length > 0)) {
          photoMatches.add(id);
        }
      }
      intersect(photoMatches);
    }

    if (filters.hasPublicProfile) {
      const profileMatches = new Set<string>();
      for (const [id, prof] of this.professors.entries()) {
        if (prof.hasPublicProfile !== false) {
          profileMatches.add(id);
        }
      }
      intersect(profileMatches);
    }

    // If no filters were applied at all, all professors are candidates
    const finalIds = candidateIds !== null ? candidateIds : new Set(this.professors.keys());

    // Materialize candidate objects
    const candidates: Professor[] = [];
    for (const id of finalIds) {
      const p = this.professors.get(id);
      if (p) candidates.push(p);
    }

    // Compute active filter count
    let activeFilterCount = 0;
    if (query) activeFilterCount++;
    if (nameFilter) activeFilterCount++;
    if (filters.universityIds && filters.universityIds.length > 0) activeFilterCount += filters.universityIds.length;
    if (filters.majorIds && filters.majorIds.length > 0) activeFilterCount += filters.majorIds.length;
    if (filters.facultyIds && filters.facultyIds.length > 0) activeFilterCount += filters.facultyIds.length;
    if (filters.departmentIds && filters.departmentIds.length > 0) activeFilterCount += filters.departmentIds.length;
    if (filters.courseIds && filters.courseIds.length > 0) activeFilterCount += filters.courseIds.length;
    if (filters.cityIds && filters.cityIds.length > 0) activeFilterCount += filters.cityIds.length;
    if (filters.academicTitles && filters.academicTitles.length > 0) activeFilterCount += filters.academicTitles.length;
    if (filters.researchInterests && filters.researchInterests.length > 0) activeFilterCount += filters.researchInterests.length;
    if (hasMinRating) activeFilterCount++;
    if (hasMaxRating) activeFilterCount++;
    if (typeof filters.minReviewCount === "number" && filters.minReviewCount > 0) activeFilterCount++;
    if (filters.verificationStatuses && filters.verificationStatuses.length > 0) activeFilterCount += filters.verificationStatuses.length;
    if (filters.hasPhoto) activeFilterCount++;

    // Precalculate relevance scores if sorting by relevance or query is present
    const relevanceScores = new Map<string, number>();
    if (query) {
      for (const p of candidates) {
        relevanceScores.set(
          p.id,
          computeRelevanceScore(query, {
            fullName: p.fullName || p.name || "",
            normalizedName: p.normalizedName || undefined,
            nameVariants: p.nameVariants || undefined,
            title: p.title || undefined,
            universityName: p.universityName || undefined,
            universityShortName: p.universityShortName || undefined,
            faculty: p.faculty || undefined,
            department: p.department || undefined,
            courses: p.courses || undefined,
            researchInterests: p.researchInterests || undefined,
          })
        );
      }
    }

    // Sort with stable tie-breaking:
    // primary sort -> ratingAverage desc -> ratingCount desc -> id asc
    candidates.sort((a, b) => {
      const aRating = a.averageRating ?? a.ratingAverage ?? 0;
      const bRating = b.averageRating ?? b.ratingAverage ?? 0;
      const aReviews = a.publishedReviewCount ?? a.ratingCount ?? 0;
      const bReviews = b.publishedReviewCount ?? b.ratingCount ?? 0;

      if (sort === "relevance" && query) {
        const aScore = relevanceScores.get(a.id) || 0;
        const bScore = relevanceScores.get(b.id) || 0;
        if (bScore !== aScore) return bScore - aScore;
        if (bRating !== aRating) return bRating - aRating;
        if (bReviews !== aReviews) return bReviews - aReviews;
        return a.id.localeCompare(b.id);
      }

      if (sort === "rating_desc") {
        if (bRating !== aRating) return bRating - aRating;
        if (bReviews !== aReviews) return bReviews - aReviews;
        return a.id.localeCompare(b.id);
      }

      if (sort === "reviews_desc") {
        if (bReviews !== aReviews) return bReviews - aReviews;
        if (bRating !== aRating) return bRating - aRating;
        return a.id.localeCompare(b.id);
      }

      if (sort === "recent_review") {
        const aRecent = a.ratingAggregateUpdatedAt || a.updatedAt || 0;
        const bRecent = b.ratingAggregateUpdatedAt || b.updatedAt || 0;
        if (bRecent !== aRecent) return bRecent - aRecent;
        if (bRating !== aRating) return bRating - aRating;
        return a.id.localeCompare(b.id);
      }

      if (sort === "name_asc") {
        const nameA = a.fullName || a.name || "";
        const nameB = b.fullName || b.name || "";
        const comp = nameA.localeCompare(nameB, "vi");
        if (comp !== 0) return comp;
        return a.id.localeCompare(b.id);
      }

      // Default fallback: rating_desc
      if (bRating !== aRating) return bRating - aRating;
      if (bReviews !== aReviews) return bReviews - aReviews;
      return a.id.localeCompare(b.id);
    });

    // Pagination
    const totalCount = candidates.length;
    const pageSize = Math.max(1, Math.min(50, pagination.pageSize || 12));
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const page = Math.max(1, Math.min(totalPages, pagination.page || 1));
    const offset = (page - 1) * pageSize;
    const paginatedItems = candidates.slice(offset, offset + pageSize);
    const hasNextPage = page < totalPages;
    const nextCursor = hasNextPage ? String(page + 1) : undefined;

    const executionTimeMs = Math.round((performance.now() - startTime) * 100) / 100;

    return {
      items: paginatedItems,
      totalCount,
      page,
      pageSize,
      totalPages,
      hasNextPage,
      nextCursor,
      appliedFilters: filters,
      activeFilterCount,
      executionTimeMs,
    };
  }

  /**
   * Generates aggregated facet options with counts.
   */
  public getFacets(): SearchFacets {
    // Generate facet counts based on all professors or matching candidates
    const unisMap = new Map<string, { label: string; count: number; sublabel?: string }>();
    const majorsMap = new Map<string, { label: string; count: number }>();
    const facsMap = new Map<string, { label: string; count: number }>();
    const deptsMap = new Map<string, { label: string; count: number }>();
    const coursesMap = new Map<string, { label: string; count: number }>();
    const citiesMap = new Map<string, { label: string; count: number }>();
    const titlesMap = new Map<string, { label: string; count: number }>();
    const interestsMap = new Map<string, { label: string; count: number }>();

    for (const prof of this.professors.values()) {
      // Universities
      for (const uId of prof.universityIds || [prof.universityId]) {
        const existing = unisMap.get(uId) || {
          label: prof.universityShortName || uId.toUpperCase(),
          sublabel: prof.universityName,
          count: 0,
        };
        existing.count++;
        unisMap.set(uId, existing);
      }

      // Majors
      for (const mId of prof.majorIds || []) {
        const existing = majorsMap.get(mId) || { label: mId, count: 0 };
        existing.count++;
        majorsMap.set(mId, existing);
      }

      // Faculties
      for (const f of prof.facultyIds || [prof.faculty]) {
        if (!f) continue;
        const existing = facsMap.get(f) || { label: f, count: 0 };
        existing.count++;
        facsMap.set(f, existing);
      }

      // Departments
      for (const d of prof.departmentIds || (prof.department ? [prof.department] : [])) {
        if (!d) continue;
        const existing = deptsMap.get(d) || { label: d, count: 0 };
        existing.count++;
        deptsMap.set(d, existing);
      }

      // Courses
      for (const c of prof.courses || []) {
        if (!c) continue;
        const existing = coursesMap.get(c) || { label: c, count: 0 };
        existing.count++;
        coursesMap.set(c, existing);
      }

      // Cities
      for (const city of prof.cityIds || []) {
        if (!city) continue;
        const existing = citiesMap.get(city) || { label: city, count: 0 };
        existing.count++;
        citiesMap.set(city, existing);
      }

      // Academic Titles
      const title = prof.academicTitle || prof.title;
      if (title) {
        const existing = titlesMap.get(title) || { label: title, count: 0 };
        existing.count++;
        titlesMap.set(title, existing);
      }

      // Research Interests
      for (const ri of prof.researchInterests || []) {
        if (!ri) continue;
        const existing = interestsMap.get(ri) || { label: ri, count: 0 };
        existing.count++;
        interestsMap.set(ri, existing);
      }
    }

    const toFacetList = (map: Map<string, { label: string; count: number; sublabel?: string }>): FacetOption[] => {
      return Array.from(map.entries())
        .map(([id, data]) => ({
          id,
          value: id,
          label: data.label,
          sublabel: data.sublabel,
          count: data.count,
        }))
        .sort((a, b) => b.count - a.count);
    };

    return {
      universities: toFacetList(unisMap),
      majors: toFacetList(majorsMap),
      faculties: toFacetList(facsMap),
      departments: toFacetList(deptsMap),
      courses: toFacetList(coursesMap),
      cities: toFacetList(citiesMap),
      academicTitles: toFacetList(titlesMap),
      researchInterests: toFacetList(interestsMap),
      verificationStatuses: [],
    };
  }

  /**
   * Returns current total number of indexed professors.
   */
  public getIndexedCount(): number {
    return this.professors.size;
  }
}
