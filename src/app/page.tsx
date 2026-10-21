"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Professor, AutocompleteSuggestion, University } from "@/types";
import { ProfessorResultCard } from "@/components/search/ProfessorResultCard";
import { SchoolResultCard } from "@/components/search/SchoolResultCard";
import { CampusIllustrationBanner } from "@/components/home/CampusIllustrationBanner";
import { HomeFeatureCards } from "@/components/home/HomeFeatureCards";
import { useTranslation } from "@/locales/i18n";
import { Loader2 } from "lucide-react";
import {
  PopArtSearch,
  PopArtGraduationCap,
  PopArtX,
  PopArtRotateCcw,
  PopArtBuilding,
  PopArtUser,
  PopArtChevronDown,
} from "@/components/icons/PopArtIcons";

type SearchMode = "school" | "professor";

interface SearchCacheEntry {
  professorResults?: Professor[];
  schoolResults?: University[];
  totalCount: number;
  hasMore: boolean;
  timestamp: number;
}

const clientSearchCache = new Map<string, SearchCacheEntry>();
const clientAutocompleteCache = new Map<string, { items: AutocompleteSuggestion[]; timestamp: number }>();
const CLIENT_CACHE_TTL = 60_000;

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, t } = useTranslation();

  const initialQuery = searchParams.get("q") || searchParams.get("query") || "";
  const paramMode = searchParams.get("mode");
  const initialMode: SearchMode = paramMode === "school" ? "school" : "professor";

  // Mode state: 'professor' (default) vs 'school'
  const [searchMode, setSearchMode] = useState<SearchMode>(initialMode);

  // Search input state
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);
  const [submittedMode, setSubmittedMode] = useState<SearchMode>(initialMode);

  // Results state
  const [professorResults, setProfessorResults] = useState<Professor[]>([]);
  const [schoolResults, setSchoolResults] = useState<University[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(Boolean(initialQuery.trim()));
  const [error, setError] = useState<string | null>(null);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSuggesting, setIsSuggesting] = useState(false);

  // Dropdown for switching mode in search results bar
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteAbortRef = useRef<AbortController | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const executedQueryRef = useRef<string | null>(null);
  const executedModeRef = useRef<SearchMode | null>(null);

  // Execute server-side search based on current mode
  const performSearch = useCallback(
    async (
      queryText: string,
      mode: SearchMode,
      targetPage: number = 1,
      append: boolean = false
    ) => {
      const cleanQ = queryText.trim();
      if (!cleanQ) {
        setProfessorResults([]);
        setSchoolResults([]);
        setTotalCount(0);
        setHasMore(false);
        setHasSearched(false);
        setLoading(false);
        return;
      }

      const cacheKey = `${mode}:${cleanQ.toLowerCase()}:${targetPage}`;
      if (!append && clientSearchCache.has(cacheKey)) {
        const cached = clientSearchCache.get(cacheKey)!;
        if (Date.now() - cached.timestamp < CLIENT_CACHE_TTL) {
          if (mode === "professor") {
            setProfessorResults(cached.professorResults || []);
            setSchoolResults([]);
          } else {
            setSchoolResults(cached.schoolResults || []);
            setProfessorResults([]);
          }
          setTotalCount(cached.totalCount);
          setPage(targetPage);
          setHasMore(cached.hasMore);
          setSubmittedMode(mode);
          setHasSearched(true);
          setLoading(false);
          return;
        }
      }

      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
      }
      const controller = new AbortController();
      searchAbortRef.current = controller;

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }

      try {
        if (mode === "professor") {
          const params = new URLSearchParams({
            q: cleanQ,
            page: String(targetPage),
            pageSize: "20",
          });

          const res = await fetch(`/api/search?${params.toString()}`, {
            signal: controller.signal,
          });

          if (!res.ok) {
            throw new Error(`Professor search failed with status ${res.status}`);
          }

          const data = await res.json();
          const items: Professor[] = data.items || [];
          const count: number =
            typeof data.totalCount === "number" ? data.totalCount : items.length;

          const hasMoreVal = Boolean(data.hasNextPage || targetPage * 20 < count);

          if (append) {
            setProfessorResults((prev) => [...prev, ...items]);
          } else {
            setProfessorResults(items);
            setSchoolResults([]);
          }

          setTotalCount(count);
          setPage(targetPage);
          setHasMore(hasMoreVal);

          if (!append) {
            clientSearchCache.set(cacheKey, {
              professorResults: items,
              totalCount: count,
              hasMore: hasMoreVal,
              timestamp: Date.now(),
            });
          }
        } else {
          // School mode search
          const res = await fetch(
            `/api/universities?q=${encodeURIComponent(cleanQ)}`,
            { signal: controller.signal }
          );

          if (!res.ok) {
            throw new Error(`School search failed with status ${res.status}`);
          }

          const unis: University[] = await res.json();
          setSchoolResults(unis || []);
          setProfessorResults([]);
          setTotalCount((unis || []).length);
          setHasMore(false);

          if (!append) {
            clientSearchCache.set(cacheKey, {
              schoolResults: unis || [],
              totalCount: (unis || []).length,
              hasMore: false,
              timestamp: Date.now(),
            });
          }
        }

        setSubmittedMode(mode);
        setHasSearched(true);
      } catch (err: unknown) {
        if ((err as Error)?.name === "AbortError") return;
        console.error("Search error:", err);
        setError(
          locale === "en"
            ? "Failed to load search results."
            : "Không thể tải kết quả tìm kiếm."
        );
      } finally {
        if (searchAbortRef.current === controller) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [locale]
  );

  // Run search if URL params change
  useEffect(() => {
    const qFromUrl = (searchParams.get("q") || searchParams.get("query") || "").trim();
    const modeFromUrl = searchParams.get("mode") === "school" ? "school" : "professor";

    if (qFromUrl) {
      if (
        qFromUrl !== executedQueryRef.current ||
        modeFromUrl !== executedModeRef.current
      ) {
        executedQueryRef.current = qFromUrl;
        executedModeRef.current = modeFromUrl;
        setSearchInput(qFromUrl);
        setSubmittedQuery(qFromUrl);
        setSearchMode(modeFromUrl);
        performSearch(qFromUrl, modeFromUrl, 1, false);
      }
    } else {
      if (executedQueryRef.current !== null) {
        executedQueryRef.current = null;
        executedModeRef.current = null;
        setSearchInput("");
        setSubmittedQuery("");
        setProfessorResults([]);
        setSchoolResults([]);
        setTotalCount(0);
        setHasMore(false);
        setHasSearched(false);
      }
    }
  }, [searchParams, performSearch]);

  // Debounced autocomplete (prioritizing active mode)
  useEffect(() => {
    const q = searchInput.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      setSelectedIndex(-1);
      return;
    }

    const autoKey = `${searchMode}:${q.toLowerCase()}`;
    const cachedAuto = clientAutocompleteCache.get(autoKey);
    if (cachedAuto && Date.now() - cachedAuto.timestamp < CLIENT_CACHE_TTL) {
      setSuggestions(cachedAuto.items);
      setShowDropdown(cachedAuto.items.length > 0);
      setSelectedIndex(-1);
      return;
    }

    if (autocompleteAbortRef.current) {
      autocompleteAbortRef.current.abort();
    }
    const controller = new AbortController();
    autocompleteAbortRef.current = controller;

    const timer = setTimeout(async () => {
      setIsSuggesting(true);
      try {
        const res = await fetch(
          `/api/autocomplete?q=${encodeURIComponent(q)}&limit=8&type=${searchMode}`,
          { signal: controller.signal }
        );
        if (!res.ok) return;

        const data = await res.json();
        let list: AutocompleteSuggestion[] = data.suggestions || [];

        // Strictly enforce suggestion filtering according to active search mode:
        // - School search mode: ONLY suggest schools/universities
        // - Professor search mode: ONLY suggest teachers/lecturers
        if (searchMode === "school") {
          list = list.filter((item) => item.type === "university");
        } else {
          list = list.filter((item) => item.type === "lecturer");
        }

        clientAutocompleteCache.set(autoKey, { items: list, timestamp: Date.now() });
        setSuggestions(list);
        setShowDropdown(list.length > 0);
        setSelectedIndex(-1);
      } catch (err: unknown) {
        if ((err as Error)?.name !== "AbortError") {
          console.warn("Autocomplete fetch error:", err);
        }
      } finally {
        if (autocompleteAbortRef.current === controller) {
          setIsSuggesting(false);
        }
      }
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchInput, searchMode]);

  // Click outside to dismiss dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
        setIsModeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Form submit handler
  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (autocompleteAbortRef.current) {
      autocompleteAbortRef.current.abort();
    }
    setShowDropdown(false);
    setIsModeDropdownOpen(false);
    const q = searchInput.trim();
    if (q) {
      executedQueryRef.current = q;
      executedModeRef.current = searchMode;
      setSubmittedQuery(q);
      setSubmittedMode(searchMode);
      setHasSearched(true);
      performSearch(q, searchMode, 1, false);
      router.push(
        `/${locale}?q=${encodeURIComponent(q)}&mode=${searchMode}`
      );
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "instant" });
      }
    }
  };

  // Switch mode directly
  const handleSwitchMode = (newMode: SearchMode) => {
    setSearchMode(newMode);
    setShowDropdown(false);
    setIsModeDropdownOpen(false);

    // If there is already a searched query, re-execute search immediately in new mode
    if (submittedQuery.trim()) {
      executedModeRef.current = newMode;
      setSubmittedMode(newMode);
      setHasSearched(true);
      performSearch(submittedQuery.trim(), newMode, 1, false);
      router.push(
        `/${locale}?q=${encodeURIComponent(submittedQuery.trim())}&mode=${newMode}`
      );
    } else {
      inputRef.current?.focus();
    }
  };

  // Autocomplete suggestion click
  const handleSelectSuggestion = (item: AutocompleteSuggestion) => {
    setShowDropdown(false);
    if (item.type === "university") {
      router.push(`/${locale}/universities/${item.id}`);
    } else {
      router.push(`/${locale}/professors/${item.id}`);
    }
  };

  // Keyboard navigation for autocomplete
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (showDropdown && selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleSelectSuggestion(suggestions[selectedIndex]);
      } else {
        handleSearchSubmit(e);
      }
      return;
    }

    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  // Clear search handler
  const handleClearSearch = () => {
    if (autocompleteAbortRef.current) {
      autocompleteAbortRef.current.abort();
    }
    executedQueryRef.current = null;
    executedModeRef.current = null;
    setSearchInput("");
    setSubmittedQuery("");
    setProfessorResults([]);
    setSchoolResults([]);
    setTotalCount(0);
    setHasMore(false);
    setHasSearched(false);
    setError(null);
    setShowDropdown(false);
    router.push(
      searchMode === "professor" ? `/${locale}` : `/${locale}?mode=school`
    );
  };

  // Load next page (for professor results)
  const handleLoadMore = () => {
    if (hasMore && !loadingMore && submittedQuery && submittedMode === "professor") {
      performSearch(submittedQuery, "professor", page + 1, true);
    }
  };

  return (
    <div className={`bg-white text-gray-900 ${hasSearched ? "min-h-[calc(100vh-80px)] pb-24" : ""}`}>
      {/* 1. DUAL-MODE HERO SECTION (Rate My Professors Authentic Layout) */}
      {!hasSearched && (
        <section className="min-h-[calc(100vh-80px)] flex flex-col justify-between items-center relative overflow-hidden pt-12 sm:pt-16 pb-0">
          <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 z-10 my-auto">
          {/* Rate My Professors Iconic Badge & Brand */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 border-2 border-black px-3 py-1 bg-white shadow-[2px_2px_0px_#000]">
              <div className="w-5 h-5 bg-[#fef9c3] border border-black text-black flex items-center justify-center font-black text-[10px] tracking-wider">
                <span className="text-black">RU</span><span className="text-[#e03a3e]">P</span>
              </div>
              <span className="font-black text-sm tracking-widest uppercase text-black">
                <span>RATEUR</span><span className="text-[#e03a3e]">PROFS</span>
              </span>
            </div>

            {/* Dynamic Headline matching Screenshot 1 & 2 */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[42px] font-normal tracking-tight text-gray-900 select-none sm:whitespace-nowrap">
              {searchMode === "school" ? (
                locale === "en" ? (
                  <>
                    Enter your <span className="font-black text-[#e03a3e]">school</span> to get started
                  </>
                ) : (
                  <>
                    Nhập tên <span className="font-black text-[#e03a3e]">trường</span> của bạn để bắt đầu
                  </>
                )
              ) : (
                locale === "en" ? (
                  <>
                    Find a <span className="font-black text-[#e03a3e]">professor</span>
                  </>
                ) : (
                  <>
                    Tìm <span className="font-black text-[#e03a3e]">giảng viên</span>
                  </>
                )
              )}
            </h1>
          </div>

          {/* Neo-Brutalist Search Input Box with Sharp Corners */}
          <div ref={containerRef} className="relative max-w-xl mx-auto text-left">
            <form
              onSubmit={handleSearchSubmit}
              className="flex items-center rounded-none border-2 border-black bg-white shadow-[4px_4px_0px_#000] focus-within:shadow-[6px_6px_0px_#000] transition-all px-4 py-2 sm:py-2.5"
            >
              {/* Left Icon (GraduationCap for school, Search/User for professor) */}
              <div className="text-black mr-3 shrink-0">
                {searchMode === "school" ? (
                  <PopArtGraduationCap className="w-5 h-5" />
                ) : (
                  <PopArtSearch className="w-5 h-5" />
                )}
              </div>

              {/* Input */}
              <input
                ref={inputRef}
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (suggestions.length > 0 && searchInput.trim().length >= 2) {
                    setShowDropdown(true);
                  }
                }}
                placeholder={
                  searchMode === "school"
                    ? locale === "en"
                      ? "Your school..."
                      : "Tên trường đại học..."
                    : locale === "en"
                    ? "Professor name..."
                    : "Tên giảng viên..."
                }
                aria-label={
                  searchMode === "school" ? "Search school" : "Search professor"
                }
                className="w-full text-sm sm:text-base font-mono font-medium placeholder-gray-400 text-black border-0 border-none outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 shadow-none focus:shadow-none bg-transparent rounded-none"
              />

              {isSuggesting && (
                <Loader2 className="w-4 h-4 text-black animate-spin shrink-0 mr-2" />
              )}

              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    setSuggestions([]);
                    setShowDropdown(false);
                  }}
                  className="p-1 text-gray-500 hover:text-black shrink-0 mr-1 cursor-pointer"
                  aria-label="Clear input"
                >
                  <PopArtX className="w-4 h-4" />
                </button>
              )}

              <button
                type="submit"
                onClick={handleSearchSubmit}
                className="w-8 h-8 rounded-none bg-black text-[#fef9c3] hover:bg-[#e03a3e] hover:text-white border-2 border-black flex items-center justify-center shrink-0 transition-all active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
                aria-label="Submit search"
              >
                <PopArtSearch className="w-4 h-4" />
              </button>
            </form>

            {/* Typeahead Suggestions Dropdown */}
            {showDropdown && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white border-2 border-black shadow-[6px_6px_0px_#000] z-50 rounded-none overflow-hidden">
                <div className="px-4 py-2 bg-[#fef9c3] border-b-2 border-black text-[10px] font-mono font-black uppercase tracking-wider text-black">
                  {locale === "en" ? "Suggestions" : "Gợi ý tìm kiếm"}
                </div>
                <ul className="divide-y-2 divide-black max-h-80 overflow-y-auto">
                  {suggestions.map((item, idx) => {
                    const isUni = item.type === "university";
                    const isSelected = idx === selectedIndex;
                    return (
                      <li
                        key={`${item.type}-${item.id}`}
                        onMouseDown={() => handleSelectSuggestion(item)}
                        className={`px-4 py-3 flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? "bg-[#fef9c3]/50" : "hover:bg-[#fef9c3]/20"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-3">
                          <div className="w-7 h-7 rounded-none border border-black bg-[#fef9c3] text-black flex items-center justify-center shrink-0 font-mono font-black text-xs">
                            {isUni ? (
                              <PopArtBuilding className="w-4 h-4" />
                            ) : (
                              <PopArtUser className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-mono font-black text-black truncate">
                              {item.title}
                            </div>
                            <div className="text-xs font-mono text-gray-700 truncate">
                              {item.subtitle}
                            </div>
                          </div>
                        </div>

                        <span className="shrink-0 px-2 py-0.5 text-[9px] font-mono font-black uppercase tracking-wider bg-white text-black border border-black shadow-[1px_1px_0px_#000] rounded-none">
                          {isUni
                            ? locale === "en"
                              ? "School"
                              : "Trường"
                            : locale === "en"
                            ? "Professor"
                            : "Giảng viên"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {/* Under-link Toggle Button matching Screenshot 1 & 2 */}
          <div className="pt-1">
            {searchMode === "school" ? (
              <button
                type="button"
                onClick={() => handleSwitchMode("professor")}
                className="text-xs sm:text-sm text-gray-700 hover:text-black underline underline-offset-2 font-medium transition-colors cursor-pointer"
              >
                {locale === "en"
                  ? "I'd like to look up a professor by name"
                  : "Tôi muốn tìm giảng viên theo tên"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSwitchMode("school")}
                className="text-xs sm:text-sm text-gray-700 hover:text-black underline underline-offset-2 font-medium transition-colors cursor-pointer"
              >
                {locale === "en"
                  ? "I want to find a professor at a school"
                  : "Tôi muốn tìm theo trường đại học"}
              </button>
            )}
          </div>
        </div>

        {/* Campus Community Illustration Banner anchoring bottom of viewport */}
        <div className="w-full mt-auto pt-6">
          <CampusIllustrationBanner />
        </div>
      </section>
    )}

      {/* 2. ILLUSTRATED FEATURE CARDS (Rate My Professors Authentic Feature Section) */}
      {!hasSearched && <HomeFeatureCards />}

      {/* 3. DUAL-MODE SEARCH RESULTS SECTION matching Screenshot 3 & 4 */}
      {hasSearched && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">

          {/* Top Search Controls Bar matching Neo-Brutalism */}
          <div className="bg-white border-2 border-black p-3 sm:p-4 mb-6 shadow-[4px_4px_0px_#000] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Mode Switcher Dropdown */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsModeDropdownOpen(!isModeDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 bg-white border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#fef9c3] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none text-xs font-mono font-black uppercase tracking-wider text-black transition-all cursor-pointer"
                >
                  <span>
                    {searchMode === "professor"
                      ? locale === "en"
                        ? "Professors"
                        : "Giảng viên"
                      : locale === "en"
                      ? "Schools"
                      : "Trường ĐH"}
                  </span>
                  <PopArtChevronDown className="w-3.5 h-3.5" />
                </button>

                {isModeDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-48 bg-white border-2 border-black shadow-[4px_4px_0px_#000] z-50 py-1">
                    <button
                      type="button"
                      onClick={() => handleSwitchMode("professor")}
                      className={`w-full text-left px-4 py-2 text-xs font-mono font-black uppercase transition-colors cursor-pointer ${
                        searchMode === "professor"
                          ? "bg-black text-[#fef9c3]"
                          : "text-black hover:bg-[#fef9c3]"
                      }`}
                    >
                      {locale === "en" ? "Professors" : "Giảng viên"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchMode("school")}
                      className={`w-full text-left px-4 py-2 text-xs font-mono font-black uppercase transition-colors cursor-pointer ${
                        searchMode === "school"
                          ? "bg-black text-[#fef9c3]"
                          : "text-black hover:bg-[#fef9c3]"
                      }`}
                    >
                      {locale === "en" ? "Schools" : "Trường Đại học"}
                    </button>
                  </div>
                )}
              </div>

              {/* Fast inline search input */}
              <div className="relative flex-1 sm:w-80">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearchSubmit(e);
                    }
                  }}
                  placeholder={
                    searchMode === "professor"
                      ? locale === "en"
                        ? "Professor name..."
                        : "Tên giảng viên..."
                      : locale === "en"
                      ? "School name..."
                      : "Tên trường..."
                  }
                  className="w-full px-3 py-2 text-xs bg-white border-2 border-black shadow-[2px_2px_0px_#000] outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus:shadow-none focus:bg-[#fef9c3]/30 font-mono font-bold text-black rounded-none"
                />
              </div>

              <button
                type="button"
                onClick={handleSearchSubmit}
                className="px-4 py-2 bg-[#e03a3e] hover:bg-black text-white text-xs font-mono font-black uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all shrink-0 cursor-pointer"
              >
                {locale === "en" ? "Search" : "Tìm"}
              </button>
            </div>

            <button
              type="button"
              onClick={handleClearSearch}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-mono font-black uppercase tracking-wider text-black bg-white hover:bg-[#fee2e2] border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all shrink-0 cursor-pointer"
            >
              <PopArtRotateCcw className="w-3.5 h-3.5" />
              <span>{locale === "en" ? "Reset" : "Đặt lại"}</span>
            </button>
          </div>

          {/* Results Summary Title matching Neo-Brutalism Pop-Art */}
          <div className="mb-6 p-4 bg-[#fef9c3] border-2 border-black shadow-[4px_4px_0px_#000] flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-black text-[#fef9c3] border-2 border-black flex items-center justify-center font-mono font-black text-sm shrink-0">
                {submittedMode === "professor" ? (
                  <PopArtUser className="w-4 h-4 text-[#fef9c3]" />
                ) : (
                  <PopArtBuilding className="w-4 h-4 text-[#fef9c3]" />
                )}
              </div>
              <h2 className="text-sm sm:text-base font-mono font-black uppercase text-black tracking-wider">
                {submittedMode === "professor" ? (
                  locale === "en" ? (
                    `${totalCount} ${
                      totalCount === 1 ? "professor" : "professors"
                    } with "${submittedQuery}" in their name`
                  ) : (
                    `${totalCount} giảng viên có tên "${submittedQuery}"`
                  )
                ) : (
                  locale === "en" ? (
                    `${totalCount} ${
                      totalCount === 1 ? "school" : "schools"
                    } with "${submittedQuery}" in their name`
                  ) : (
                    `${totalCount} trường đại học có tên "${submittedQuery}"`
                  )
                )}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-white border border-black shadow-[1px_1px_0px_#000] text-[10px] font-mono font-black uppercase tracking-wider text-black">
                {submittedMode === "professor" ? (locale === "en" ? "PROFESSOR SEARCH" : "TÌM GIẢNG VIÊN") : (locale === "en" ? "SCHOOL SEARCH" : "TÌM TRƯỜNG ĐH")}
              </span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-[#fee2e2] border-2 border-black shadow-[4px_4px_0px_#000] text-center text-xs font-mono font-black text-black mb-6">
              {error}
            </div>
          )}

          {/* Loading Skeletons */}
          {loading && !error && (
            <div className="space-y-3.5">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-28 bg-[#fef9c3]/30 border-2 border-black shadow-[4px_4px_0px_#000] animate-pulse"
                />
              ))}
            </div>
          )}

          {/* Empty Results State */}
          {!loading &&
            !error &&
            ((submittedMode === "professor" && professorResults.length === 0) ||
              (submittedMode === "school" && schoolResults.length === 0)) && (
              <div className="p-8 sm:p-12 text-center bg-white border-2 border-black shadow-[4px_4px_0px_#000] space-y-3">
                <div className="w-12 h-12 bg-black text-[#fef9c3] border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center mx-auto">
                  <PopArtSearch className="w-6 h-6" />
                </div>
                <h3 className="text-base sm:text-lg font-mono font-black uppercase text-black">
                  {submittedMode === "professor"
                    ? locale === "en"
                      ? `No professors found with "${submittedQuery}" in their name.`
                      : `Không tìm thấy giảng viên có tên "${submittedQuery}".`
                    : locale === "en"
                    ? `No schools found with "${submittedQuery}" in their name.`
                    : `Không tìm thấy trường đại học có tên "${submittedQuery}".`}
                </h3>
                <p className="text-xs font-mono text-gray-700 font-bold max-w-md mx-auto">
                  {submittedMode === "professor"
                    ? locale === "en"
                      ? "Did you mean to search for a school instead?"
                      : "Bạn có muốn tìm kiếm theo tên trường đại học không?"
                    : locale === "en"
                    ? "Did you mean to search for a professor by name instead?"
                    : "Bạn có muốn tìm kiếm theo tên giảng viên không?"}
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleSwitchMode(
                        submittedMode === "professor" ? "school" : "professor"
                      )
                    }
                    className="px-6 py-2.5 bg-black hover:bg-[#e03a3e] text-[#fef9c3] hover:text-white text-xs font-mono font-black uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all inline-block cursor-pointer"
                  >
                    {submittedMode === "professor"
                      ? locale === "en"
                        ? "Search as School"
                        : "Tìm theo Trường Đại học"
                      : locale === "en"
                      ? "Search as Professor"
                      : "Tìm theo Giảng viên"}
                  </button>
                </div>
              </div>
            )}

          {/* PROFESSORS RESULT LIST matching Screenshot 3 */}
          {!loading &&
            !error &&
            submittedMode === "professor" &&
            professorResults.length > 0 && (
              <div className="space-y-3.5">
                {professorResults.map((prof) => (
                  <ProfessorResultCard key={prof.id} professor={prof} />
                ))}

                {/* Incremental Pagination for Professors */}
                {hasMore && (
                  <div className="text-center pt-8">
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="inline-flex items-center gap-2 px-8 py-3 bg-white hover:bg-[#fef9c3] border-2 border-black text-black text-xs font-mono font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-[4px_4px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                    >
                      {loadingMore && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      )}
                      <span>
                        {loadingMore
                          ? locale === "en"
                            ? "Loading..."
                            : "Đang tải..."
                          : locale === "en"
                          ? "Load more results"
                          : "Xem thêm kết quả"}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}

          {/* SCHOOLS RESULT LIST matching Screenshot 4 */}
          {!loading &&
            !error &&
            submittedMode === "school" &&
            schoolResults.length > 0 && (
              <div className="space-y-3.5">
                {schoolResults.map((uni) => (
                  <SchoolResultCard key={uni.id} university={uni} />
                ))}
              </div>
            )}
        </section>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="h-96 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      }
    >
      <HomePageContent />
    </Suspense>
  );
}
