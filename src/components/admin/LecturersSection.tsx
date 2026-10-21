"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  GraduationCap,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Edit,
  RotateCw,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Building2,
  X,
} from "lucide-react";

interface AdminLecturer {
  id: string;
  name: string;
  title: string | null;
  academicTitle: string | null;
  academicRank: string | null;
  degree: string | null;
  position: string | null;
  avatar: string | null;
  verificationStatus: string;
  ratingAverage: number | null;
  ratingCount: number;
  universityId: string | null;
  universityName: string | null;
  universityShortName: string | null;
  faculty: string | null;
  department: string | null;
  createdAt: number;
  updatedAt: number | null;
}

export function LecturersSection() {
  const [lecturers, setLecturers] = useState<AdminLecturer[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [rankFilter, setRankFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");

  // Edit Modal State
  const [editingLecturer, setEditingLecturer] = useState<AdminLecturer | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    title: "",
    academicRank: "",
    degree: "",
    position: "",
    faculty: "",
    department: "",
    verificationStatus: "verified",
    reason: "",
  });
  const [saveLoading, setSaveLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchLecturers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "15",
      });
      if (search.trim()) params.append("search", search.trim());
      if (rankFilter !== "all") params.append("rank", rankFilter);
      if (verificationFilter !== "all") params.append("verificationStatus", verificationFilter);

      const res = await fetch(`/api/admin/lecturers?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLecturers(data.items || []);
        setTotalCount(data.totalCount || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error("Fetch lecturers error:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, rankFilter, verificationFilter]);

  useEffect(() => {
    fetchLecturers();
  }, [fetchLecturers]);

  const handleOpenEdit = (l: AdminLecturer) => {
    setEditingLecturer(l);
    setEditForm({
      name: l.name,
      title: l.title || "",
      academicRank: l.academicRank || "",
      degree: l.degree || "",
      position: l.position || "",
      faculty: l.faculty || "",
      department: l.department || "",
      verificationStatus: l.verificationStatus || "verified",
      reason: "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingLecturer) return;
    setSaveLoading(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/lecturers/${editingLecturer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: "success",
          message: `Cập nhật hồ sơ giảng viên [${editForm.name}] thành công!`,
        });
        setEditingLecturer(null);
        await fetchLecturers();
      } else {
        setFeedback({
          type: "error",
          message: data.error || "Không thể cập nhật hồ sơ giảng viên.",
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
            <GraduationCap className="w-5 h-5 text-emerald-600" />
            <span>Quản lý Hồ sơ Giảng viên Toàn quốc</span>
          </h2>
          <p className="text-xs text-gray-600 mt-1">
            Tổng cộng {totalCount.toLocaleString("vi-VN")} giảng viên được lưu trữ trong Google Cloud SQL
          </p>
        </div>
        <button
          onClick={fetchLecturers}
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
            placeholder="Tìm theo họ tên giảng viên, trường hoặc khoa (VD: Nguyễn Thanh Tùng, Bách Khoa)..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 focus:outline-none focus:border-black"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={rankFilter}
            onChange={(e) => {
              setRankFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs border border-gray-300 bg-white font-medium focus:outline-none focus:border-black"
          >
            <option value="all">Tất cả chức danh</option>
            <option value="GS">Giáo sư (GS)</option>
            <option value="PGS">Phó Giáo sư (PGS)</option>
          </select>

          <select
            value={verificationFilter}
            onChange={(e) => {
              setVerificationFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs border border-gray-300 bg-white font-medium focus:outline-none focus:border-black"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="verified">Đã xác minh</option>
            <option value="unverified">Chờ đối soát</option>
          </select>
        </div>
      </div>

      {/* Lecturers Table */}
      <div className="bg-white border-2 border-gray-900 overflow-x-auto shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-[10px] border-b-2 border-gray-900">
            <tr>
              <th className="p-3 border-r border-gray-200">Giảng viên</th>
              <th className="p-3 border-r border-gray-200">Học hàm / Học vị</th>
              <th className="p-3 border-r border-gray-200">Trường đại học</th>
              <th className="p-3 border-r border-gray-200">Khoa / Bộ môn</th>
              <th className="p-3 border-r border-gray-200">Đánh giá</th>
              <th className="p-3 border-r border-gray-200">Xác thực</th>
              <th className="p-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 font-sans">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-gray-500 font-mono">
                  <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-900" />
                  Đang truy vấn hơn 97,000 giảng viên từ cơ sở dữ liệu...
                </td>
              </tr>
            ) : lecturers.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-gray-500 font-mono">
                  Không tìm thấy hồ sơ giảng viên nào khớp với điều kiện tìm kiếm.
                </td>
              </tr>
            ) : (
              lecturers.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-3 border-r border-gray-100">
                    <div className="font-bold text-gray-950 text-xs">{l.name}</div>
                    <div className="text-[10px] font-mono text-gray-400 mt-0.5">{l.id}</div>
                  </td>
                  <td className="p-3 border-r border-gray-100">
                    {l.academicRank === "GS" ? (
                      <span className="px-1.5 py-0.5 bg-red-100 text-red-900 font-bold text-[10px] uppercase">GS</span>
                    ) : l.academicRank === "PGS" ? (
                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-900 font-bold text-[10px] uppercase">PGS</span>
                    ) : (
                      <span className="text-gray-500 text-[11px] font-mono">{l.degree || "ThS/TS"}</span>
                    )}
                  </td>
                  <td className="p-3 border-r border-gray-100">
                    <div className="font-bold text-gray-900">{l.universityShortName || l.universityId || "—"}</div>
                    <div className="text-[11px] text-gray-500 truncate max-w-xs">{l.universityName}</div>
                  </td>
                  <td className="p-3 border-r border-gray-100 text-[11px] text-gray-700">
                    <div>{l.faculty || "—"}</div>
                    {l.department && <div className="text-[10px] text-gray-400">{l.department}</div>}
                  </td>
                  <td className="p-3 border-r border-gray-100 font-mono font-bold">
                    {l.ratingAverage ? (
                      <span className="text-emerald-700">{l.ratingAverage.toFixed(1)} ★ ({l.ratingCount})</span>
                    ) : (
                      <span className="text-gray-400">Chưa có ({l.ratingCount})</span>
                    )}
                  </td>
                  <td className="p-3 border-r border-gray-100">
                    {l.verificationStatus === "verified" ? (
                      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                        Đã duyệt
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase">
                        Chờ soát
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleOpenEdit(l)}
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
            Trang {page} / {totalPages} ({totalCount.toLocaleString("vi-VN")} giảng viên)
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

      {/* Edit Lecturer Modal */}
      {editingLecturer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white border-2 border-gray-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-gray-950 flex items-center gap-2">
                <Edit className="w-4 h-4 text-emerald-600" />
                <span>Chỉnh sửa Hồ sơ Giảng viên</span>
              </h3>
              <button onClick={() => setEditingLecturer(null)} className="p-1 hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold uppercase tracking-wider text-[10px] text-gray-700 block mb-1">
                    Họ và tên:
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full p-2 border border-gray-300 focus:outline-none focus:border-black font-semibold"
                  />
                </div>
                <div>
                  <label className="font-bold uppercase tracking-wider text-[10px] text-gray-700 block mb-1">
                    Học hàm (GS / PGS):
                  </label>
                  <select
                    value={editForm.academicRank}
                    onChange={(e) => setEditForm({ ...editForm, academicRank: e.target.value })}
                    className="w-full p-2 border border-gray-300 bg-white focus:outline-none focus:border-black"
                  >
                    <option value="">Không có</option>
                    <option value="GS">Giáo sư (GS)</option>
                    <option value="PGS">Phó Giáo sư (PGS)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold uppercase tracking-wider text-[10px] text-gray-700 block mb-1">
                    Học vị (TS / ThS):
                  </label>
                  <input
                    type="text"
                    value={editForm.degree}
                    onChange={(e) => setEditForm({ ...editForm, degree: e.target.value })}
                    className="w-full p-2 border border-gray-300 focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="font-bold uppercase tracking-wider text-[10px] text-gray-700 block mb-1">
                    Chức vụ / Vị trí:
                  </label>
                  <input
                    type="text"
                    value={editForm.position}
                    onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                    className="w-full p-2 border border-gray-300 focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold uppercase tracking-wider text-[10px] text-gray-700 block mb-1">
                    Khoa / Trường thành viên:
                  </label>
                  <input
                    type="text"
                    value={editForm.faculty}
                    onChange={(e) => setEditForm({ ...editForm, faculty: e.target.value })}
                    className="w-full p-2 border border-gray-300 focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="font-bold uppercase tracking-wider text-[10px] text-gray-700 block mb-1">
                    Bộ môn:
                  </label>
                  <input
                    type="text"
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    className="w-full p-2 border border-gray-300 focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-[10px] text-gray-700 block mb-1">
                  Trạng thái đối soát:
                </label>
                <select
                  value={editForm.verificationStatus}
                  onChange={(e) => setEditForm({ ...editForm, verificationStatus: e.target.value })}
                  className="w-full p-2 border border-gray-300 bg-white focus:outline-none focus:border-black"
                >
                  <option value="verified">Đã xác minh (Verified .edu.vn)</option>
                  <option value="unverified">Chưa xác minh / Chờ bổ sung</option>
                </select>
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-[10px] text-gray-700 block mb-1">
                  Lý do cập nhật (ghi vào Audit Log):
                </label>
                <input
                  type="text"
                  value={editForm.reason}
                  onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                  placeholder="VD: Cập nhật chức danh theo thông báo mới nhất của trường..."
                  className="w-full p-2 border border-gray-300 focus:outline-none focus:border-black"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2 text-xs">
              <button
                onClick={() => setEditingLecturer(null)}
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
