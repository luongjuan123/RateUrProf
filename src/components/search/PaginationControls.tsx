"use client";

import React from "react";
import { PopArtChevronLeft, PopArtChevronRight } from "@/components/icons/PopArtIcons";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
}) => {
  if (totalCount === 0 || totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalCount, currentPage * pageSize);

  // Generate page numbers to display
  const pages: number[] = [];
  const maxButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = startPage + maxButtons - 1;

  if (endPage > totalPages) {
    endPage = totalPages;
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-gray-200">
      {/* Information text */}
      <span className="text-xs text-slate-600 font-medium">
        Hiển thị <span className="font-bold text-[#1d4ed8] bg-[#eff6ff] px-1.5 py-0.5 border border-[#bfdbfe]">{startItem} - {endItem}</span> trong tổng số{" "}
        <span className="font-bold text-[#1d4ed8] bg-[#eff6ff] px-1.5 py-0.5 border border-[#bfdbfe]">{totalCount}</span> giảng viên
      </span>

      {/* Page navigation buttons */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-2 border border-gray-300 bg-white text-slate-700 hover:border-[#1d4ed8] hover:text-[#1d4ed8] hover:bg-[#eff6ff] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Trang trước"
        >
          <PopArtChevronLeft className="w-4 h-4" />
        </button>

        {startPage > 1 && (
          <>
            <button
              type="button"
              onClick={() => onPageChange(1)}
              className="px-3 py-1.5 border border-gray-300 bg-white text-xs font-bold text-slate-700 hover:border-[#1d4ed8] hover:text-[#1d4ed8] hover:bg-[#eff6ff] transition-colors cursor-pointer"
            >
              1
            </button>
            {startPage > 2 && <span className="px-1 font-bold text-slate-400">...</span>}
          </>
        )}

        {pages.map((p) => {
          const isActive = p === currentPage;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`px-3 py-1.5 text-xs transition-colors cursor-pointer ${
                isActive
                  ? "bg-[#1d4ed8] text-white border border-[#1d4ed8] font-bold"
                  : "bg-white text-slate-700 border border-gray-300 font-medium hover:border-[#1d4ed8] hover:text-[#1d4ed8] hover:bg-[#eff6ff]"
              }`}
            >
              {p}
            </button>
          );
        })}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="px-1 font-bold text-slate-400">...</span>}
            <button
              type="button"
              onClick={() => onPageChange(totalPages)}
              className="px-3 py-1.5 border border-gray-300 bg-white text-xs font-bold text-slate-700 hover:border-[#1d4ed8] hover:text-[#1d4ed8] hover:bg-[#eff6ff] transition-colors cursor-pointer"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-2 border border-gray-300 bg-white text-slate-700 hover:border-[#1d4ed8] hover:text-[#1d4ed8] hover:bg-[#eff6ff] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Trang sau"
        >
          <PopArtChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
