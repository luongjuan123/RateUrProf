"use client";

import React, { useState } from "react";
import { submitCorrectionRequest } from "@/lib/dataService";
import { useTranslation } from "@/locales/i18n";
import { Flag, X, Send, AlertTriangle, CheckCircle2 } from "lucide-react";

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
      <div className="bg-white border-2 border-gray-900 rounded-none w-full max-w-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-[#e03a3e]" />
            <div>
              <h3 className="text-sm font-black uppercase tracking-tight text-gray-950">
                {t("provenance.reportData")}
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                Hồ sơ: <span className="text-gray-900 font-bold">{professorName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-black hover:bg-gray-200 rounded-none transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {statusMessage && (
            <div
              className={`p-3 rounded-none text-xs font-bold flex items-center gap-2 ${
                statusMessage.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                  : "bg-red-50 text-red-800 border border-red-300"
              }`}
            >
              {statusMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Type of Request */}
          <div className="space-y-1.5">
            <label className="font-bold text-gray-800 uppercase text-[10px] tracking-wider">
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
                  className={`p-2 border font-bold text-center rounded-none text-xs ${
                    requestType === opt.id
                      ? "bg-black text-white border-black"
                      : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Field selection */}
          <div className="space-y-1.5">
            <label className="font-bold text-gray-800 uppercase text-[10px] tracking-wider">
              Trường thông tin cần xử lý:
            </label>
            <select
              value={targetField}
              onChange={(e) => setTargetField(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-none bg-white font-medium focus:outline-none focus:border-black"
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
                <label className="font-bold text-gray-700 text-[10px] uppercase">
                  Giá trị hiện tại trên web:
                </label>
                <input
                  type="text"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  placeholder="Giá trị đang hiển thị..."
                  className="w-full p-2 border border-gray-300 rounded-none font-medium focus:outline-none focus:border-black"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-gray-700 text-[10px] uppercase">
                  Giá trị chính xác cần cập nhật:
                </label>
                <input
                  type="text"
                  value={proposedValue}
                  onChange={(e) => setProposedValue(e.target.value)}
                  placeholder="Giá trị chính xác..."
                  className="w-full p-2 border border-gray-300 rounded-none font-medium focus:outline-none focus:border-black"
                />
              </div>
            </div>
          )}

          {/* Evidence URL (Required) */}
          <div className="space-y-1">
            <label className="font-bold text-gray-800 uppercase text-[10px] tracking-wider flex items-center justify-between">
              <span>Liên kết nguồn minh chứng chính thức (*):</span>
              <span className="text-gray-400 font-normal lowercase">(website trường, quyết định bổ nhiệm...)</span>
            </label>
            <input
              type="url"
              required
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="https://... (URL trang khoa, phòng tổ chức cán bộ...)"
              className="w-full p-2.5 border border-gray-300 rounded-none font-mono text-xs focus:outline-none focus:border-black"
            />
          </div>

          {/* Detailed explanation */}
          <div className="space-y-1">
            <label className="font-bold text-gray-800 uppercase text-[10px] tracking-wider">
              Nội dung giải trình / Lý do:
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Vui lòng cung cấp bối cảnh hoặc đoạn văn bản chính thức đối chiếu..."
              className="w-full p-2.5 border border-gray-300 rounded-none font-medium focus:outline-none focus:border-black"
            />
          </div>

          {/* Submitter Contact */}
          <div className="space-y-1">
            <label className="font-bold text-gray-800 uppercase text-[10px] tracking-wider">
              Email liên hệ (để nhận thông báo kết quả thẩm định):
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="email@domain.edu.vn"
              className="w-full p-2.5 border border-gray-300 rounded-none font-medium focus:outline-none focus:border-black"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 font-bold uppercase rounded-none hover:bg-gray-100"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-[#e03a3e] hover:bg-[#b91c1c] text-white font-bold uppercase rounded-none flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? "Đang gửi..." : "Gửi yêu cầu xác minh"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
