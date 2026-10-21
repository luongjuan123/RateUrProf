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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200">
      <div className="bg-white border-3 border-black shadow-[8px_8px_0px_#000] rounded-none w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b-2 border-black bg-white">
          <div className="flex items-center gap-2">
            <PopArtFlag className="w-5 h-5" />
            <div>
              <h3 className="text-sm font-mono font-black uppercase tracking-wider text-black">
                {t("provenance.reportData")}
              </h3>
              <p className="text-xs font-mono text-gray-700 font-medium">
                Hồ sơ: <span className="text-black font-black">{professorName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t("common.close")}
            className="p-1 border-2 border-black bg-white text-black shadow-[2px_2px_0px_#000] hover:bg-[#fee2e2] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer rounded-none"
          >
            <PopArtX className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs font-mono bg-white">
          {statusMessage && (
            <div
              className={`p-3 rounded-none text-xs font-mono font-black flex items-center gap-2 border-2 border-black shadow-[2px_2px_0px_#000] ${
                statusMessage.type === "success"
                  ? "bg-[#6ee7b7] text-black"
                  : "bg-[#fee2e2] text-black"
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
            <label className="font-mono font-black text-black uppercase text-[10px] tracking-wider">
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
                  className={`p-2 border-2 border-black font-mono font-black text-center rounded-none text-xs transition-all cursor-pointer shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${
                    requestType === opt.id
                      ? "bg-black text-[#fef9c3]"
                      : "bg-white text-black hover:bg-[#fef9c3]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Field selection */}
          <div className="space-y-1.5">
            <label className="font-mono font-black text-black uppercase text-[10px] tracking-wider">
              Trường thông tin cần xử lý:
            </label>
            <select
              value={targetField}
              onChange={(e) => setTargetField(e.target.value)}
              className="w-full p-2.5 border-2 border-black rounded-none bg-white font-mono font-bold text-xs shadow-[2px_2px_0px_#000] outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus:bg-[#fef9c3]/30 text-black"
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
                <label className="font-mono font-black text-black text-[10px] uppercase">
                  Giá trị hiện tại trên web:
                </label>
                <input
                  type="text"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  placeholder="Giá trị đang hiển thị..."
                  className="w-full p-2.5 border-2 border-black rounded-none font-mono text-xs shadow-[2px_2px_0px_#000] outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus:bg-[#fef9c3]/30 text-black bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="font-mono font-black text-black text-[10px] uppercase">
                  Giá trị chính xác cần cập nhật:
                </label>
                <input
                  type="text"
                  value={proposedValue}
                  onChange={(e) => setProposedValue(e.target.value)}
                  placeholder="Giá trị chính xác..."
                  className="w-full p-2.5 border-2 border-black rounded-none font-mono text-xs shadow-[2px_2px_0px_#000] outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus:bg-[#fef9c3]/30 text-black bg-white"
                />
              </div>
            </div>
          )}

          {/* Evidence URL (Required) */}
          <div className="space-y-1">
            <label className="font-mono font-black text-black uppercase text-[10px] tracking-wider flex items-center justify-between">
              <span>Liên kết nguồn minh chứng chính thức (*):</span>
              <span className="text-gray-500 font-normal lowercase">(website trường, quyết định...)</span>
            </label>
            <input
              type="url"
              required
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="https://..."
              className="w-full p-2.5 border-2 border-black rounded-none font-mono text-xs shadow-[2px_2px_0px_#000] outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus:bg-[#fef9c3]/30 text-black bg-white"
            />
          </div>

          {/* Detailed explanation */}
          <div className="space-y-1">
            <label className="font-mono font-black text-black uppercase text-[10px] tracking-wider">
              Nội dung giải trình / Lý do:
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Vui lòng cung cấp bối cảnh hoặc đoạn văn bản chính thức đối chiếu..."
              className="w-full p-2.5 border-2 border-black rounded-none font-mono text-xs shadow-[2px_2px_0px_#000] outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus:bg-[#fef9c3]/30 text-black bg-white"
            />
          </div>

          {/* Submitter Contact */}
          <div className="space-y-1">
            <label className="font-mono font-black text-black uppercase text-[10px] tracking-wider">
              Email liên hệ (để nhận thông báo kết quả thẩm định):
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="email@domain.edu.vn"
              className="w-full p-2.5 border-2 border-black rounded-none font-mono text-xs shadow-[2px_2px_0px_#000] outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus:bg-[#fef9c3]/30 text-black bg-white"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t-2 border-black flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border-2 border-black shadow-[2px_2px_0px_#000] text-black font-mono font-black uppercase rounded-none bg-white hover:bg-black/5 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-[#e03a3e] hover:bg-black text-white font-mono font-black uppercase rounded-none border-2 border-black shadow-[4px_4px_0px_#000] flex items-center gap-1.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
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
