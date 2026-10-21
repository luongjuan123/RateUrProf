"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  GitMerge,
  RotateCw,
  RefreshCw,
  Building2,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  FileCheck,
  ExternalLink,
} from "lucide-react";

interface DuplicateCandidate {
  id: string;
  name: string;
  shortName: string;
  domain: string | null;
  totalProfessors: number;
}

interface DuplicateGroup {
  id: string;
  canonicalId: string;
  canonicalName: string;
  duplicateIds: string[];
  confidence: "high" | "medium" | "low";
  reason: string;
  candidates: DuplicateCandidate[];
}

interface MergePreview {
  canonical: DuplicateCandidate;
  duplicates: DuplicateCandidate[];
  impact: {
    affiliationsToReassign: number;
    reviewsToReassign: number;
    schoolReviewsToReassign: number;
    aliasesToCreate: string[];
    totalMergedInstitutions: number;
  };
}

export function DataQualitySection() {
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null);
  const [preview, setPreview] = useState<MergePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [mergeLoading, setMergeLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchDuplicates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/duplicates");
      const data = await res.json();
      if (data.success) {
        setGroups(data.duplicateGroups || []);
      }
    } catch (err) {
      console.error("Fetch duplicates error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDuplicates();
  }, [fetchDuplicates]);

  const handleOpenPreview = async (group: DuplicateGroup) => {
    setSelectedGroup(group);
    setPreview(null);
    setPreviewLoading(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/duplicates/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canonicalId: group.canonicalId,
          duplicateIds: group.duplicateIds,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPreview(data.preview);
      } else {
        setFeedback({ type: "error", message: data.error || "Không thể tạo kế hoạch gộp." });
      }
    } catch (err) {
      setFeedback({ type: "error", message: err instanceof Error ? err.message : "Lỗi kết nối xem trước." });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExecuteMerge = async () => {
    if (!selectedGroup) return;
    setMergeLoading(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/duplicates/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canonicalId: selectedGroup.canonicalId,
          duplicateIds: selectedGroup.duplicateIds,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: "success",
          message: `Gộp thành công ${data.mergedCount} trường vào [${selectedGroup.canonicalName}]! Tổng số giảng viên sau khi gộp: ${data.newProfCount}.`,
        });
        setSelectedGroup(null);
        setPreview(null);
        await fetchDuplicates();
      } else {
        setFeedback({ type: "error", message: data.error || "Lỗi thực thi gộp bản ghi." });
      }
    } catch (err) {
      setFeedback({ type: "error", message: err instanceof Error ? err.message : "Lỗi kết nối." });
    } finally {
      setMergeLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-gray-900">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-gray-950 flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-[#e03a3e]" />
            <span>Chất lượng Dữ liệu & Xử lý Trùng lặp Thực thể</span>
          </h2>
          <p className="text-xs text-gray-600 mt-1">
            Thuật toán rà soát tự động phát hiện các cụm cơ sở giáo dục bị phân mảnh do crawl, OpenAlex và cổng đăng ký
          </p>
        </div>
        <button
          onClick={fetchDuplicates}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold uppercase transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Quét lại trùng lặp</span>
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

      {/* Notice card for Vietnam Japan University */}
      <div className="p-4 bg-amber-50 border-2 border-amber-300 text-xs text-amber-950 space-y-1.5">
        <div className="flex items-center gap-2 font-bold text-amber-900 uppercase">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Quy trình Hợp nhất Chuẩn (ACID Safe Merge Protocol)</span>
        </div>
        <p className="text-[11px] text-amber-900 leading-relaxed">
          Mọi thao tác gộp cơ sở giáo dục đều được thực thi trong một transaction khép kín: tự động chuyển toàn bộ hồ sơ giảng viên (affiliations), đánh giá trường (school_reviews), đánh giá giảng viên (reviews) sang ID chuẩn, đồng thời lưu trữ các mã cũ làm bí danh (aliases) để đảm bảo không bị đứt gãy liên kết công khai.
        </p>
      </div>

      {/* Duplicate Groups List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-gray-500 font-mono bg-white border-2 border-gray-900">
            <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-900" />
            Đang đối soát toàn bộ cơ sở dữ liệu để tìm kiếm các bản ghi trùng lặp...
          </div>
        ) : groups.length === 0 ? (
          <div className="p-12 text-center bg-white border-2 border-gray-900 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <div className="font-bold text-gray-950 text-sm">Cơ sở dữ liệu hoàn toàn sạch</div>
            <div className="text-xs text-gray-500">
              Không phát hiện thấy cụm trùng lặp tên trường hoặc tên miền nào cần xử lý.
            </div>
          </div>
        ) : (
          groups.map((grp) => (
            <div
              key={grp.id}
              className="bg-white border-2 border-gray-900 p-5 space-y-4 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-200 gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-red-100 text-red-900 text-[10px] font-black uppercase border border-red-300">
                      Độ tin cậy {grp.confidence.toUpperCase()}
                    </span>
                    <h3 className="font-extrabold text-gray-950 text-sm">
                      {grp.canonicalName}
                    </h3>
                  </div>
                  <div className="text-xs text-gray-600">{grp.reason}</div>
                </div>

                <button
                  onClick={() => handleOpenPreview(grp)}
                  className="px-4 py-2 bg-black hover:bg-gray-800 text-white text-xs font-bold uppercase transition-colors shrink-0"
                >
                  Xem trước &amp; Gộp bản ghi
                </button>
              </div>

              {/* Candidate Records Table */}
              <div className="overflow-x-auto border border-gray-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-[10px] border-b border-gray-200">
                    <tr>
                      <th className="p-2.5">Trạng thái</th>
                      <th className="p-2.5">Mã ID</th>
                      <th className="p-2.5">Tên cơ sở giáo dục</th>
                      <th className="p-2.5">Viết tắt</th>
                      <th className="p-2.5">Tên miền</th>
                      <th className="p-2.5 text-right">Giảng viên</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-mono text-[11px]">
                    {grp.candidates.map((cand) => {
                      const isCanonical = cand.id === grp.canonicalId;
                      return (
                        <tr
                          key={cand.id}
                          className={isCanonical ? "bg-emerald-50/60 font-semibold" : "hover:bg-gray-50"}
                        >
                          <td className="p-2.5 font-sans">
                            {isCanonical ? (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 text-[10px] font-black uppercase border border-emerald-300">
                                Bản ghi Chuẩn
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-bold uppercase border border-amber-300">
                                Bản ghi Trùng
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 font-bold text-gray-950">{cand.id}</td>
                          <td className="p-2.5 font-sans text-gray-900">{cand.name}</td>
                          <td className="p-2.5 text-gray-700">{cand.shortName || "—"}</td>
                          <td className="p-2.5 text-blue-700">{cand.domain || "—"}</td>
                          <td className="p-2.5 text-right font-bold text-gray-950">
                            {cand.totalProfessors}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Merge Preview & Confirmation Modal */}
      {selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl bg-white border-2 border-gray-900 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-gray-950 flex items-center gap-2">
                <GitMerge className="w-4 h-4 text-[#e03a3e]" />
                <span>Kế hoạch Gộp Thực thể Chuẩn</span>
              </h3>
              <button
                onClick={() => { setSelectedGroup(null); setPreview(null); }}
                className="p-1 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {previewLoading ? (
              <div className="py-12 text-center text-xs text-gray-500 font-mono">
                <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-900" />
                Đang phân tích liên kết dữ liệu và kiểm tra toàn vẹn quan hệ...
              </div>
            ) : preview ? (
              <div className="space-y-4 text-xs">
                {/* Canonical Destination */}
                <div className="p-3.5 bg-emerald-50 border border-emerald-300 space-y-1">
                  <div className="text-[10px] font-bold uppercase text-emerald-800">Cơ sở giáo dục Chuẩn (Đích đến duy nhất)</div>
                  <div className="text-sm font-black text-emerald-950">{preview.canonical.name}</div>
                  <div className="text-[11px] font-mono text-emerald-800">
                    ID: {preview.canonical.id} • Tên miền: {preview.canonical.domain || "—"} • Giảng viên hiện tại: {preview.canonical.totalProfessors}
                  </div>
                </div>

                {/* Duplicates to Merge */}
                <div>
                  <div className="text-[10px] font-bold uppercase text-gray-500 mb-1.5">
                    Các bản ghi trùng lặp sẽ gộp và xóa ({preview.duplicates.length} trường):
                  </div>
                  <div className="space-y-1 font-mono text-[11px]">
                    {preview.duplicates.map((d) => (
                      <div key={d.id} className="p-2 bg-gray-50 border border-gray-200 flex items-center justify-between">
                        <span>{d.name} ({d.id})</span>
                        <span className="text-gray-500 font-sans">{d.totalProfessors} giảng viên</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Impact Summary */}
                <div className="p-3 bg-gray-100 border border-gray-300 space-y-1.5">
                  <div className="text-[10px] font-bold uppercase text-gray-700">Dự kiến Thay đổi trong Giao dịch ACID:</div>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    <li>Chuyển <span className="font-bold text-gray-950">{preview.impact.affiliationsToReassign}</span> liên kết giảng viên (affiliations) sang mã {preview.canonical.id}.</li>
                    <li>Chuyển <span className="font-bold text-gray-950">{preview.impact.reviewsToReassign}</span> đánh giá giảng viên & <span className="font-bold text-gray-950">{preview.impact.schoolReviewsToReassign}</span> đánh giá trường sang {preview.canonical.id}.</li>
                    <li>Thêm <span className="font-bold text-gray-950">{preview.impact.aliasesToCreate.length}</span> bí danh tìm kiếm mới vào bảng <span className="font-mono">institution_aliases</span>.</li>
                    <li>Xóa an toàn các bản ghi thừa để người dùng tìm kiếm chỉ thấy 1 kết quả duy nhất.</li>
                  </ul>
                </div>
              </div>
            ) : null}

            <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2 text-xs">
              <button
                onClick={() => { setSelectedGroup(null); setPreview(null); }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold uppercase transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleExecuteMerge}
                disabled={mergeLoading || !preview}
                className="px-4 py-2 bg-[#e03a3e] hover:bg-red-700 text-white font-bold uppercase flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {mergeLoading && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Xác nhận thực thi Gộp (ACID Transaction)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
