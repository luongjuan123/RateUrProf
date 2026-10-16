"use client";

import React from "react";
import { X, RotateCcw } from "lucide-react";
import { ActiveChip } from "@/lib/search/useProfessorSearch";

interface ActiveFilterChipsProps {
  chips: ActiveChip[];
  onClearAll: () => void;
}

export const ActiveFilterChips: React.FC<ActiveFilterChipsProps> = ({ chips, onClearAll }) => {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 pt-2">
      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
        Bộ lọc đang chọn:
      </span>

      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-200 text-xs font-semibold text-gray-900 animate-in fade-in duration-100"
        >
          <span>{chip.label}</span>
          <button
            type="button"
            onClick={chip.onRemove}
            className="p-0.5 hover:bg-red-200 text-[#e03a3e] transition-colors"
            title={`Bỏ lọc: ${chip.label}`}
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={onClearAll}
        className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-500 hover:text-black hover:underline uppercase tracking-wider ml-1"
      >
        <RotateCcw className="w-3 h-3" />
        <span>Xóa tất cả</span>
      </button>
    </div>
  );
};
