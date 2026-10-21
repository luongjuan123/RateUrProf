"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Loader2 } from "lucide-react";
import {
  PopArtSearch,
  PopArtX,
  PopArtBuilding,
  PopArtGraduationCap,
  PopArtUser,
  PopArtGlobe,
  PopArtArrowRight,
} from "@/components/icons/PopArtIcons";

interface SearchResult {
  type: "university" | "lecturer" | "user" | "crawl_job";
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (section: string, query?: string) => void;
}

export function GlobalSearchModal({ isOpen, onClose, onSelect }: GlobalSearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  const performSearch = useCallback(async (q: string) => {
    if (!q || q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      if (data.success) {
        setResults(data.results || []);
      }
    } catch (err) {
      console.error("Global search error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      performSearch(query);
    }, 250);
    return () => clearTimeout(handler);
  }, [query, performSearch]);

  if (!isOpen) return null;

  const getIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "university":
        return <PopArtBuilding className="w-4 h-4" />;
      case "lecturer":
        return <PopArtGraduationCap className="w-4 h-4" />;
      case "user":
        return <PopArtUser className="w-4 h-4" />;
      case "crawl_job":
        return <PopArtGlobe className="w-4 h-4" />;
    }
  };

  const getSectionFromType = (type: SearchResult["type"]) => {
    switch (type) {
      case "university":
        return "universities";
      case "lecturer":
        return "lecturers";
      case "user":
        return "users";
      case "crawl_job":
        return "crawler";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-white border-2 border-gray-900 shadow-2xl rounded-none overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b-2 border-gray-900 bg-gray-50">
          <PopArtSearch className="w-5 h-5 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kiếm người dùng, giảng viên, trường đại học (VD: VJU, Bách Khoa)..."
            className="w-full bg-transparent text-sm font-medium text-gray-900 placeholder:text-gray-400 outline-none"
          />
          {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-500 shrink-0" />}
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 text-gray-500 hover:text-black transition-colors"
          >
            <PopArtX className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto divide-y divide-gray-100 p-2">
          {query.trim().length < 2 ? (
            <div className="py-8 text-center text-xs text-gray-500">
              Nhập tối thiểu 2 ký tự để tra cứu nhanh trên toàn bộ hệ thống
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="py-8 text-center text-xs text-gray-500">
              Không tìm thấy kết quả nào khớp với &ldquo;<span className="font-semibold text-gray-800">{query}</span>&rdquo;
            </div>
          ) : (
            results.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                onClick={() => {
                  onSelect(getSectionFromType(item.type), item.title);
                  onClose();
                }}
                className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-gray-100 border border-gray-200 shrink-0">
                    {getIcon(item.type)}
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold text-gray-900 truncate group-hover:text-[#e03a3e] transition-colors">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-gray-500 truncate mt-0.5 font-mono">
                      {item.subtitle}
                    </div>
                  </div>
                </div>
                <PopArtArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-black group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </div>
            ))
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-gray-100 border-t border-gray-200 flex items-center justify-between text-[11px] text-gray-500">
          <span>Tìm kiếm dữ liệu thực tế từ Cloud SQL PostgreSQL</span>
          <span className="font-mono">ESC để đóng</span>
        </div>
      </div>
    </div>
  );
}
