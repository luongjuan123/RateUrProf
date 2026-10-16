"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getUniversities } from "@/lib/dataService";
import { matchUniversity } from "@/lib/bilingualSearch";
import { University } from "@/types";
import { useTranslation } from "@/locales/i18n";
import {
  Search,
  Building2,
  MapPin,
  ExternalLink,
  RotateCcw,
  BookOpen
} from "lucide-react";

function UniversitiesContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const initialRegion = searchParams.get("region") || "all";

  const { locale, t } = useTranslation();

  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState(initialQuery);
  const [selectedRegion, setSelectedRegion] = useState<string>(initialRegion);
  const [selectedCity, setSelectedCity] = useState<string>("all");

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

  const filteredUniversities = useMemo(() => {
    return universities.filter((u) => {
      // 1. Text Search across bilingual fields
      if (search.trim() && !matchUniversity(u, search)) {
        return false;
      }

      // 2. Region filter
      if (selectedRegion !== "all") {
        const regionMatch =
          (u.regionVi && u.regionVi.toLowerCase() === selectedRegion.toLowerCase()) ||
          (u.regionEn && u.regionEn.toLowerCase() === selectedRegion.toLowerCase()) ||
          (u.region && u.region.toLowerCase() === selectedRegion.toLowerCase());
        if (!regionMatch) return false;
      }

      // 3. City filter
      if (selectedCity !== "all") {
        const cityMatch =
          (u.cityVi && u.cityVi.toLowerCase() === selectedCity.toLowerCase()) ||
          (u.cityEn && u.cityEn.toLowerCase() === selectedCity.toLowerCase()) ||
          (u.city && u.city.toLowerCase() === selectedCity.toLowerCase());
        if (!cityMatch) return false;
      }

      return true;
    });
  }, [universities, search, selectedRegion, selectedCity]);

  const handleResetFilters = () => {
    setSearch("");
    setSelectedRegion("all");
    setSelectedCity("all");
  };

  const cities = locale === "vi" 
    ? ["Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng"]
    : ["Hanoi", "Ho Chi Minh City", "Da Nang"];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Editorial Header */}
      <div className="border-b-2 border-gray-900 pb-4">
        <span className="text-[11px] font-black uppercase tracking-widest text-[#e03a3e]">
          {t("universities.directoryTag")}
        </span>
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-gray-950 mt-1">
          {t("universities.directoryTitle")}
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          {t("universities.directorySubtitle")}
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-gray-50 border border-gray-200 p-5 space-y-4">
        <div className="relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("universities.searchPlaceholder")}
            className="w-full pl-11 pr-4 py-2.5 text-sm bg-white border border-gray-300 focus:outline-none focus:border-black font-medium text-gray-900"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3.5 top-3 text-xs font-bold text-gray-400 hover:text-gray-700"
            >
              {t("professors.clearSearch")}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold">
          {/* Region Filter */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">
              {t("universities.regionFilterLabel")}
            </label>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full p-2 bg-white border border-gray-300 focus:outline-none focus:border-black"
            >
              <option value="all">{t("universities.allRegions")}</option>
              <option value={locale === "vi" ? "Miền Bắc" : "Northern Vietnam"}>
                {t("universities.regionNorth")}
              </option>
              <option value={locale === "vi" ? "Miền Trung" : "Central Vietnam"}>
                {t("universities.regionCentral")}
              </option>
              <option value={locale === "vi" ? "Miền Nam" : "Southern Vietnam"}>
                {t("universities.regionSouth")}
              </option>
            </select>
          </div>

          {/* City Filter */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">
              {t("universities.cityFilterLabel")}
            </label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full p-2 bg-white border border-gray-300 focus:outline-none focus:border-black"
            >
              <option value="all">{t("universities.allCities")}</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-200 text-xs">
          <span className="font-bold text-gray-700">
            {t("universities.resultsFound", { count: filteredUniversities.length })}
          </span>
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1 text-gray-500 hover:text-black font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t("universities.resetFilters")}</span>
          </button>
        </div>
      </div>

      {/* Universities Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : filteredUniversities.length === 0 ? (
        <div className="p-12 text-center bg-gray-50 border border-gray-200 space-y-3">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto" />
          <h3 className="font-extrabold text-base text-gray-900">
            {t("universities.noResultsTitle")}
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {t("universities.noResultsSubtitle")}
          </p>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-wider"
          >
            {t("universities.viewAll")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUniversities.map((uni) => {
            const uniName = locale === "en" ? uni.nameEn : uni.nameVi;
            const uniDesc = locale === "en" ? uni.descriptionEn : uni.descriptionVi;
            const uniCity = locale === "en" ? uni.cityEn : uni.cityVi;
            const faculties = (locale === "en" ? uni.facultiesEn : uni.facultiesVi) || uni.faculties || [];

            return (
              <div
                key={uni.id}
                className="group flex flex-col justify-between bg-white border border-gray-200 overflow-hidden hover:border-black transition-colors"
              >
                <div>
                  <div className="relative h-44 overflow-hidden bg-gray-100">
                    <img
                      src={uni.coverImage}
                      alt={uniName}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-3 left-3 px-2 py-0.5 bg-black text-white text-[10px] font-black uppercase tracking-wider">
                      {uni.shortName}
                    </div>
                    <div className="absolute top-3 right-3 px-2 py-0.5 bg-white text-gray-900 text-[10px] font-bold border border-gray-200 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#e03a3e]" />
                      <span>{uniCity}</span>
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <Link href={`/${locale}/universities/${uni.id}`}>
                      <h3 className="text-base font-extrabold text-gray-900 group-hover:text-[#e03a3e] transition-colors leading-snug">
                        {uniName}
                      </h3>
                    </Link>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {uniDesc}
                    </p>

                    {/* Faculties */}
                    <div className="pt-1 flex flex-wrap gap-1">
                      {faculties.slice(0, 2).map((fac) => (
                        <span
                          key={fac}
                          className="px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-700"
                        >
                          {fac}
                        </span>
                      ))}
                      {faculties.length > 2 && (
                        <span className="px-1.5 py-0.5 text-[10px] text-gray-400">
                          +{faculties.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-xs">
                  <div className="text-gray-500 font-medium space-x-2 text-[11px]">
                    <span>{t("home.professorsCount", { count: uni.totalProfessors || 0 })}</span>
                    <span>•</span>
                    <span>{t("home.reviewsCount", { count: uni.totalReviews || 0 })}</span>
                  </div>
                  <Link
                    href={`/${locale}/universities/${uni.id}`}
                    className="font-bold text-[#e03a3e] hover:underline flex items-center gap-1 text-xs"
                  >
                    <span>{t("universities.viewUniversity")}</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function LocalizedUniversitiesPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center">Loading university directory...</div>}>
      <UniversitiesContent />
    </Suspense>
  );
}
