"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ProfessorCard } from "@/components/ProfessorCard";
import { getProfessors, getUniversities } from "@/lib/dataService";
import { searchProfessors } from "@/lib/bilingualSearch";
import { Professor, University } from "@/types";
import { useTranslation } from "@/locales/i18n";
import {
  Search,
  RotateCcw,
} from "lucide-react";

function ProfessorsContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const initialUni = searchParams.get("university") || searchParams.get("uni") || "all";
  const initialCity = searchParams.get("city") || "all";
  const initialMinRating = Number(searchParams.get("minRating")) || 0;
  const initialSort = (searchParams.get("sort") as "rating" | "reviews" | "name") || "rating";

  const { locale, t } = useTranslation();

  const [professors, setProfessors] = useState<Professor[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState(initialQuery);
  const [selectedUni, setSelectedUni] = useState<string>(initialUni);
  const [selectedCity, setSelectedCity] = useState<string>(initialCity);
  const [minRating, setMinRating] = useState<number>(initialMinRating);
  const [sortBy, setSortBy] = useState<"rating" | "reviews" | "name">(initialSort);

  useEffect(() => {
    async function load() {
      try {
        const [profs, unis] = await Promise.all([
          getProfessors(),
          getUniversities()
        ]);
        setProfessors(profs);
        setUniversities(unis);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Sync state during render when URL params change
  const currentParamsStr = searchParams.toString();
  const [prevParamsStr, setPrevParamsStr] = useState(currentParamsStr);
  if (currentParamsStr !== prevParamsStr) {
    setPrevParamsStr(currentParamsStr);
    const q = searchParams.get("q") || "";
    const uni = searchParams.get("university") || searchParams.get("uni") || "all";
    const city = searchParams.get("city") || "all";
    const rating = Number(searchParams.get("minRating")) || 0;
    const sort = (searchParams.get("sort") as "rating" | "reviews" | "name") || "rating";

    setSearch(q);
    setSelectedUni(uni);
    setSelectedCity(city);
    setMinRating(rating);
    setSortBy(sort);
  }

  // Execute Bilingual Search & Multi-Filters
  const filteredProfessors = useMemo(() => {
    return searchProfessors(professors, universities, {
      query: search,
      universityId: selectedUni,
      city: selectedCity,
      minRating,
      sortBy,
      locale
    });
  }, [professors, universities, search, selectedUni, selectedCity, minRating, sortBy, locale]);

  const handleResetFilters = () => {
    setSearch("");
    setSelectedUni("all");
    setSelectedCity("all");
    setMinRating(0);
    setSortBy("rating");
  };

  const cities = locale === "vi" 
    ? ["Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng"]
    : ["Hanoi", "Ho Chi Minh City", "Da Nang"];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Editorial Header */}
      <div className="border-b-2 border-gray-900 pb-4">
        <div>
          <span className="text-[11px] font-black uppercase tracking-widest text-[#e03a3e]">
            {t("professors.directoryTag")}
          </span>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-gray-950 mt-1">
            {t("professors.directoryTitle")}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {t("professors.directorySubtitle")}
          </p>
        </div>
      </div>

      {/* Filter & Search Bar Controls */}
      <div className="bg-gray-50 border border-gray-200 p-5 space-y-4">
        {/* Main Search Input */}
        <div className="relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("professors.searchPlaceholder")}
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

        {/* Dropdowns Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-semibold">
          {/* University Filter */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">
              {t("professors.universityFilterLabel")}
            </label>
            <select
              value={
                universities.find(
                  (u) =>
                    u.id === selectedUni ||
                    u.shortName.toLowerCase() === selectedUni.toLowerCase()
                )?.id || (selectedUni === "all" ? "all" : selectedUni)
              }
              onChange={(e) => setSelectedUni(e.target.value)}
              className="w-full p-2 bg-white border border-gray-300 focus:outline-none focus:border-black"
            >
              <option value="all">{t("professors.allUniversities")}</option>
              {universities.map((u) => {
                const uName = locale === "en" ? u.nameEn : u.nameVi;
                return (
                  <option key={u.id} value={u.id}>
                    {u.shortName} — {uName}
                  </option>
                );
              })}
            </select>
          </div>

          {/* City Filter */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">
              {t("professors.cityFilterLabel")}
            </label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full p-2 bg-white border border-gray-300 focus:outline-none focus:border-black"
            >
              <option value="all">{t("professors.allCities")}</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Min Rating Filter */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">
              {t("professors.minRatingLabel")}
            </label>
            <select
              value={String(minRating)}
              onChange={(e) => setMinRating(Number(e.target.value))}
              className="w-full p-2 bg-white border border-gray-300 focus:outline-none focus:border-black"
            >
              <option value="0">{t("professors.allRatings")}</option>
              <option value="4.5">{t("professors.ratingFrom", { rating: "4.5" })}</option>
              <option value="4.0">{t("professors.ratingFrom", { rating: "4.0" })}</option>
              <option value="3.5">{t("professors.ratingFrom", { rating: "3.5" })}</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">
              {t("professors.sortByLabel")}
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "rating" | "reviews" | "name")}
              className="w-full p-2 bg-white border border-gray-300 focus:outline-none focus:border-black"
            >
              <option value="rating">{t("professors.sortHighestRating")}</option>
              <option value="reviews">{t("professors.sortMostReviews")}</option>
              <option value="name">{t("professors.sortNameAZ")}</option>
            </select>
          </div>
        </div>

        {/* Results summary & Reset */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200 text-xs">
          <span className="font-bold text-gray-700">
            {t("professors.resultsFound", { count: filteredProfessors.length })}
          </span>
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1 text-gray-500 hover:text-black font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t("professors.resetFilters")}</span>
          </button>
        </div>
      </div>

      {/* Professor Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : filteredProfessors.length === 0 ? (
        <div className="p-12 text-center bg-gray-50 border border-gray-200 space-y-3">
          <div className="w-12 h-12 bg-gray-200 text-gray-500 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-base text-gray-900">
            {t("professors.noResultsTitle")}
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {t("professors.noResultsSubtitle")}
          </p>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-wider"
          >
            {t("professors.viewAllProfessors")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProfessors.map((prof) => (
            <ProfessorCard key={prof.id} professor={prof} variant="medium" />
          ))}
        </div>
      )}
    </div>
  );
}

export default function LocalizedProfessorsPage() {
  const { t } = useTranslation();

  return (
    <Suspense fallback={<div className="p-12 text-center">{t("professors.loading")}</div>}>
      <ProfessorsContent />
    </Suspense>
  );
}
