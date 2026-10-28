import { AcademicRank } from "@/types";

export interface NormalizedTitleInfo {
  rank: AcademicRank;
  degree?: string;
  displayVi: string;
  displayEn: string;
  sourceWordingPreserved: string;
  instructionalRank?: 'GS' | 'PGS' | 'GVC' | 'GV';
  notes?: string;
}

/**
 * Normalizes official Vietnamese academic titles and degrees into precise,
 * contextually accurate Vietnamese and English titles without conflating doctoral degrees with professor ranks.
 */
export function normalizeAcademicTitle(
  originalTitle: string,
  academicRank?: AcademicRank
): NormalizedTitleInfo {
  const clean = originalTitle.trim();

  // 1. Full Professor (Giáo sư, Tiến sĩ)
  if (/^GS(\.|\s)/i.test(clean) || /Giáo sư/i.test(clean)) {
    return {
      rank: 'GS',
      degree: 'TS',
      instructionalRank: 'GS',
      displayVi: 'Giáo sư, Tiến sĩ',
      displayEn: 'Professor (Full Professor), Ph.D.',
      sourceWordingPreserved: clean,
    };
  }

  // 2. Associate Professor (Phó Giáo sư, Tiến sĩ)
  if (/^PGS(\.|\s)/i.test(clean) || /Phó Giáo sư/i.test(clean)) {
    return {
      rank: 'PGS',
      degree: 'TS',
      instructionalRank: 'PGS',
      displayVi: 'Phó Giáo sư, Tiến sĩ',
      displayEn: 'Associate Professor, Ph.D.',
      sourceWordingPreserved: clean,
    };
  }

  // 3. Senior Lecturer with PhD / Master
  if (/Giảng viên chính/i.test(clean) || /^GVC/i.test(clean)) {
    const isPhD = /TS(\.|\s)/i.test(clean) || /Tiến sĩ/i.test(clean);
    return {
      rank: 'GVC',
      degree: isPhD ? 'TS' : 'ThS',
      instructionalRank: 'GVC',
      displayVi: isPhD ? 'Tiến sĩ, Giảng viên chính' : 'Thạc sĩ, Giảng viên chính',
      displayEn: isPhD ? 'Senior Lecturer, Ph.D.' : 'Senior Lecturer, M.Sc.',
      sourceWordingPreserved: clean,
    };
  }

  // 4. Doctor of Philosophy / Lecturer (NOT a Professor)
  if (/^TS(\.|\s)/i.test(clean) || /Tiến sĩ/i.test(clean)) {
    return {
      rank: 'TS',
      degree: 'TS',
      instructionalRank: undefined,
      displayVi: 'Tiến sĩ',
      displayEn: 'Lecturer, Ph.D.',
      sourceWordingPreserved: clean,
    };
  }

  // 5. Master of Science / Lecturer
  if (/^ThS(\.|\s)/i.test(clean) || /Thạc sĩ/i.test(clean)) {
    return {
      rank: 'ThS',
      degree: 'ThS',
      instructionalRank: undefined,
      displayVi: 'Thạc sĩ',
      displayEn: 'Master of Science (M.Sc.), Lecturer',
      sourceWordingPreserved: clean,
    };
  }

  // 6. Senior Lecturer / Lecturer default
  if (/Giảng viên cao cấp/i.test(clean)) {
    return {
      rank: 'GVC',
      instructionalRank: 'GVC',
      displayVi: 'Giảng viên cao cấp',
      displayEn: 'Senior Lecturer',
      sourceWordingPreserved: clean,
    };
  }

  if (/Giảng viên/i.test(clean) || /^GV/i.test(clean)) {
    return {
      rank: 'GV',
      instructionalRank: 'GV',
      displayVi: 'Giảng viên',
      displayEn: 'Lecturer / Faculty Member',
      sourceWordingPreserved: clean,
    };
  }

  // Fallback: If uncertain, preserve original source wording
  return {
    rank: academicRank || 'other',
    displayVi: clean,
    displayEn: clean,
    sourceWordingPreserved: clean,
  };
}

/**
 * Format academic title according to the active locale, preserving original Vietnamese
 * source wording when needed.
 */
export function formatAcademicTitle(
  professor: { titleVi?: string | null; titleEn?: string | null; academicRank?: AcademicRank | null; name?: string },
  locale: 'vi' | 'en'
): string {
  if (locale === 'en' && professor.titleEn) {
    return professor.titleEn;
  }
  return professor.titleVi || '';
}

/**
 * Formats instructional rank and academic degree cleanly in Vietnamese or English.
 */
export function formatTitleWithInstructionalRank(
  instructionalRank?: string,
  degree?: string,
  locale: 'vi' | 'en' = 'vi'
): string {
  const isEn = locale === 'en';
  if (instructionalRank === 'GS') {
    return isEn ? 'Professor (Full Professor), Ph.D.' : 'Giáo sư, Tiến sĩ';
  }
  if (instructionalRank === 'PGS') {
    return isEn ? 'Associate Professor, Ph.D.' : 'Phó Giáo sư, Tiến sĩ';
  }
  if (instructionalRank === 'GVC') {
    return isEn ? 'Senior Lecturer' : 'Giảng viên chính';
  }
  if (degree === 'TS') {
    return isEn ? 'Doctor of Philosophy (Ph.D.)' : 'Tiến sĩ';
  }
  if (degree === 'ThS') {
    return isEn ? 'Master of Science (M.Sc.)' : 'Thạc sĩ';
  }
  return isEn ? 'Lecturer' : 'Giảng viên';
}

/**
 * Formats degree name.
 */
export function formatDegree(degree: string, locale: 'vi' | 'en' = 'vi'): string {
  const isEn = locale === 'en';
  if (degree === 'TS') return isEn ? 'Ph.D.' : 'Tiến sĩ';
  if (degree === 'ThS') return isEn ? 'M.Sc.' : 'Thạc sĩ';
  return degree;
}
