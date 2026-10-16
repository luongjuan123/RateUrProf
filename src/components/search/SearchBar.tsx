"use client";

import React, { useState } from "react";
import { Search, X, Loader2, SlidersHorizontal } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit?: (val: string) => void;
  onToggleFilterPanel?: () => void;
  isFilterPanelOpen?: boolean;
  activeFilterCount?: number;
  loading?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSubmit,
  onToggleFilterPanel,
  isFilterPanelOpen,
  activeFilterCount = 0,
  loading = false,
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [prevValue, setPrevValue] = useState(value);

  // Sync state during rendering when incoming prop changes (React 19 recommended pattern)
  if (value !== prevValue) {
    setPrevValue(value);
    setLocalValue(value);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onChange(localValue);
    if (onSubmit) onSubmit(localValue);
  };

  const handleClear = () => {
    setLocalValue("");
    onChange("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      handleClear();
    }
  };

  const popularSuggestions = [
    { label: "Bách Khoa", q: "HUST" },
    { label: "Công Nghệ", q: "VNU-UET" },
    { label: "Kinh Tế Quốc Dân", q: "NEU" },
    { label: "Ngoại Thương", q: "FTU" },
    { label: "Machine Learning", q: "Machine Learning" },
    { label: "Cấu trúc dữ liệu", q: "Cấu trúc Dữ liệu" },
  ];

  return (
    <div className="space-y-3 w-full">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {/* Main Search Input */}
        <div className="relative flex-1 bg-white border border-gray-400 focus-within:border-black transition-colors flex items-center">
          <div className="pl-3.5 pr-2 text-gray-400">
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#e03a3e]" />
            ) : (
              <Search className="w-5 h-5" />
            )}
          </div>
          <input
            type="text"
            value={localValue}
            onChange={(e) => {
              setLocalValue(e.target.value);
              onChange(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Tìm giảng viên, trường đại học, ngành học, môn học..."
            className="w-full py-2.5 pr-10 text-sm font-medium placeholder-gray-400 text-gray-900 focus:outline-none bg-transparent"
          />
          {localValue && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 p-1 text-gray-400 hover:text-gray-700 transition-colors"
              title="Xóa tìm kiếm (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Trigger Button */}
        {onToggleFilterPanel && (
          <button
            type="button"
            onClick={onToggleFilterPanel}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 border font-bold text-xs uppercase tracking-wider transition-colors ${
              isFilterPanelOpen || activeFilterCount > 0
                ? "bg-black text-white border-black"
                : "bg-white text-gray-900 border-gray-400 hover:border-black"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Bộ lọc</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 bg-[#e03a3e] text-white text-[10px] font-black flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}
      </form>

      {/* Quick Suggestions */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
        <span className="font-bold text-gray-400 uppercase text-[10px] tracking-wider">Tìm nhanh:</span>
        {popularSuggestions.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => {
              setLocalValue(item.q);
              onChange(item.q);
              if (onSubmit) onSubmit(item.q);
            }}
            className="px-2 py-0.5 border border-gray-200 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-medium transition-colors"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};
