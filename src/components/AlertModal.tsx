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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white border border-gray-200 overflow-hidden">
        {/* Editorial Top Accent Stripe */}
        <div className={`h-1 ${stripeColor} w-full`} />

        {/* Modal Header */}
        <div className="px-6 pt-5 pb-4 flex items-start justify-between border-b border-gray-200 bg-white">
          <div className="space-y-1">
            <span className="inline-block text-[10px] font-mono font-bold uppercase tracking-widest bg-gray-100 text-black border border-gray-200 px-2 py-0.5">
              {badge}
            </span>
            <h3 className="text-lg font-bold text-black tracking-tight flex items-center gap-2">
              <IconComponent className="w-5 h-5 shrink-0" />
              <span>{title}</span>
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1 border border-gray-200 text-gray-500 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <PopArtX className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-800 leading-relaxed font-normal">
            {message}
          </p>

          {/* Optional Action Link (e.g. Google Account Management) */}
          {actionHref && actionText && (
            <div className="pt-2">
              <a
                href={actionHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 text-black text-xs font-bold uppercase tracking-wider border border-gray-200 transition-colors"
              >
                <span>{actionText}</span>
                <PopArtExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
          {onConfirm ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white hover:bg-gray-100 text-black font-bold text-xs uppercase tracking-wider border border-gray-200 transition-colors cursor-pointer"
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
                    ? "bg-[#e03a3e] hover:bg-red-700 text-white border border-[#e03a3e]"
                    : "bg-black hover:bg-gray-800 text-white border border-black"
                } font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer`}
              >
                {confirmText || "Xác nhận"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-black hover:bg-gray-800 text-white font-bold text-xs uppercase tracking-wider border border-black transition-colors cursor-pointer"
            >
              {confirmText || "Đã hiểu"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
