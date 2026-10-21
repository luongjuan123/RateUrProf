"use client";

import React from "react";
import { PopArtX, PopArtRotateCcw } from "@/components/icons/PopArtIcons";
import { ActiveChip } from "@/lib/search/useProfessorSearch";

interface ActiveFilterChipsProps {
  chips: ActiveChip[];
  onClearAll: () => void;
}

export const ActiveFilterChips: React.FC<ActiveFilterChipsProps> = ({ chips, onClearAll }) => {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 pt-2">
      <span className="text-[11px] font-black uppercase tracking-wider text-black">
        Bộ lọc đang chọn:
      </span>

      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#fef9c3] border-2 border-black shadow-[2px_2px_0px_0px_#000000] text-xs font-bold text-black animate-in fade-in duration-100"
        >
          <span>{chip.label}</span>
          <button
            type="button"
            onClick={chip.onRemove}
            className="p-0.5 hover:bg-black hover:text-white text-black transition-colors cursor-pointer"
            title={`Bỏ lọc: ${chip.label}`}
          >
            <PopArtX className="w-3.5 h-3.5" />
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={onClearAll}
        className="inline-flex items-center gap-1 text-[11px] font-black text-black bg-[#fee2e2] px-2 py-1 border-2 border-black shadow-[1.5px_1.5px_0px_0px_#000000] hover:bg-[#fca5a5] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none uppercase tracking-wider ml-1 transition-all cursor-pointer"
      >
        <PopArtRotateCcw className="w-3.5 h-3.5" />
        <span>Xóa tất cả</span>
      </button>
    </div>
  );
};
