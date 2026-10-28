"use client";

import React from "react";
import Link from "next/link";

interface BrandLogoProps {
  locale?: string;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ locale = "vi", className = "" }) => {
  return (
    <Link href={`/${locale}`} className={`flex items-center gap-3 group select-none ${className}`}>
      <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#1d4ed8] border border-[#1d4ed8] flex items-center justify-center font-black text-xs sm:text-sm tracking-wider shrink-0 group-hover:bg-[#1e40af] transition-colors text-white">
        <span>RU</span><span className="text-blue-200">P</span>
      </div>
      <span className="font-extrabold sm:font-black text-2xl sm:text-[28px] lg:text-[32px] tracking-tight leading-none text-slate-900 whitespace-nowrap">
        <span>RateUr</span><span className="text-[#1d4ed8]">Profs</span>
      </span>
    </Link>
  );
};

export default BrandLogo;
