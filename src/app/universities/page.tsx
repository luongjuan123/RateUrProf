"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { getUniversities } from "@/lib/dataService";
import { University } from "@/types";
import {
  Search,
  Building2,
  MapPin,
  Star,
  Users,
  MessageSquare,
  ArrowRight
} from "lucide-react";

export default function UniversitiesPage() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");

  useEffect(() => {
    async function load() {
      try {
        const unis = await getUniversities();
        setUniversities(unis);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredUnis = useMemo(() => {
    return universities.filter((u) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const uniName = u.name || u.nameVi || "";
        const uniCity = u.city || u.cityVi || "";
        const matchName = uniName.toLowerCase().includes(q) || u.shortName.toLowerCase().includes(q);
        const matchCity = uniCity.toLowerCase().includes(q);
        if (!matchName && !matchCity) return false;
      }
      if (selectedRegion !== "all" && u.region !== selectedRegion) {
        return false;
      }
      return true;
    });
  }, [universities, search, selectedRegion]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Editorial Header */}
      <div className="border-b-2 border-gray-900 pb-4">
        <span className="text-[11px] font-black uppercase tracking-widest text-[#e03a3e]">
          Hệ thống Giáo dục Đại học Việt Nam
        </span>
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-gray-950 mt-1">
          Danh bạ Trường Đại học
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Khám phá danh sách các trường đại học tại Hà Nội, TP. Hồ Chí Minh, Đà Nẵng và các tỉnh thành trên toàn quốc.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-gray-50 border border-gray-200 p-5 flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên trường (Bách Khoa, Kinh tế...), mã viết tắt (HUST, NEU, FTU...)"
            className="w-full pl-11 pr-4 py-2.5 text-sm bg-white border border-gray-300 focus:outline-none focus:border-black font-medium text-gray-900"
          />
        </div>

        {/* Region tabs */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto shrink-0">
          {["all", "Miền Bắc", "Miền Trung", "Miền Nam"].map((region) => (
            <button
              key={region}
              onClick={() => setSelectedRegion(region)}
              className={`px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors shrink-0 ${
                selectedRegion === region
                  ? "bg-black text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {region === "all" ? "Tất cả vùng miền" : region}
            </button>
          ))}
        </div>
      </div>

      {/* University Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-72 bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : filteredUnis.length === 0 ? (
        <div className="p-12 text-center bg-gray-50 border border-gray-200 space-y-3">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto" />
          <h3 className="font-extrabold text-base text-gray-900">
            Không tìm thấy trường đại học nào
          </h3>
          <p className="text-xs text-gray-500">
            Hãy thử tìm kiếm với từ khóa khác hoặc đặt lại bộ lọc khu vực.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUnis.map((uni) => (
            <Link
              key={uni.id}
              href={`/universities/${uni.id}`}
              className="group flex flex-col justify-between bg-white border border-gray-200 overflow-hidden hover:border-black transition-colors"
            >
              <div>
                <div className="relative h-44 overflow-hidden bg-gray-100">
                  <img
                    src={uni.coverImage}
                    alt={uni.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-3 left-3 px-2 py-0.5 bg-black text-white text-[10px] font-black uppercase tracking-wider">
                    {uni.shortName}
                  </div>
                  <div className="absolute top-3 right-3 px-2 py-0.5 bg-white text-gray-900 text-[10px] font-bold border border-gray-200 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#e03a3e]" />
                    <span>{uni.city}</span>
                  </div>
                </div>

                <div className="p-5 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#e03a3e]">
                    {uni.region}
                  </span>
                  <h3 className="text-base font-extrabold text-gray-900 group-hover:text-[#e03a3e] transition-colors leading-snug">
                    {uni.name}
                  </h3>
                  <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                    {uni.description}
                  </p>

                  {/* Faculties preview pills */}
                  <div className="pt-2 flex flex-wrap gap-1">
                    {(uni.faculties || uni.facultiesVi || []).slice(0, 2).map((fac) => (
                      <span
                        key={fac}
                        className="px-2 py-0.5 text-[10px] bg-gray-100 text-gray-700 border border-gray-200"
                      >
                        {fac}
                      </span>
                    ))}
                    {(uni.faculties || uni.facultiesVi || []).length > 2 && (
                      <span className="px-2 py-0.5 text-[10px] bg-gray-50 text-gray-500 border border-gray-200">
                        +{(uni.faculties || uni.facultiesVi || []).length - 2} khoa khác
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-semibold bg-gray-50/50">
                <span className="flex items-center gap-1 text-gray-900 font-bold">
                  <Star className="w-3.5 h-3.5 fill-[#e03a3e] text-[#e03a3e]" />
                  {(uni.ratingAverage || 0).toFixed(1)} / 5.0
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {uni.totalProfessors} giảng viên
                </span>
                <span className="flex items-center gap-1 group-hover:text-black">
                  Chi tiết <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
