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
      <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#fef9c3] border-2 border-black flex items-center justify-center font-black text-xs sm:text-sm tracking-wider shrink-0 shadow-[2px_2px_0px_0px_#000000] group-hover:-translate-x-[1px] group-hover:-translate-y-[1px] group-hover:shadow-[3px_3px_0px_0px_#000000] transition-all">
        <span className="text-black">RU</span><span className="text-[#e03a3e]">P</span>
      </div>
      <span className="font-extrabold sm:font-black text-2xl sm:text-[28px] lg:text-[32px] tracking-tight leading-none text-black whitespace-nowrap">
        <span>RateUr</span><span className="text-[#e03a3e]">Profs</span>
      </span>
    </Link>
  );
};

export default BrandLogo;
