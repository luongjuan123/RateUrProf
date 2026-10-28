import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/locales/i18n";
import { AutocompleteSuggestion } from "@/types";
import { getAutocomplete } from "@/lib/search/searchService";
import { ScoreSquare } from "@/components/ScoreSquare";
import { Loader2 } from "lucide-react";
import { PopArtSearch, PopArtX, PopArtStar, PopArtSliders } from "@/components/icons/PopArtIcons";

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit?: (val: string) => void;
  onToggleFilterPanel?: () => void;
  isFilterPanelOpen?: boolean;
  activeFilterCount?: number;
  loading?: boolean;
  searchType?: "professor" | "school" | "all";
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSubmit,
  onToggleFilterPanel,
  isFilterPanelOpen,
  activeFilterCount = 0,
  loading = false,
  searchType = "professor",
}) => {
  const router = useRouter();
  const { locale } = useTranslation();
  const [localValue, setLocalValue] = useState(value);
  const [prevValue, setPrevValue] = useState(value);

  // Autocomplete states
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync state during rendering when incoming prop changes
  if (value !== prevValue) {
    setPrevValue(value);
    setLocalValue(value);
  }

  // Debounced Autocomplete Fetching
  useEffect(() => {
    const q = localValue.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      setSelectedIndex(-1);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      setIsSuggesting(true);
      try {
        const results = await getAutocomplete(q, 7, searchType);
        const filtered = results.filter((item) => {
          if (searchType === "professor") return item.type === "lecturer";
          if (searchType === "school") return item.type === "university";
          return true;
        });

        if (!controller.signal.aborted) {
          setSuggestions(filtered);
          setShowDropdown(filtered.length > 0);
          setSelectedIndex(-1);
        }
      } catch (err: any) {
        console.warn("Autocomplete error:", err);
      } finally {
        if (abortControllerRef.current === controller) {
          setIsSuggesting(false);
        }
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [localValue, searchType]);

  // Click outside to dismiss dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleClear = () => {
    setLocalValue("");
    onChange("");
    setSuggestions([]);
    setShowDropdown(false);
    setSelectedIndex(-1);
    if (onSubmit) onSubmit("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowDropdown(false);
    if (onSubmit) {
      onSubmit(localValue.trim());
    } else {
      router.push(`/${locale}/professors?q=${encodeURIComponent(localValue.trim())}`);
    }
  };

  const handleSelectSuggestion = (item: AutocompleteSuggestion) => {
    setShowDropdown(false);
    if (item.type === "lecturer") {
      router.push(`/${locale}/professors/${item.id}`);
    } else if (item.type === "university") {
      router.push(`/${locale}/universities/${item.id}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setSelectedIndex(-1);
      if (!showDropdown) handleClear();
    }
  };

  return (
    <div className="space-y-3 w-full">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        {/* Main Search Input */}
        <div ref={containerRef} className="relative flex-1 bg-white border border-gray-300 focus-within:border-[#1d4ed8] transition-colors flex items-center">
          <div className="pl-3.5 pr-2 text-[#1d4ed8]">
            {isSuggesting || loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#1d4ed8]" />
            ) : (
              <PopArtSearch className="w-5 h-5" />
            )}
          </div>
          <input
            type="text"
            value={localValue}
            onChange={(e) => {
              setLocalValue(e.target.value);
              onChange(e.target.value);
            }}
            onFocus={() => {
              if (suggestions.length > 0) setShowDropdown(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Tìm giảng viên, trường đại học, ngành học, môn học..."
            className="w-full py-2.5 pr-10 text-sm font-medium placeholder-gray-400 text-slate-900 border-0 border-none outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 shadow-none focus:shadow-none bg-transparent"
          />
          {localValue && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 p-1 text-gray-400 hover:text-black transition-colors cursor-pointer"
              title="Xóa tìm kiếm (Esc)"
            >
              <PopArtX className="w-4 h-4" />
            </button>
          )}

          {/* Autocomplete Dropdown */}
          {showDropdown && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-300 z-50 max-h-80 overflow-y-auto">
              {suggestions.length > 0 ? (
                <ul className="divide-y divide-gray-100">
                  {suggestions.map((item, idx) => (
                    <li
                      key={item.id}
                      onClick={() => handleSelectSuggestion(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                        selectedIndex === idx ? "bg-[#eff6ff] text-[#1d4ed8]" : "hover:bg-gray-50 text-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <ScoreSquare
                          score={item.ratingAverage}
                          ratingCount={item.ratingCount}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs truncate text-slate-900">{item.title}</span>
                            {item.universityShortName && (
                              <span className="px-1.5 py-0.5 bg-[#eff6ff] text-[#1d4ed8] text-[9px] font-bold uppercase border border-[#bfdbfe] shrink-0">
                                {item.universityShortName}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 font-normal truncate">{item.subtitle}</p>
                        </div>
                      </div>

                      {item.ratingAverage != null && (item.ratingCount || 0) > 0 && (
                        <div className="flex items-center gap-1 text-xs font-bold text-[#1d4ed8] shrink-0 pl-2 bg-[#eff6ff] px-1.5 py-0.5 border border-[#bfdbfe]">
                          <PopArtStar className="w-3.5 h-3.5" filled={true} />
                          <span>{item.ratingAverage.toFixed(1)}</span>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                localValue.trim().length >= 2 && !isSuggesting && (
                  <div className="p-4 text-center text-xs font-medium text-slate-500 bg-gray-50">
                    Không tìm thấy giảng viên phù hợp với từ khóa &quot;{localValue}&quot;
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* Submit Search Button */}
        <button
          type="submit"
          className="px-5 py-2.5 bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold uppercase tracking-wider border border-[#1d4ed8] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
        >
          <span>{locale === "en" ? "Search" : "Tìm kiếm"}</span>
        </button>

        {/* Filter Toggle Button */}
        {onToggleFilterPanel && (
          <button
            type="button"
            onClick={onToggleFilterPanel}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              isFilterPanelOpen
                ? "bg-[#1d4ed8] text-white border-[#1d4ed8]"
                : "bg-white hover:bg-[#eff6ff] hover:text-[#1d4ed8] text-slate-800 border-gray-300"
            }`}
          >
            <PopArtSliders className="w-4 h-4" />
            <span>{locale === "en" ? "Filter" : "Bộ lọc"}</span>
            {activeFilterCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-white text-[#1d4ed8] font-bold text-[10px] border border-[#1d4ed8]">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}
      </form>
    </div>
  );
};
