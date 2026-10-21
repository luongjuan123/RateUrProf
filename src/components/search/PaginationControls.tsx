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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t-2 border-black">
      {/* Information text */}
      <span className="text-xs text-gray-700 font-bold">
        Hiển thị <span className="font-black text-black bg-[#fef9c3] px-1 border border-black">{startItem} - {endItem}</span> trong tổng số{" "}
        <span className="font-black text-black bg-[#6ee7b7] px-1 border border-black">{totalCount}</span> giảng viên
      </span>

      {/* Page navigation buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-2 border-2 border-black bg-white text-black shadow-[2px_2px_0px_0px_#000000] hover:bg-[#e0f2fe] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none transition-all cursor-pointer"
          title="Trang trước"
        >
          <PopArtChevronLeft className="w-4 h-4" />
        </button>

        {startPage > 1 && (
          <>
            <button
              type="button"
              onClick={() => onPageChange(1)}
              className="px-3 py-1.5 border-2 border-black bg-white text-xs font-black text-black shadow-[2px_2px_0px_0px_#000000] hover:bg-[#e0f2fe] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
            >
              1
            </button>
            {startPage > 2 && <span className="px-1 font-black text-black">...</span>}
          </>
        )}

        {pages.map((p) => {
          const isActive = p === currentPage;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`px-3 py-1.5 text-xs transition-all cursor-pointer ${
                isActive
                  ? "bg-black text-[#fef9c3] border-2 border-black font-black shadow-none translate-x-[1px] translate-y-[1px]"
                  : "bg-white text-black border-2 border-black font-black shadow-[2px_2px_0px_0px_#000000] hover:bg-[#e0f2fe] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              }`}
            >
              {p}
            </button>
          );
        })}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="px-1 font-black text-black">...</span>}
            <button
              type="button"
              onClick={() => onPageChange(totalPages)}
              className="px-3 py-1.5 border-2 border-black bg-white text-xs font-black text-black shadow-[2px_2px_0px_0px_#000000] hover:bg-[#e0f2fe] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-2 border-2 border-black bg-white text-black shadow-[2px_2px_0px_0px_#000000] hover:bg-[#e0f2fe] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none transition-all cursor-pointer"
          title="Trang tiếp theo"
        >
          <PopArtChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
