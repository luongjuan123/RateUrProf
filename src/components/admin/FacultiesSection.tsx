"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BookOpen,
  Search,
  Building2,
  RefreshCw,
  RotateCw,
  ExternalLink,
  Layers,
} from "lucide-react";

interface AdminFaculty {
  id: string;
  universityId: string;
  name: string;
  nameEn: string | null;
  websiteUrl: string | null;
  directoryUrl: string | null;
  universityName: string | null;
  universityShortName: string | null;
  departmentCount: number;
  lecturerCount: number;
}

export function FacultiesSection() {
  const [faculties, setFaculties] = useState<AdminFaculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchFaculties = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());

      const res = await fetch(`/api/admin/faculties?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setFaculties(data.items || []);
      }
    } catch (err) {
      console.error("Fetch faculties error:", err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchFaculties();
  }, [fetchFaculties]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-gray-900">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-gray-950 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <span>Khoa & Bộ môn Thuộc Cơ sở Giáo dục Đại học</span>
          </h2>
          <p className="text-xs text-gray-600 mt-1">
            Cơ cấu tổ chức đào tạo và giảng viên trực thuộc từng đơn vị thành viên
          </p>
        </div>
        <button
          onClick={fetchFaculties}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold uppercase transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-4 bg-white border-2 border-gray-900">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên khoa, viện nghiên cứu hoặc trường đại học..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 focus:outline-none focus:border-black"
          />
        </div>
      </div>

      {/* Faculties Table */}
      <div className="bg-white border-2 border-gray-900 overflow-x-auto shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-[10px] border-b-2 border-gray-900">
            <tr>
              <th className="p-3 border-r border-gray-200">Khoa / Viện đào tạo</th>
              <th className="p-3 border-r border-gray-200">Trường đại học</th>
              <th className="p-3 border-r border-gray-200">Bộ môn</th>
              <th className="p-3 border-r border-gray-200">Giảng viên</th>
              <th className="p-3 text-right">Website Khoa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 font-sans">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-gray-500 font-mono">
                  <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-900" />
                  Đang tải danh sách khoa & bộ môn...
                </td>
              </tr>
            ) : faculties.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-gray-500 font-mono">
                  Không tìm thấy khoa nào khớp với điều kiện tìm kiếm.
                </td>
              </tr>
            ) : (
              faculties.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-3 border-r border-gray-100 font-bold text-gray-950">
                    <div>{f.name}</div>
                    {f.nameEn && <div className="text-[11px] text-gray-500 font-normal">{f.nameEn}</div>}
                  </td>
                  <td className="p-3 border-r border-gray-100">
                    <div className="font-bold text-gray-900">{f.universityShortName || f.universityId}</div>
                    <div className="text-[11px] text-gray-500 truncate max-w-xs">{f.universityName}</div>
                  </td>
                  <td className="p-3 border-r border-gray-100 font-mono font-bold text-gray-800">
                    {f.departmentCount} bộ môn
                  </td>
                  <td className="p-3 border-r border-gray-100 font-mono font-bold text-emerald-700">
                    {f.lecturerCount} giảng viên
                  </td>
                  <td className="p-3 text-right font-mono text-[11px]">
                    {f.websiteUrl || f.directoryUrl ? (
                      <a
                        href={f.websiteUrl || f.directoryUrl || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 hover:underline inline-flex items-center gap-1"
                      >
                        <span>Cổng thông tin</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
