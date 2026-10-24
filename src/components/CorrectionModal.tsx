"use client";

import React, { useState } from "react";
import { submitCorrectionRequest } from "@/lib/dataService";
import { useTranslation } from "@/locales/i18n";
import {
  PopArtFlag,
  PopArtX,
  PopArtSend,
  PopArtAlertTriangle,
  PopArtCheck,
} from "@/components/icons/PopArtIcons";

interface CorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  professorId: string;
  professorName: string;
  universityId: string;
  initialField?: string;
}

export const CorrectionModal: React.FC<CorrectionModalProps> = ({
  isOpen,
  onClose,
  professorId,
  professorName,
  universityId,
  initialField = "thong_tin_chung",
}) => {
  const { t } = useTranslation();

  const [requestType, setRequestType] = useState<"correction" | "removal" | "conflict_report">("correction");
  const [targetField, setTargetField] = useState(initialField);
  const [currentValue, setCurrentValue] = useState("");
  const [proposedValue, setProposedValue] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceUrl.trim()) {
      setStatusMessage({ text: "Vui lòng cung cấp liên kết nguồn minh chứng chính thức.", type: "error" });
      return;
    }

    try {
      setLoading(true);
      const res = await submitCorrectionRequest({
        professorId,
        professorName,
        universityId,
        requestType,
        targetField,
        currentValue: currentValue.trim() || undefined,
        proposedValue: proposedValue.trim() || undefined,
        evidenceUrl: evidenceUrl.trim(),
        notes: notes.trim(),
        contactEmail: contactEmail.trim() || undefined,
      });

      if (res.success) {
        setStatusMessage({ text: t("provenance.correctionSuccess"), type: "success" });
        setTimeout(() => {
          onClose();
          setStatusMessage(null);
        }, 2500);
      } else {
        setStatusMessage({ text: res.error || "Lỗi gửi yêu cầu.", type: "error" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-150">
      <div className="bg-white border border-gray-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2">
            <PopArtFlag className="w-5 h-5" />
            <div>
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-black">
                {t("provenance.reportData")}
              </h3>
              <p className="text-xs font-mono text-gray-600 font-medium">
                Hồ sơ: <span className="text-black font-bold">{professorName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t("common.close")}
            className="p-1 border border-gray-200 bg-white text-gray-500 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <PopArtX className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs font-mono bg-white">
          {statusMessage && (
            <div
              className={`p-3 text-xs font-mono font-bold flex items-center gap-2 border ${
                statusMessage.type === "success"
                  ? "bg-[#dcfce7] text-[#166534] border-green-200"
                  : "bg-[#fee2e2] text-[#991b1b] border-red-200"
              }`}
            >
              {statusMessage.type === "success" ? (
                <PopArtCheck className="w-4 h-4" />
              ) : (
                <PopArtAlertTriangle className="w-4 h-4" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Type of Request */}
          <div className="space-y-1.5">
            <label className="font-mono font-bold text-black uppercase text-[10px] tracking-wider">
              Loại yêu cầu / Request Type:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "correction", label: "Đính chính dữ liệu" },
                { id: "removal", label: "Yêu cầu gỡ bỏ" },
                { id: "conflict_report", label: "Báo cáo xung đột" },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setRequestType(opt.id as "correction" | "removal" | "conflict_report")}
                  className={`p-2 border font-mono font-bold text-center text-xs transition-colors cursor-pointer ${
                    requestType === opt.id
                      ? "bg-black text-white border-black"
                      : "bg-white text-black border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Field selection */}
          <div className="space-y-1.5">
            <label className="font-mono font-bold text-black uppercase text-[10px] tracking-wider">
              Trường thông tin cần xử lý:
            </label>
            <select
              value={targetField}
              onChange={(e) => setTargetField(e.target.value)}
              className="w-full p-2.5 border border-gray-200 bg-white font-mono font-bold text-xs outline-none focus:outline-none focus:border-black text-black"
            >
              <option value="name">Họ và tên giảng viên</option>
              <option value="academicTitle">Học hàm / Học vị</option>
              <option value="faculty">Khoa / Viện đào tạo</option>
              <option value="department">Bộ môn chuyên môn</option>
              <option value="courses">Môn học giảng dạy</option>
              <option value="photo">Ảnh đại diện</option>
              <option value="bio">Tiểu sử học thuật</option>
              <option value="all">Toàn bộ hồ sơ (Yêu cầu gỡ bỏ)</option>
            </select>
          </div>

          {/* Proposed Correction Value */}
          {requestType !== "removal" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-mono font-bold text-black text-[10px] uppercase">
                  Giá trị hiện tại trên web:
                </label>
                <input
                  type="text"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  placeholder="Giá trị đang hiển thị..."
                  className="w-full p-2.5 border border-gray-200 font-mono text-xs outline-none focus:outline-none focus:border-black text-black bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="font-mono font-bold text-black text-[10px] uppercase">
                  Giá trị chính xác cần cập nhật:
                </label>
                <input
                  type="text"
                  value={proposedValue}
                  onChange={(e) => setProposedValue(e.target.value)}
                  placeholder="Giá trị chính xác..."
                  className="w-full p-2.5 border border-gray-200 font-mono text-xs outline-none focus:outline-none focus:border-black text-black bg-white"
                />
              </div>
            </div>
          )}

          {/* Evidence URL (Required) */}
          <div className="space-y-1">
            <label className="font-mono font-bold text-black uppercase text-[10px] tracking-wider flex items-center justify-between">
              <span>Liên kết nguồn minh chứng chính thức (*):</span>
              <span className="text-gray-500 font-normal lowercase">(website trường, quyết định...)</span>
            </label>
            <input
              type="url"
              required
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="https://..."
              className="w-full p-2.5 border border-gray-200 font-mono text-xs outline-none focus:outline-none focus:border-black text-black bg-white"
            />
          </div>

          {/* Detailed explanation */}
          <div className="space-y-1">
            <label className="font-mono font-bold text-black uppercase text-[10px] tracking-wider">
              Nội dung giải trình / Lý do:
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Vui lòng cung cấp bối cảnh hoặc đoạn văn bản chính thức đối chiếu..."
              className="w-full p-2.5 border border-gray-200 font-mono text-xs outline-none focus:outline-none focus:border-black text-black bg-white"
            />
          </div>

          {/* Submitter Contact */}
          <div className="space-y-1">
            <label className="font-mono font-bold text-black uppercase text-[10px] tracking-wider">
              Email liên hệ (để nhận thông báo kết quả thẩm định):
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="email@domain.edu.vn"
              className="w-full p-2.5 border border-gray-200 font-mono text-xs outline-none focus:outline-none focus:border-black text-black bg-white"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 text-black font-mono font-bold uppercase bg-white hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-[#e03a3e] hover:bg-[#b91c1c] text-white font-mono font-bold uppercase border border-[#e03a3e] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <PopArtSend className="w-3.5 h-3.5" />
              <span>{loading ? "Đang gửi..." : "Gửi yêu cầu xác minh"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
