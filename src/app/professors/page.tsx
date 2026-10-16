"use client";

import React, { useState, Suspense } from "react";
import { ProfessorCard } from "@/components/ProfessorCard";
import { SearchBar } from "@/components/search/SearchBar";
import { FilterPanel } from "@/components/search/FilterPanel";
import { ActiveFilterChips } from "@/components/search/ActiveFilterChips";
import { PaginationControls } from "@/components/search/PaginationControls";
import { useProfessorSearch } from "@/lib/search/useProfessorSearch";
import { SearchSortOption } from "@/types";
import { Search, RotateCcw, AlertTriangle, ArrowUpDown } from "lucide-react";

function ProfessorsContent() {
  const {
    filters,
    sort,
    page,
    pageSize,
    result,
    facets,
    loading,
    error,
    activeChips,
    activeFilterCount,
    setQuery,
    applyFilters,
    clearAllFilters,
    changeSort,
    goToPage,
    retry,
  } = useProfessorSearch();

  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const toggleFilterPanel = () => {
    // On small screens, open mobile drawer; on desktop, toggle collapsible panel
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsMobileDrawerOpen(!isMobileDrawerOpen);
    } else {
      setIsFilterPanelOpen(!isFilterPanelOpen);
    }
  };

  const professors = result?.items || [];
  const totalCount = result?.totalCount || 0;
  const totalPages = result?.totalPages || 1;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Direct Header */}
      <div className="border-b-2 border-gray-900 pb-4">
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-gray-950">
          Tìm giảng viên
        </h1>
        <p className="text-xs text-gray-600 mt-1">
          Tìm kiếm giảng viên theo tên, trường đại học hoặc môn học.
        </p>
      </div>

      {/* Main Search Bar & Quick Controls */}
      <div className="space-y-4">
        <SearchBar
          value={filters.query || ""}
          onChange={setQuery}
          onToggleFilterPanel={toggleFilterPanel}
          isFilterPanelOpen={isFilterPanelOpen || isMobileDrawerOpen}
          activeFilterCount={activeFilterCount}
          loading={loading}
        />

        {/* Active Filter Chips */}
        <ActiveFilterChips chips={activeChips} onClearAll={clearAllFilters} />

        {/* Desktop Filter Panel (Collapsible) */}
        <FilterPanel
          isOpen={isFilterPanelOpen}
          onClose={() => setIsFilterPanelOpen(false)}
          filters={filters}
          facets={facets}
          onApply={applyFilters}
          onReset={clearAllFilters}
          isMobileDrawer={false}
        />

        {/* Mobile Filter Drawer */}
        <FilterPanel
          isOpen={isMobileDrawerOpen}
          onClose={() => setIsMobileDrawerOpen(false)}
          filters={filters}
          facets={facets}
          onApply={applyFilters}
          onReset={clearAllFilters}
          isMobileDrawer={true}
        />
      </div>

      {/* Results Header: Count & Sort */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-b border-gray-200 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-700">
            Tìm thấy{" "}
            <span className="text-[#e03a3e] font-black">{totalCount}</span> giảng viên phù hợp
          </span>
          {result?.executionTimeMs !== undefined && (
            <span className="text-[10px] text-gray-400 font-mono">
              ({result.executionTimeMs} ms)
            </span>
          )}
        </div>

        {/* Sort Selector */}
        <div className="flex items-center gap-2 text-xs">
          <ArrowUpDown className="w-3.5 h-3.5 text-gray-500" />
          <label htmlFor="sort-select" className="text-gray-500 font-bold uppercase text-[10px]">
            Sắp xếp:
          </label>
          <select
            id="sort-select"
            value={sort}
            onChange={(e) => changeSort(e.target.value as SearchSortOption)}
            className="p-1.5 bg-white border border-gray-300 font-semibold text-gray-900 focus:outline-none focus:border-black text-xs"
          >
            <option value="relevance">Độ liên quan cao nhất</option>
            <option value="rating_desc">Đánh giá cao nhất</option>
            <option value="reviews_desc">Nhiều đánh giá nhất</option>
            <option value="name_asc">Tên giảng viên (A - Z)</option>
            <option value="recent_review">Đánh giá mới nhất</option>
          </select>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-6 bg-red-50 border border-red-200 flex flex-col items-center justify-center space-y-3 text-center">
          <AlertTriangle className="w-8 h-8 text-[#e03a3e]" />
          <div>
            <h3 className="font-extrabold text-sm text-gray-900">Không thể tải kết quả tìm kiếm</h3>
            <p className="text-xs text-gray-600 mt-1">{error}</p>
          </div>
          <button
            type="button"
            onClick={retry}
            className="px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-wider"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-80 bg-gray-100 border border-gray-200 animate-pulse flex flex-col justify-between p-6 space-y-4"
            >
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 w-1/3" />
                <div className="h-6 bg-gray-200 w-2/3" />
                <div className="h-4 bg-gray-200 w-1/2" />
              </div>
              <div className="h-10 bg-gray-200 w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && professors.length === 0 && (
        <div className="p-12 text-center bg-gray-50 border-2 border-dashed border-gray-300 space-y-4">
          <div className="w-12 h-12 bg-gray-200 text-gray-500 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-base text-gray-900">
              Không tìm thấy giảng viên phù hợp với bộ lọc hiện tại.
            </h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
              Hãy thử tìm kiếm với từ khóa ngắn gọn hơn, gỡ bớt các điều kiện lọc hoặc chọn trường đại học khác.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-black hover:bg-gray-800 text-white text-xs font-bold uppercase tracking-wider transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Xóa toàn bộ bộ lọc</span>
            </button>
          </div>
        </div>
      )}

      {/* Professor Grid */}
      {!loading && !error && professors.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {professors.map((prof) => (
            <ProfessorCard key={prof.id} professor={prof} variant="medium" />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && !error && (
        <PaginationControls
          currentPage={page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={goToPage}
        />
      )}
    </div>
  );
}

export default function ProfessorsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-20 text-center text-sm font-semibold text-gray-500">
          Đang tải danh bạ giảng viên...
        </div>
      }
    >
      <ProfessorsContent />
    </Suspense>
  );
}
