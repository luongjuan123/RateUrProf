"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getUniversityById, getProfessors } from "@/lib/dataService";
import { ProfessorCard } from "@/components/ProfessorCard";
import { University, Professor } from "@/types";
import {
  Building2,
  MapPin,
  Star,
  Users,
  MessageSquare,
  GraduationCap,
  ArrowLeft,
  BookOpen
} from "lucide-react";

export default function UniversityDetailClient({ universityId }: { universityId: string }) {
  const [university, setUniversity] = useState<University | null>(null);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFaculty, setSelectedFaculty] = useState<string>("all");

  useEffect(() => {
    async function load() {
      try {
        const [uni, allProfs] = await Promise.all([
          getUniversityById(universityId),
          getProfessors()
        ]);
        if (uni) {
          setUniversity(uni);
          const uniProfs = allProfs.filter((p) => p.universityId === universityId);
          setProfessors(uniProfs);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [universityId]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 border-4 border-[#e03a3e] border-t-transparent animate-spin mx-auto" />
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mt-4">
          Đang tải thông tin trường đại học...
        </p>
      </div>
    );
  }

  if (!university) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-black uppercase text-gray-900">
          Không tìm thấy trường đại học
        </h2>
        <Link
          href="/universities"
          className="inline-block px-5 py-2.5 bg-black text-white text-xs font-bold uppercase"
        >
          Trở về danh bạ
        </Link>
      </div>
    );
  }

  const filteredProfs = selectedFaculty === "all"
    ? professors
    : professors.filter((p) => p.faculty === selectedFaculty);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
        <Link href="/" className="hover:text-black">Trang chủ</Link>
        <span>/</span>
        <Link href="/universities" className="hover:text-black">Trường đại học</Link>
        <span>/</span>
        <span className="text-gray-900 font-bold">{university.shortName}</span>
      </div>

      {/* University Hero Banner */}
      <div className="bg-white border border-gray-200 overflow-hidden">
        <div className="relative h-64 sm:h-80 overflow-hidden bg-gray-900">
          <img
            src={university.coverImage}
            alt={university.name}
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          
          <div className="absolute bottom-6 left-6 right-6 text-white space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-[#e03a3e] text-white font-black text-xs uppercase tracking-wider">
                {university.shortName}
              </span>
              <span className="text-xs font-bold text-gray-300 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#e03a3e]" />
                {university.city} • {university.region}
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight">
              {university.name}
            </h1>
          </div>
        </div>

        {/* University Info & Stats */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-3">
              <h2 className="text-xs font-black uppercase tracking-widest text-[#e03a3e]">
                Giới thiệu &amp; Lịch sử đào tạo
              </h2>
              <p className="text-sm text-gray-700 leading-relaxed font-sans">
                {university.description}
              </p>
            </div>

            <div className="lg:col-span-4 grid grid-cols-3 gap-3 bg-gray-50 p-4 border border-gray-200 text-center">
              <div>
                <div className="text-base sm:text-lg font-black text-gray-950">
                  {university.ratingAverage != null && (university.totalReviews || 0) > 0
                    ? `${university.ratingAverage.toFixed(1)}`
                    : "Chưa có"}
                </div>
                <div className="text-[10px] font-bold uppercase text-gray-500">
                  Điểm trung bình
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-gray-950">
                  {university.totalProfessors || 0}
                </div>
                <div className="text-[10px] font-bold uppercase text-gray-500">
                  Giảng viên
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-gray-950">
                  {university.totalReviews || 0}
                </div>
                <div className="text-[10px] font-bold uppercase text-gray-500">
                  Lượt đánh giá
                </div>
              </div>
            </div>
          </div>

          {/* Faculties Pill list */}
          <div className="pt-4 border-t border-gray-100">
            <span className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
              Các khoa, trường &amp; viện trực thuộc ({(university.faculties || []).length})
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedFaculty("all")}
                className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                  selectedFaculty === "all"
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Tất cả khoa ({professors.length})
              </button>
              {(university.faculties || []).map((fac) => {
                const count = professors.filter((p) => p.faculty === fac).length;
                return (
                  <button
                    key={fac}
                    onClick={() => setSelectedFaculty(fac)}
                    className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                      selectedFaculty === fac
                        ? "bg-black text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {fac} {count > 0 && `(${count})`}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Associated Professors List */}
      <div className="space-y-6">
        <div className="flex items-end justify-between border-b-2 border-gray-950 pb-3">
          <div>
            <div className="eyebrow-tag text-[#e03a3e]">Đội ngũ giảng dạy</div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-gray-950">
              Giảng viên thuộc {university.shortName} ({filteredProfs.length})
            </h2>
          </div>
          <Link
            href={`/professors?q=${encodeURIComponent(university.shortName)}`}
            className="text-xs font-bold uppercase tracking-wider text-gray-700 hover:text-[#e03a3e]"
          >
            Tìm kiếm thêm →
          </Link>
        </div>

        {filteredProfs.length === 0 ? (
          <div className="p-12 text-center bg-gray-50 border border-gray-200 space-y-2">
            <Users className="w-10 h-10 text-gray-400 mx-auto" />
            <h4 className="font-bold text-gray-900 text-sm">
              Chưa có hồ sơ giảng viên cho chuyên khoa này
            </h4>
            <p className="text-xs text-gray-500">
              Bạn có thể gửi đề xuất thêm giảng viên để cộng đồng cùng đánh giá.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProfs.map((prof) => (
              <ProfessorCard key={prof.id} professor={prof} variant="medium" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
