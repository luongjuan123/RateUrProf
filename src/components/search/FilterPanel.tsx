"use client";

import React, { useState } from "react";
import { SearchFilters, SearchFacets, VerificationStatus } from "@/types";
import {
  PopArtX,
  PopArtCheck,
  PopArtRotateCcw,
  PopArtFilter,
  PopArtStar,
  PopArtBuilding,
  PopArtBook,
  PopArtGraduationCap,
  PopArtMapPin,
} from "@/components/icons/PopArtIcons";

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: SearchFilters;
  facets: SearchFacets | null;
  onApply: (newFilters: Partial<SearchFilters>) => void;
  onReset: () => void;
  isMobileDrawer?: boolean;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  isOpen,
  onClose,
  filters,
  facets,
  onApply,
  onReset,
  isMobileDrawer = false,
}) => {
  // Local drafts of filter values before "Áp dụng bộ lọc" is clicked
  const [prevFilters, setPrevFilters] = useState(filters);
  const [universityIds, setUniversityIds] = useState<string[]>(filters.universityIds || []);
  const [professorName, setProfessorName] = useState<string>(filters.name || "");
  const [majorIds, setMajorIds] = useState<string[]>(filters.majorIds || []);
  const [facultyIds, setFacultyIds] = useState<string[]>(filters.facultyIds || []);
  const [departmentIds, setDepartmentIds] = useState<string[]>(filters.departmentIds || []);
  const [courseIds, setCourseIds] = useState<string[]>(filters.courseIds || []);
  const [cityIds, setCityIds] = useState<string[]>(filters.cityIds || []);
  const [academicTitles, setAcademicTitles] = useState<string[]>(filters.academicTitles || []);
  const [minRating, setMinRating] = useState<number | undefined>(filters.minRating);
  const [maxRating, setMaxRating] = useState<number | undefined>(filters.maxRating);
  const [minReviewCount, setMinReviewCount] = useState<number | undefined>(filters.minReviewCount);
  const [includeUnrated, setIncludeUnrated] = useState<boolean>(filters.includeUnrated || false);
  const [verificationStatuses, setVerificationStatuses] = useState<VerificationStatus[]>(
    filters.verificationStatuses || []
  );
  const [hasPhoto, setHasPhoto] = useState<boolean>(filters.hasPhoto || false);

  // Sync drafts during render when incoming filters change
  if (filters !== prevFilters) {
    setPrevFilters(filters);
    setUniversityIds(filters.universityIds || []);
    setProfessorName(filters.name || "");
    setMajorIds(filters.majorIds || []);
    setFacultyIds(filters.facultyIds || []);
    setDepartmentIds(filters.departmentIds || []);
    setCourseIds(filters.courseIds || []);
    setCityIds(filters.cityIds || []);
    setAcademicTitles(filters.academicTitles || []);
    setMinRating(filters.minRating);
    setMaxRating(filters.maxRating);
    setMinReviewCount(filters.minReviewCount);
    setIncludeUnrated(filters.includeUnrated || false);
    setVerificationStatuses(filters.verificationStatuses || []);
    setHasPhoto(filters.hasPhoto || false);
  }

  if (!isOpen) return null;

  const handleApply = () => {
    onApply({
      name: professorName.trim() || undefined,
      universityIds: universityIds.length > 0 ? universityIds : undefined,
      majorIds: majorIds.length > 0 ? majorIds : undefined,
      facultyIds: facultyIds.length > 0 ? facultyIds : undefined,
      departmentIds: departmentIds.length > 0 ? departmentIds : undefined,
      courseIds: courseIds.length > 0 ? courseIds : undefined,
      cityIds: cityIds.length > 0 ? cityIds : undefined,
      academicTitles: academicTitles.length > 0 ? academicTitles : undefined,
      minRating: minRating && minRating > 0 ? minRating : undefined,
      maxRating: maxRating && maxRating > 0 ? maxRating : undefined,
      minReviewCount: minReviewCount && minReviewCount > 0 ? minReviewCount : undefined,
      includeUnrated: includeUnrated ? true : undefined,
      verificationStatuses: verificationStatuses.length > 0 ? verificationStatuses : undefined,
      hasPhoto: hasPhoto ? true : undefined,
    });
    if (isMobileDrawer) {
      onClose();
    }
  };

  const handleReset = () => {
    setUniversityIds([]);
    setProfessorName("");
    setMajorIds([]);
    setFacultyIds([]);
    setDepartmentIds([]);
    setCourseIds([]);
    setCityIds([]);
    setAcademicTitles([]);
    setMinRating(undefined);
    setMaxRating(undefined);
    setMinReviewCount(undefined);
    setIncludeUnrated(false);
    setVerificationStatuses([]);
    setHasPhoto(false);
    onReset();
  };

  // Toggle multi-select helper
  const toggleItem = (list: string[], setList: (val: string[]) => void, item: string) => {
    if (list.includes(item)) {
      setList(list.filter((x) => x !== item));
    } else {
      setList([...list, item]);
    }
  };

  const content = (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#111111]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#111111] text-white border border-[#111111] flex items-center justify-center font-bold">
            <PopArtFilter className="w-3.5 h-3.5" />
          </div>
          <h3 className="font-bold text-sm uppercase tracking-wider text-black">
            Bộ lọc nâng cao
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 border border-[#111111] text-black hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <PopArtX className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
        {/* 1. Trường Đại học */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
            <PopArtBuilding className="w-3.5 h-3.5" />
            Trường Đại học
          </label>
          <div className="max-h-40 overflow-y-auto border border-gray-300 p-2 bg-white space-y-1">
            {facets?.universities && facets.universities.length > 0 ? (
              facets.universities.map((u) => {
                const isChecked = universityIds.includes(u.id);
                return (
                  <label
                    key={u.id}
                    className="flex items-center justify-between gap-2 p-1.5 hover:bg-gray-50 cursor-pointer text-gray-800"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleItem(universityIds, setUniversityIds, u.id)}
                        className="border-gray-300 text-[#e03a3e] focus:ring-0"
                      />
                      <span className="font-bold">{u.label}</span>
                      {u.sublabel && (
                        <span className="text-[10px] text-gray-500 truncate hidden sm:inline">
                          — {u.sublabel}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5">
                      {u.count}
                    </span>
                  </label>
                );
              })
            ) : (
              <p className="text-gray-400 text-xs p-2">Đang tải danh sách trường...</p>
            )}
          </div>
        </div>

        {/* 2. Tên giảng viên */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-black uppercase tracking-wider text-gray-700">
            Giảng viên cụ thể
          </label>
          <input
            type="text"
            value={professorName}
            onChange={(e) => setProfessorName(e.target.value)}
            placeholder="Nhập tên giảng viên..."
            className="w-full p-2.5 text-xs bg-white border border-gray-300 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 shadow-none focus:shadow-none font-medium"
          />
        </div>

        {/* 3. Ngành học (Major) */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
            <PopArtGraduationCap className="w-3.5 h-3.5" />
            Ngành học
          </label>
          <div className="max-h-40 overflow-y-auto border border-gray-300 p-2 bg-white space-y-1">
            {facets?.majors && facets.majors.length > 0 ? (
              facets.majors.map((m) => {
                const isChecked = majorIds.includes(m.id);
                return (
                  <label
                    key={m.id}
                    className="flex items-center justify-between gap-2 p-1.5 hover:bg-gray-50 cursor-pointer text-gray-800"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleItem(majorIds, setMajorIds, m.id)}
                        className="border-gray-300 text-[#e03a3e] focus:ring-0"
                      />
                      <span className="font-medium truncate">{m.label}</span>
                    </div>
                    <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5">
                      {m.count}
                    </span>
                  </label>
                );
              })
            ) : (
              <p className="text-gray-400 text-xs p-2">Tất cả ngành học</p>
            )}
          </div>
        </div>

        {/* 4. Khoa / Viện (Faculty) */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-black uppercase tracking-wider text-gray-700">
            Khoa / Viện đào tạo
          </label>
          <div className="max-h-40 overflow-y-auto border border-gray-300 p-2 bg-white space-y-1">
            {facets?.faculties && facets.faculties.length > 0 ? (
              facets.faculties.map((f) => {
                const isChecked = facultyIds.includes(f.id);
                return (
                  <label
                    key={f.id}
                    className="flex items-center justify-between gap-2 p-1.5 hover:bg-gray-50 cursor-pointer text-gray-800"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleItem(facultyIds, setFacultyIds, f.id)}
                        className="border-gray-300 text-[#e03a3e] focus:ring-0"
                      />
                      <span className="font-medium truncate">{f.label}</span>
                    </div>
                    <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5">
                      {f.count}
                    </span>
                  </label>
                );
              })
            ) : (
              <p className="text-gray-400 text-xs p-2">Tất cả các khoa</p>
            )}
          </div>
        </div>

        {/* 5. Bộ môn (Department) */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-black uppercase tracking-wider text-gray-700">
            Bộ môn chuyên môn
          </label>
          <div className="max-h-40 overflow-y-auto border border-gray-300 p-2 bg-white space-y-1">
            {facets?.departments && facets.departments.length > 0 ? (
              facets.departments.map((d) => {
                const isChecked = departmentIds.includes(d.id);
                return (
                  <label
                    key={d.id}
                    className="flex items-center justify-between gap-2 p-1.5 hover:bg-gray-50 cursor-pointer text-gray-800"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleItem(departmentIds, setDepartmentIds, d.id)}
                        className="border-gray-300 text-[#e03a3e] focus:ring-0"
                      />
                      <span className="font-medium truncate">{d.label}</span>
                    </div>
                    <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5">
                      {d.count}
                    </span>
                  </label>
                );
              })
            ) : (
              <p className="text-gray-400 text-xs p-2">Tất cả bộ môn</p>
            )}
          </div>
        </div>

        {/* 6. Môn học (Course) */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
            <PopArtBook className="w-3.5 h-3.5" />
            Môn học phụ trách
          </label>
          <div className="max-h-40 overflow-y-auto border border-gray-300 p-2 bg-white space-y-1">
            {facets?.courses && facets.courses.length > 0 ? (
              facets.courses.map((c) => {
                const isChecked = courseIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className="flex items-center justify-between gap-2 p-1.5 hover:bg-gray-50 cursor-pointer text-gray-800"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleItem(courseIds, setCourseIds, c.id)}
                        className="border-gray-300 text-[#e03a3e] focus:ring-0"
                      />
                      <span className="font-medium truncate">{c.label}</span>
                    </div>
                    <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5">
                      {c.count}
                    </span>
                  </label>
                );
              })
            ) : (
              <p className="text-gray-400 text-xs p-2">Tất cả môn học</p>
            )}
          </div>
        </div>

        {/* 7. Tỉnh / Thành phố */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
            <PopArtMapPin className="w-3.5 h-3.5" />
            Tỉnh / Thành phố
          </label>
          <select
            value={cityIds[0] || ""}
            onChange={(e) => setCityIds(e.target.value ? [e.target.value] : [])}
            className="w-full p-2.5 bg-white border border-gray-300 font-medium outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 shadow-none focus:shadow-none text-xs"
          >
            <option value="">Tất cả tỉnh thành</option>
            <option value="Hà Nội">Hà Nội</option>
            <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
            <option value="Đà Nẵng">Đà Nẵng</option>
          </select>
        </div>

        {/* 8. Học hàm hoặc chức danh */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-black uppercase tracking-wider text-gray-700">
            Học hàm / Chức danh
          </label>
          <select
            value={academicTitles[0] || ""}
            onChange={(e) => setAcademicTitles(e.target.value ? [e.target.value] : [])}
            className="w-full p-2.5 bg-white border border-gray-300 font-medium outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 shadow-none focus:shadow-none text-xs"
          >
            <option value="">Tất cả học hàm</option>
            <option value="GS. TS">Giáo sư, Tiến sĩ (GS. TS)</option>
            <option value="PGS. TS">Phó Giáo sư, Tiến sĩ (PGS. TS)</option>
            <option value="TS">Tiến sĩ (TS)</option>
            <option value="ThS">Thạc sĩ (ThS)</option>
            <option value="GV">Giảng viên (GV)</option>
          </select>
        </div>

        {/* 9. Mức đánh giá (Min & Max Rating) */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-black uppercase tracking-wider text-gray-700 flex items-center gap-1">
            <PopArtStar className="w-3.5 h-3.5" filled={true} />
            Khoảng điểm đánh giá (1 - 5 ★)
          </label>
          <div className="flex items-center gap-2">
            <select
              value={minRating ?? 0}
              onChange={(e) => setMinRating(e.target.value === "0" ? undefined : parseFloat(e.target.value))}
              className="w-1/2 p-2 bg-white border border-gray-300 font-medium text-xs outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 shadow-none focus:shadow-none"
            >
              <option value="0">Tối thiểu</option>
              <option value="4.5">≥ 4.5 ★</option>
              <option value="4.0">≥ 4.0 ★</option>
              <option value="3.5">≥ 3.5 ★</option>
              <option value="3.0">≥ 3.0 ★</option>
            </select>
            <span className="text-gray-400 font-bold">—</span>
            <select
              value={maxRating ?? 5}
              onChange={(e) => setMaxRating(e.target.value === "5" ? undefined : parseFloat(e.target.value))}
              className="w-1/2 p-2 bg-white border border-gray-300 font-medium text-xs outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 shadow-none focus:shadow-none"
            >
              <option value="5">Tối đa (5.0 ★)</option>
              <option value="4.5">≤ 4.5 ★</option>
              <option value="4.0">≤ 4.0 ★</option>
              <option value="3.5">≤ 3.5 ★</option>
            </select>
          </div>
        </div>

        {/* 10. Số lượt đánh giá tối thiểu */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-black uppercase tracking-wider text-gray-700">
            Số lượt đánh giá tối thiểu
          </label>
          <select
            value={minReviewCount ?? 0}
            onChange={(e) => setMinReviewCount(e.target.value === "0" ? undefined : parseInt(e.target.value, 10))}
            className="w-full p-2.5 bg-white border border-gray-300 font-medium text-xs outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 shadow-none focus:shadow-none"
          >
            <option value="0">Tất cả số lượng</option>
            <option value="10">Từ 10 lượt đánh giá trở lên</option>
            <option value="25">Từ 25 lượt đánh giá trở lên</option>
            <option value="50">Từ 50 lượt đánh giá trở lên</option>
          </select>
        </div>

        {/* 11. Trạng thái xác minh */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-black uppercase tracking-wider text-gray-700">
            Trạng thái xác minh
          </label>
          <select
            value={verificationStatuses[0] || ""}
            onChange={(e) =>
              setVerificationStatuses(e.target.value ? [e.target.value as VerificationStatus] : [])
            }
            className="w-full p-2.5 bg-white border border-gray-300 font-medium text-xs outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 shadow-none focus:shadow-none"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="verified">Đã xác minh học thuật</option>
            <option value="unverified">Chưa xác minh</option>
          </select>
        </div>

        {/* 12. Checkboxes for Unrated & Photo */}
        <div className="space-y-2 pt-2">
          <label className="flex items-center gap-2 cursor-pointer text-gray-800">
            <input
              type="checkbox"
              checked={includeUnrated}
              onChange={(e) => setIncludeUnrated(e.target.checked)}
              className="border-gray-300 text-[#e03a3e] focus:ring-0"
            />
            <span className="font-semibold text-xs">
              Bao gồm giảng viên chưa có đánh giá
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-gray-800">
            <input
              type="checkbox"
              checked={hasPhoto}
              onChange={(e) => setHasPhoto(e.target.checked)}
              className="border-gray-300 text-[#e03a3e] focus:ring-0"
            />
            <span className="font-semibold text-xs">
              Chỉ hiện giảng viên có ảnh hồ sơ
            </span>
          </label>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-[#111111]">
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-black border border-[#111111] text-xs font-bold uppercase tracking-wider hover:bg-gray-200 transition-colors cursor-pointer"
        >
          <PopArtRotateCcw className="w-3.5 h-3.5" />
          <span>Xóa bộ lọc</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[#111111] bg-white hover:bg-gray-50 text-black text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex items-center gap-1.5 px-6 py-2 bg-[#e03a3e] hover:bg-[#c93236] text-white text-xs font-bold uppercase tracking-wider border border-[#e03a3e] transition-colors cursor-pointer"
          >
            <PopArtCheck className="w-4 h-4" />
            <span>Áp dụng bộ lọc</span>
          </button>
        </div>
      </div>
    </div>
  );

  // Mobile Drawer Overlay
  if (isMobileDrawer) {
    return (
      <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 flex justify-end animate-in fade-in duration-200">
        <div className="w-full max-w-lg bg-white h-full overflow-y-auto p-6 border-l border-[#111111] animate-in slide-in-from-right duration-250">
          {content}
        </div>
      </div>
    );
  }

  // Desktop Collapsible Card
  return (
    <div className="bg-white border border-[#111111] p-6 transition-all animate-in fade-in duration-150">
      {content}
    </div>
  );
};
