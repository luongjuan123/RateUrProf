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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-[#111111]">
      {/* Information text */}
      <span className="text-xs text-gray-700 font-medium">
        Hiển thị <span className="font-bold text-black bg-gray-100 px-1.5 py-0.5 border border-[#111111]">{startItem} - {endItem}</span> trong tổng số{" "}
        <span className="font-bold text-black bg-gray-100 px-1.5 py-0.5 border border-[#111111]">{totalCount}</span> giảng viên
      </span>

      {/* Page navigation buttons */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-2 border border-[#111111] bg-white text-black hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Trang trước"
        >
          <PopArtChevronLeft className="w-4 h-4" />
        </button>

        {startPage > 1 && (
          <>
            <button
              type="button"
              onClick={() => onPageChange(1)}
              className="px-3 py-1.5 border border-[#111111] bg-white text-xs font-bold text-black hover:bg-gray-100 transition-colors cursor-pointer"
            >
              1
            </button>
            {startPage > 2 && <span className="px-1 font-bold text-black">...</span>}
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
                  ? "bg-[#111111] text-white border border-[#111111] font-bold"
                  : "bg-white text-black border border-[#111111] font-medium hover:bg-gray-100"
              }`}
            >
              {p}
            </button>
          );
        })}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="px-1 font-bold text-black">...</span>}
            <button
              type="button"
              onClick={() => onPageChange(totalPages)}
              className="px-3 py-1.5 border border-[#111111] bg-white text-xs font-bold text-black hover:bg-gray-100 transition-colors cursor-pointer"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-2 border border-[#111111] bg-white text-black hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Trang tiếp theo"
        >
          <PopArtChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
