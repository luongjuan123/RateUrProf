"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getProfessors, getUniversities, ensureDatabaseSeeded } from "@/lib/dataService";
import { INITIAL_PROFESSORS, INITIAL_UNIVERSITIES, INITIAL_REVIEWS } from "@/lib/initialData";
import { Professor, University, Review } from "@/types";
import {
  Search,
  Star,
  ArrowRight,
  TrendingUp,
  MapPin,
  Building2,
  BookOpen,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Award
} from "lucide-react";
import RagSearchAssistant from "@/components/RagSearchAssistant";

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [professors, setProfessors] = useState<Professor[]>(INITIAL_PROFESSORS);
  const [universities, setUniversities] = useState<University[]>(INITIAL_UNIVERSITIES);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        await ensureDatabaseSeeded();
        const [profs, unis] = await Promise.all([
          getProfessors(),
          getUniversities()
        ]);
        if (profs && profs.length > 0) setProfessors(profs);
        if (unis && unis.length > 0) setUniversities(unis);
      } catch (err) {
        console.warn("Using initial verified dataset:", err);
      }
    }
    loadData();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/professors?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/professors");
    }
  };

  // NASA-Inspired Grid Assignments:
  // Card 1 (Large Left): Spotlight Prof
  const largeProf = professors[0] || INITIAL_PROFESSORS[0];
  // Card 2 (Medium Middle): Secondary Prof
  const middleProf = professors[1] || INITIAL_PROFESSORS[1];
  // Card 3 & 4 (Stacked Right): Two smaller cards
  const rightTopProf = professors[2] || INITIAL_PROFESSORS[2];
  const rightBottomProf = professors[3] || INITIAL_PROFESSORS[3];
  // 4 Bottom circular-thumbnail items:
  const compactRowProfs = professors.slice(4, 8);
  if (compactRowProfs.length < 4) {
    compactRowProfs.push(...INITIAL_PROFESSORS.slice(4, 8 - compactRowProfs.length));
  }

  // Top Rated Professors (for supporting section)
  const topRatedProfs = [...professors].sort((a, b) => (b.ratingAverage || 0) - (a.ratingAverage || 0)).slice(0, 4);

  return (
    <div className="bg-white text-gray-900 pb-20 space-y-16">
      {/* 1. TOP EDITORIAL SEARCH & HERO */}
      <section className="pt-10 pb-4 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-800 border border-gray-300 rounded-none text-[11px] font-black uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-[#e03a3e]" />
              Nền tảng đánh giá &amp; tra cứu học thuật toàn quốc
            </div>

            <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-gray-950 leading-tight">
              Đánh giá giảng viên.<br />
              <span className="text-[#e03a3e]">Chọn môn học thông minh.</span>
            </h1>

            <p className="text-sm sm:text-base text-gray-600 font-medium max-w-2xl mx-auto leading-relaxed">
              Khám phá đánh giá khách quan từ sinh viên các trường đại học Bách Khoa, Kinh tế Quốc dân, Ngoại thương, ĐHQG Hà Nội &amp; TP.HCM.
            </p>

            {/* Direct Search Bar */}
            <form
              onSubmit={handleSearchSubmit}
              className="mt-6 flex flex-col sm:flex-row items-stretch gap-0 max-w-2xl mx-auto border-2 border-black bg-white shadow-sm"
            >
              <div className="flex-1 flex items-center px-4 py-3 bg-white">
                <Search className="w-5 h-5 text-gray-400 shrink-0 mr-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên giảng viên, trường đại học (HUST, NEU...), môn học..."
                  className="w-full text-sm font-medium placeholder-gray-400 text-gray-900 focus:outline-none bg-transparent"
                />
              </div>
              <button
                type="submit"
                className="px-8 py-3.5 bg-[#e03a3e] hover:bg-[#b91c1c] text-white text-xs font-black uppercase tracking-wider transition-colors shrink-0 flex items-center justify-center gap-2"
              >
                <span>Tìm kiếm</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Keyword tags */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs text-gray-500">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Tìm nhanh:</span>
              {["HUST", "VNU-UET", "NEU", "FTU", "HCMUT", "Cấu trúc dữ liệu", "Machine Learning"].map((item) => (
                <button
                  key={item}
                  onClick={() => router.push(`/professors?q=${encodeURIComponent(item)}`)}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-300 transition-colors"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2. THE EXACT NASA "FEATURED NEWS" EDITORIAL GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header: Title on Left, Link with Red Circle Arrow on Right */}
        <div className="flex items-end justify-between pb-4 mb-6 border-b border-gray-300">
          <div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-gray-950 font-sans">
              Giảng viên nổi bật
            </h2>
          </div>
          <Link
            href="/professors?sort=recent"
            className="group flex items-center gap-2.5 text-xs sm:text-sm font-extrabold uppercase tracking-wider text-gray-950 hover:text-[#e03a3e] transition-colors"
          >
            <span>Mới được đánh giá</span>
            <div className="w-6 h-6 rounded-full bg-[#e03a3e] text-white flex items-center justify-center group-hover:bg-[#b91c1c] transition-colors shadow-sm">
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>

        {/* 3-Column Asymmetrical Grid matching NASA screenshot */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Column 1: Large Featured Card (~48% width -> lg:col-span-6) */}
          <div className="lg:col-span-6 flex flex-col">
            <Link
              href={`/professors/${largeProf.id}`}
              className="group relative flex flex-col justify-between h-[420px] sm:h-[460px] lg:h-[500px] bg-gray-950 overflow-hidden border border-gray-300 hover:border-black transition-all"
            >
              {/* Background Photo */}
              <div className="absolute inset-0 z-0">
                <img
                  src={largeProf.avatar || undefined}
                  alt={largeProf.name}
                  className="w-full h-full object-cover object-top opacity-85 group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                {/* NASA-style dark bottom gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
              </div>

              {/* Top Eyebrow Tag with Circular Icon */}
              <div className="relative z-10 p-5 sm:p-6">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white bg-black/70 backdrop-blur-sm border border-white/20">
                  <span className="w-2 h-2 rounded-full border border-white/80" />
                  GIẢNG VIÊN TIÊU BIỂU • {largeProf.universityShortName}
                </span>
              </div>

              {/* Bottom Content Overlay */}
              <div className="relative z-10 p-5 sm:p-6 space-y-2 text-white">
                <div className="text-[11px] font-black uppercase tracking-widest text-gray-300 flex items-center gap-2">
                  <span className="text-[#e03a3e] font-black">★ {largeProf.ratingAverage?.toFixed(1) || "5.0"}</span>
                  <span>•</span>
                  <span>{largeProf.ratingCount || 84} ĐÁNH GIÁ</span>
                  <span>•</span>
                  <span>{largeProf.faculty}</span>
                </div>

                <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white group-hover:text-red-200 transition-colors leading-tight font-sans">
                  {largeProf.name}
                </h3>

                {largeProf.featuredQuote && (
                  <p className="text-xs sm:text-sm italic text-gray-300 font-serif line-clamp-2 pt-1 border-l-2 border-[#e03a3e] pl-2.5">
                    “{largeProf.featuredQuote}”
                  </p>
                )}
              </div>
            </Link>
          </div>

          {/* Column 2: Medium Card (~26% width -> lg:col-span-3) */}
          <div className="lg:col-span-3 flex flex-col">
            <Link
              href={`/professors/${middleProf.id}`}
              className="group relative flex flex-col justify-between h-[420px] sm:h-[460px] lg:h-[500px] bg-gray-950 overflow-hidden border border-gray-300 hover:border-black transition-all"
            >
              <div className="absolute inset-0 z-0">
                <img
                  src={middleProf.avatar || undefined}
                  alt={middleProf.name}
                  className="w-full h-full object-cover object-top opacity-85 group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-transparent" />
              </div>

              {/* Top Eyebrow Tag */}
              <div className="relative z-10 p-4 sm:p-5">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white bg-black/70 backdrop-blur-sm border border-white/20">
                  <span className="w-1.5 h-1.5 rounded-full border border-white/80" />
                  {middleProf.universityShortName}
                </span>
              </div>

              {/* Bottom Content Overlay */}
              <div className="relative z-10 p-4 sm:p-5 space-y-1.5 text-white">
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-300 flex items-center gap-1.5">
                  <span className="text-[#e03a3e]">★ {middleProf.ratingAverage?.toFixed(1) || "4.8"}</span>
                  <span>•</span>
                  <span>{middleProf.ratingCount || 68} ĐÁNH GIÁ</span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-red-200 transition-colors leading-snug font-sans line-clamp-3">
                  {middleProf.name} — {middleProf.faculty}
                </h3>
              </div>
            </Link>
          </div>

          {/* Column 3: Stacked Cards (~26% width -> lg:col-span-3, 2 stacked) */}
          <div className="lg:col-span-3 flex flex-col justify-between gap-5 h-auto lg:h-[500px]">
            {/* Top Stacked Card */}
            <Link
              href={`/professors/${rightTopProf.id}`}
              className="group relative flex-1 flex flex-col justify-between min-h-[200px] sm:min-h-[220px] bg-gray-950 overflow-hidden border border-gray-300 hover:border-black transition-all"
            >
              <div className="absolute inset-0 z-0">
                <img
                  src={rightTopProf.avatar || undefined}
                  alt={rightTopProf.name}
                  className="w-full h-full object-cover object-top opacity-85 group-hover:scale-105 transition-transform duration-500 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
              </div>

              <div className="relative z-10 p-3.5">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white bg-black/70 backdrop-blur-sm border border-white/20">
                  <span className="w-1.5 h-1.5 rounded-full border border-white/80" />
                  {rightTopProf.universityShortName}
                </span>
              </div>

              <div className="relative z-10 p-3.5 space-y-1 text-white">
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-300">
                  <span className="text-[#e03a3e]">★ {rightTopProf.ratingAverage?.toFixed(1) || "4.7"}</span> • {rightTopProf.ratingCount || 52} ĐÁNH GIÁ
                </div>
                <h3 className="text-sm font-bold text-white group-hover:text-red-200 transition-colors leading-snug line-clamp-2">
                  {rightTopProf.name} — {rightTopProf.courses?.[0] || rightTopProf.faculty}
                </h3>
              </div>
            </Link>

            {/* Bottom Stacked Card */}
            <Link
              href={`/professors/${rightBottomProf.id}`}
              className="group relative flex-1 flex flex-col justify-between min-h-[200px] sm:min-h-[220px] bg-gray-950 overflow-hidden border border-gray-300 hover:border-black transition-all"
            >
              <div className="absolute inset-0 z-0">
                <img
                  src={rightBottomProf.avatar || undefined}
                  alt={rightBottomProf.name}
                  className="w-full h-full object-cover object-top opacity-85 group-hover:scale-105 transition-transform duration-500 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
              </div>

              <div className="relative z-10 p-3.5">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white bg-black/70 backdrop-blur-sm border border-white/20">
                  <span className="w-1.5 h-1.5 rounded-full border border-white/80" />
                  {rightBottomProf.universityShortName}
                </span>
              </div>

              <div className="relative z-10 p-3.5 space-y-1 text-white">
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-300">
                  <span className="text-[#e03a3e]">★ {rightBottomProf.ratingAverage?.toFixed(1) || "4.9"}</span> • {rightBottomProf.ratingCount || 47} ĐÁNH GIÁ
                </div>
                <h3 className="text-sm font-bold text-white group-hover:text-red-200 transition-colors leading-snug line-clamp-2">
                  {rightBottomProf.name} — {rightBottomProf.courses?.[0] || rightBottomProf.faculty}
                </h3>
              </div>
            </Link>
          </div>
        </div>

        {/* EXACT NASA ROW OF 4 CIRCULAR THUMBNAILS BENEATH MAIN GRID */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {compactRowProfs.map((prof, index) => (
              <Link
                key={prof.id || index}
                href={`/professors/${prof.id}`}
                className="group flex items-center gap-3.5 p-1"
              >
                {/* Circular Photograph matching screenshot */}
                <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 border border-gray-300 group-hover:border-black transition-colors bg-gray-100">
                  <img
                    src={prof.avatar || undefined}
                    alt={prof.name}
                    className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-300"
                  />
                </div>

                {/* Right text layout: Read time/stars, Title, Category */}
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    <span className="text-[#e03a3e]">★ {prof.ratingAverage?.toFixed(1) || "4.5"}</span> • {prof.ratingCount || 30} LƯỢT
                  </div>
                  <h4 className="text-xs font-bold text-gray-950 group-hover:text-[#e03a3e] transition-colors line-clamp-2 leading-snug">
                    {prof.name}
                  </h4>
                  <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full border border-gray-400" />
                    <span className="truncate">{prof.universityShortName} • {prof.faculty}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 3. RAG ACADEMIC SEARCH ASSISTANT (Hỏi AI có nguồn gốc minh chứng) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <RagSearchAssistant />
      </section>

      {/* 4. TOP-RATED PROFESSORS & REVIEWS */}
      <section className="bg-gray-50 py-16 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex items-end justify-between pb-3 border-b border-gray-300">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#e03a3e]">
                Uy tín học thuật
              </span>
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-gray-950">
                Được đánh giá cao nhất
              </h2>
            </div>
            <Link
              href="/professors?sort=rating"
              className="text-xs font-bold uppercase tracking-wider text-gray-950 hover:text-[#e03a3e] flex items-center gap-1"
            >
              <span>Xem bảng xếp hạng</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {topRatedProfs.map((prof) => (
              <Link
                key={prof.id}
                href={`/professors/${prof.id}`}
                className="group bg-white border border-gray-300 hover:border-black p-5 flex flex-col justify-between space-y-4 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-black text-white">
                      {prof.universityShortName}
                    </span>
                    <span className="text-xs font-black text-[#e03a3e] flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-[#e03a3e]" />
                      {prof.ratingAverage?.toFixed(1) || "5.0"}
                    </span>
                  </div>

                  <div className="w-20 h-20 rounded-full overflow-hidden border border-gray-200 mx-auto">
                    <img
                      src={prof.avatar || undefined}
                      alt={prof.name}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform"
                    />
                  </div>

                  <div className="text-center">
                    <h3 className="font-extrabold text-sm text-gray-950 group-hover:text-[#e03a3e] transition-colors leading-tight">
                      {prof.name}
                    </h3>
                    <p className="text-[11px] text-gray-500 mt-1 line-clamp-1">{prof.title}</p>
                    <p className="text-[11px] text-gray-600 line-clamp-1">{prof.faculty}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                  <span>{prof.ratingCount || 0} đánh giá</span>
                  {prof.takeAgainPercent && (
                    <span className="text-emerald-700 font-bold">{prof.takeAgainPercent}% học lại</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 5. UNIVERSITIES DIRECTORY */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex items-end justify-between pb-3 border-b border-gray-300">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#e03a3e]">
              Hệ thống cơ sở đào tạo
            </span>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-gray-950">
              Trường Đại học trên toàn quốc
            </h2>
          </div>
          <Link
            href="/universities"
            className="text-xs font-bold uppercase tracking-wider text-gray-950 hover:text-[#e03a3e] flex items-center gap-1"
          >
            <span>Tất cả các trường</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {universities.slice(0, 6).map((uni) => (
            <Link
              key={uni.id}
              href={`/universities/${uni.id}`}
              className="group block bg-white border border-gray-300 hover:border-black overflow-hidden transition-all"
            >
              <div className="relative h-44 overflow-hidden bg-gray-100">
                <img
                  src={uni.coverImage}
                  alt={uni.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 px-2 py-0.5 bg-black text-white text-[10px] font-black uppercase tracking-wider">
                  {uni.shortName}
                </div>
                <div className="absolute top-3 right-3 px-2 py-0.5 bg-white text-gray-900 text-[10px] font-bold border border-gray-300 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#e03a3e]" />
                  <span>{uni.city}</span>
                </div>
              </div>

              <div className="p-5 space-y-2">
                <h3 className="font-extrabold text-base text-gray-950 group-hover:text-[#e03a3e] transition-colors leading-snug">
                  {uni.name}
                </h3>
                <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                  {uni.description}
                </p>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-semibold">
                  <span>{uni.totalProfessors || 0} giảng viên</span>
                  <span>{uni.totalReviews || 0} đánh giá</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 6. EDITORIAL CALL TO ACTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative bg-black text-white p-8 sm:p-14 border border-gray-800 space-y-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#e03a3e]">
            Đóng góp vì một môi trường học thuật minh bạch
          </span>
          <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight max-w-2xl">
            Chia sẻ trải nghiệm học kỳ của bạn
          </h2>
          <p className="text-sm text-gray-300 max-w-xl leading-relaxed">
            Mỗi nhận xét khách quan là tài liệu tham khảo quý báu giúp sinh viên khóa sau chọn đúng giảng viên phù hợp với năng lực và phong cách học tập.
          </p>
          <div className="pt-3 flex flex-wrap items-center gap-4">
            <Link
              href="/professors"
              className="px-6 py-3 bg-[#e03a3e] hover:bg-[#b91c1c] text-white text-xs font-black uppercase tracking-wider transition-colors shadow-sm"
            >
              Viết đánh giá ngay
            </Link>
            <Link
              href="/guidelines"
              className="px-6 py-3 bg-transparent hover:bg-white hover:text-black text-white text-xs font-bold uppercase tracking-wider border border-white transition-colors"
            >
              Quy chuẩn văn minh
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
