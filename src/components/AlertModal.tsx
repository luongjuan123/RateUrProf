"use client";

import React from "react";
import {
  PopArtX,
  PopArtExternalLink,
  PopArtShield,
  PopArtAlertCircle,
  PopArtCheck,
  PopArtAlertTriangle,
} from "@/components/icons/PopArtIcons";

export interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  badge?: string;
  message: string;
  type?: "info" | "warning" | "success" | "danger";
  actionText?: string;
  actionHref?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  title,
  badge = "Thông báo hệ thống",
  message,
  type = "info",
  actionText,
  actionHref,
  confirmText,
  cancelText,
  onConfirm,
}) => {
  if (!isOpen) return null;

  const stripeColor =
    type === "danger"
      ? "bg-[#e03a3e]"
      : type === "success"
      ? "bg-[#6ee7b7]"
      : type === "warning"
      ? "bg-[#fef9c3]"
      : "bg-[#e0f2fe]";

  const IconComponent =
    type === "danger"
      ? PopArtAlertCircle
      : type === "success"
      ? PopArtCheck
      : type === "warning"
      ? PopArtAlertTriangle
      : PopArtShield;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white border-3 border-black shadow-[8px_8px_0px_#000] animate-in zoom-in-95 duration-150">
        {/* Editorial Top Accent Stripe */}
        <div className={`h-2.5 ${stripeColor} border-b-2 border-black w-full`} />

        {/* Modal Header */}
        <div className="px-6 pt-5 pb-4 flex items-start justify-between border-b-2 border-black bg-white">
          <div className="space-y-1">
            <span className="inline-block text-[10px] font-mono font-black uppercase tracking-widest bg-[#fef9c3] text-black border border-black px-2 py-0.5 shadow-[1px_1px_0px_#000]">
              {badge}
            </span>
            <h3 className="text-lg font-black text-black tracking-tight flex items-center gap-2">
              <IconComponent className="w-5 h-5 shrink-0" />
              <span>{title}</span>
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1 border-2 border-black text-black hover:bg-black hover:text-white transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <PopArtX className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-800 leading-relaxed font-medium">
            {message}
          </p>

          {/* Optional Action Link (e.g. Google Account Management) */}
          {actionHref && actionText && (
            <div className="pt-2">
              <a
                href={actionHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#e0f2fe] hover:bg-[#bae6fd] text-black text-xs font-black uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
              >
                <span>{actionText}</span>
                <PopArtExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t-2 border-black flex items-center justify-end gap-3">
          {onConfirm ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white hover:bg-gray-100 text-black font-bold text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer"
              >
                {cancelText || "Hủy bỏ"}
              </button>
              <button
                type="button"
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`px-5 py-2 ${
                  type === "danger"
                    ? "bg-[#e03a3e] hover:bg-red-700 text-white"
                    : "bg-[#fef9c3] hover:bg-yellow-200 text-black"
                } font-black text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer`}
              >
                {confirmText || "Xác nhận"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-[#fef9c3] hover:bg-yellow-200 text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer"
            >
              {confirmText || "Đã hiểu"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
