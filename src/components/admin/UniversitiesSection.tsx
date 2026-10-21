"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Search,
  Filter,
  Globe2,
  Edit,
  RotateCw,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Plus,
  X,
  Layers,
  Sparkles,
} from "lucide-react";

interface AdminUniversity {
  id: string;
  name: string;
  shortName: string;
  englishName: string | null;
  city: string | null;
  region: string | null;
  officialDomain: string | null;
  officialWebsite: string | null;
  institutionType: string;
  totalProfessors: number;
  aliases: string[];
  createdAt: number;
  updatedAt: number | null;
}

export function UniversitiesSection({ onNavigateToMerge }: { onNavigateToMerge?: (id: string) => void }) {
  const [unis, setUnis] = useState<AdminUniversity[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");

  // Edit Modal State
  const [editingUni, setEditingUni] = useState<AdminUniversity | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    shortName: "",
    englishName: "",
    city: "",
    region: "",
    officialDomain: "",
    officialWebsite: "",
    aliasesText: "",
    reason: "",
  });
  const [saveLoading, setSaveLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchUniversities = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "15",
      });
      if (search.trim()) params.append("search", search.trim());
      if (regionFilter !== "all") params.append("region", regionFilter);

      const res = await fetch(`/api/admin/universities?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setUnis(data.items || []);
        setTotalCount(data.totalCount || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error("Fetch universities error:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, regionFilter]);

  useEffect(() => {
    fetchUniversities();
  }, [fetchUniversities]);

  const handleOpenEdit = (u: AdminUniversity) => {
    setEditingUni(u);
    setEditForm({
      name: u.name,
      shortName: u.shortName,
      englishName: u.englishName || "",
      city: u.city || "",
      region: u.region || "",
      officialDomain: u.officialDomain || "",
      officialWebsite: u.officialWebsite || "",
      aliasesText: (u.aliases || []).join(", "),
      reason: "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingUni) return;
    setSaveLoading(true);
    setFeedback(null);

    const aliases = editForm.aliasesText
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);

    try {
      const res = await fetch(`/api/admin/universities/${editingUni.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          shortName: editForm.shortName,
          englishName: editForm.englishName,
          city: editForm.city,
          region: editForm.region,
          officialDomain: editForm.officialDomain,
          officialWebsite: editForm.officialWebsite,
          aliases,
          reason: editForm.reason || "Cập nhật dữ liệu cơ sở giáo dục từ Quản trị viên",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: "success",
          message: `Cập nhật thông tin trường [${editForm.name}] thành công!`,
        });
        setEditingUni(null);
        await fetchUniversities();
      } else {
        setFeedback({
          type: "error",
          message: data.error || "Không thể cập nhật cơ sở giáo dục.",
        });
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Lỗi kết nối.",
      });
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-gray-900">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-gray-950 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <span>Danh mục Cơ sở Giáo dục Đại học Toàn quốc</span>
          </h2>
          <p className="text-xs text-gray-600 mt-1">
            Tổng cộng {totalCount.toLocaleString("vi-VN")} trường đại học, học viện và cơ sở đào tạo tại Việt Nam
          </p>
        </div>
        <button
          onClick={fetchUniversities}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold uppercase transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-4 border-2 flex items-center justify-between text-xs ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-400 text-emerald-950 font-bold"
              : "bg-red-50 border-red-400 text-red-950 font-bold"
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="p-1 hover:bg-black/10">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="p-4 bg-white border-2 border-gray-900 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo tên trường, mã viết tắt, tên tiếng Anh hoặc tên miền (VD: VNU-VJU, vju.ac.vn)..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 focus:outline-none focus:border-black"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={regionFilter}
            onChange={(e) => {
              setRegionFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs border border-gray-300 bg-white font-medium focus:outline-none focus:border-black"
          >
            <option value="all">Tất cả khu vực địa lý</option>
            <option value="Bắc">Miền Bắc</option>
            <option value="Trung">Miền Trung</option>
            <option value="Nam">Miền Nam</option>
          </select>
        </div>
      </div>

      {/* Universities Table */}
      <div className="bg-white border-2 border-gray-900 overflow-x-auto shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-[10px] border-b-2 border-gray-900">
            <tr>
              <th className="p-3 border-r border-gray-200">Trường đại học</th>
              <th className="p-3 border-r border-gray-200">Mã / Viết tắt</th>
              <th className="p-3 border-r border-gray-200">Địa bàn & Khu vực</th>
              <th className="p-3 border-r border-gray-200">Tên miền chính thức</th>
              <th className="p-3 border-r border-gray-200">Hồ sơ giảng viên</th>
              <th className="p-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 font-sans">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-gray-500 font-mono">
                  <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-900" />
                  Đang tải danh sách cơ sở giáo dục...
                </td>
              </tr>
            ) : unis.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-gray-500 font-mono">
                  Không tìm thấy cơ sở giáo dục nào khớp với điều kiện tìm kiếm.
                </td>
              </tr>
            ) : (
              unis.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-3 border-r border-gray-100">
                    <div className="font-bold text-gray-950 text-xs">{u.name}</div>
                    {u.englishName && <div className="text-[11px] text-gray-500 truncate max-w-sm">{u.englishName}</div>}
                    <div className="text-[10px] font-mono text-gray-400 mt-0.5">{u.id}</div>
                  </td>
                  <td className="p-3 border-r border-gray-100 font-mono font-bold text-gray-900">
                    <span className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 text-[11px]">
                      {u.shortName || u.id}
                    </span>
                  </td>
                  <td className="p-3 border-r border-gray-100">
                    <div className="font-semibold text-gray-800">{u.city || "Việt Nam"}</div>
                    <div className="text-[11px] text-gray-500">{u.region || "Chưa phân loại"}</div>
                  </td>
                  <td className="p-3 border-r border-gray-100 font-mono text-[11px]">
                    {u.officialDomain ? (
                      <a
                        href={u.officialWebsite || `https://${u.officialDomain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-700 hover:underline flex items-center gap-1"
                      >
                        <span>{u.officialDomain}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    ) : (
                      <span className="text-gray-400">Chưa có tên miền</span>
                    )}
                  </td>
                  <td className="p-3 border-r border-gray-100 font-mono font-bold">
                    <span className={u.totalProfessors > 0 ? "text-emerald-700" : "text-gray-400"}>
                      {u.totalProfessors.toLocaleString("vi-VN")} hồ sơ
                    </span>
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleOpenEdit(u)}
                      className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-900 text-[11px] font-bold uppercase border border-gray-300 transition-colors"
                    >
                      Chỉnh sửa
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Bar */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <span className="text-gray-500 font-mono">
            Trang {page} / {totalPages} ({totalCount.toLocaleString("vi-VN")} trường đại học)
          </span>
          <div className="flex items-center gap-1 font-mono">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 bg-white border border-gray-300 disabled:opacity-40 hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-bold text-gray-900 bg-white border border-gray-300">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 bg-white border border-gray-300 disabled:opacity-40 hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit University Modal */}
      {editingUni && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white border-2 border-gray-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-gray-950 flex items-center gap-2">
                <Edit className="w-4 h-4 text-blue-600" />
                <span>Chỉnh sửa Thông tin Cơ sở Giáo dục</span>
              </h3>
              <button onClick={() => setEditingUni(null)} className="p-1 hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold uppercase tracking-wider text-[10px] text-gray-700 block mb-1">
                  Tên trường (Tiếng Việt):
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full p-2 border border-gray-300 focus:outline-none focus:border-black font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold uppercase tracking-wider text-[10px] text-gray-700 block mb-1">
                    Mã viết tắt (Acronym):
                  </label>
                  <input
                    type="text"
                    value={editForm.shortName}
                    onChange={(e) => setEditForm({ ...editForm, shortName: e.target.value })}
                    className="w-full p-2 border border-gray-300 focus:outline-none focus:border-black font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold uppercase tracking-wider text-[10px] text-gray-700 block mb-1">
                    Khu vực địa lý:
                  </label>
                  <select
                    value={editForm.region}
                    onChange={(e) => setEditForm({ ...editForm, region: e.target.value })}
                    className="w-full p-2 border border-gray-300 bg-white focus:outline-none focus:border-black"
                  >
                    <option value="Miền Bắc">Miền Bắc</option>
                    <option value="Miền Trung">Miền Trung</option>
                    <option value="Miền Nam">Miền Nam</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-[10px] text-gray-700 block mb-1">
                  Tên tiếng Anh (English Name):
                </label>
                <input
                  type="text"
                  value={editForm.englishName}
                  onChange={(e) => setEditForm({ ...editForm, englishName: e.target.value })}
                  className="w-full p-2 border border-gray-300 focus:outline-none focus:border-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold uppercase tracking-wider text-[10px] text-gray-700 block mb-1">
                    Tên miền chính thức (.edu.vn):
                  </label>
                  <input
                    type="text"
                    value={editForm.officialDomain}
                    onChange={(e) => setEditForm({ ...editForm, officialDomain: e.target.value })}
                    className="w-full p-2 border border-gray-300 focus:outline-none focus:border-black font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold uppercase tracking-wider text-[10px] text-gray-700 block mb-1">
                    Tỉnh / Thành phố:
                  </label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full p-2 border border-gray-300 focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-[10px] text-gray-700 block mb-1">
                  Website chính thức (URL đầy đủ):
                </label>
                <input
                  type="text"
                  value={editForm.officialWebsite}
                  onChange={(e) => setEditForm({ ...editForm, officialWebsite: e.target.value })}
                  placeholder="https://vju.ac.vn"
                  className="w-full p-2 border border-gray-300 focus:outline-none focus:border-black font-mono"
                />
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-[10px] text-gray-700 block mb-1">
                  Bí danh tìm kiếm (phẩy ngăn cách):
                </label>
                <input
                  type="text"
                  value={editForm.aliasesText}
                  onChange={(e) => setEditForm({ ...editForm, aliasesText: e.target.value })}
                  placeholder="VJU, Đại học Việt Nhật, ĐHQGHN-VJU..."
                  className="w-full p-2 border border-gray-300 focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-[10px] text-gray-700 block mb-1">
                  Lý do cập nhật (ghi vào Audit Log):
                </label>
                <input
                  type="text"
                  value={editForm.reason}
                  onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                  placeholder="VD: Cập nhật tên miền và bổ sung bí danh trường..."
                  className="w-full p-2 border border-gray-300 focus:outline-none focus:border-black"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2 text-xs">
              <button
                onClick={() => setEditingUni(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold uppercase transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saveLoading}
                className="px-4 py-2 bg-black hover:bg-gray-900 text-white font-bold uppercase flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {saveLoading && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Lưu thay đổi</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
