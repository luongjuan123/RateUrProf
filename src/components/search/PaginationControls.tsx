"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
      <span className="text-xs text-gray-500 font-medium">
        Hiển thị <span className="font-bold text-gray-900">{startItem} - {endItem}</span> trong tổng số{" "}
        <span className="font-bold text-[#e03a3e]">{totalCount}</span> giảng viên
      </span>

      {/* Page navigation buttons */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-2 border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Trang trước"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {startPage > 1 && (
          <>
            <button
              type="button"
              onClick={() => onPageChange(1)}
              className="px-3 py-1.5 border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100"
            >
              1
            </button>
            {startPage > 2 && <span className="px-1 text-gray-400">...</span>}
          </>
        )}

        {pages.map((p) => {
          const isActive = p === currentPage;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                isActive
                  ? "bg-black text-white border-2 border-black"
                  : "bg-white text-gray-800 border border-gray-300 hover:bg-gray-100"
              }`}
            >
              {p}
            </button>
          );
        })}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="px-1 text-gray-400">...</span>}
            <button
              type="button"
              onClick={() => onPageChange(totalPages)}
              className="px-3 py-1.5 border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-100"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-2 border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Trang tiếp theo"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
