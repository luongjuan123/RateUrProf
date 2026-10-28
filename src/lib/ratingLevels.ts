export interface RatingLevel {
  level: 1 | 2 | 3 | 4 | 5;
  key: "awful" | "ok" | "good" | "great" | "awesome";
  labelEn: string;
  labelVi: string;
  color: string;         // Solid blue accent (for active button, distribution bar fill)
  lightBg: string;       // Subtle ice-blue background (for inactive button, light badge)
  textColor: string;     // Contrasting blue text color
  minScore: number;      // For mapping average floating scores (e.g. 4.8 -> Awesome)
  maxScore: number;
}

export const RATING_LEVELS: RatingLevel[] = [
  {
    level: 1,
    key: "awful",
    labelEn: "Awful",
    labelVi: "Kém",
    color: "#93c5fd",     // Soft blue
    lightBg: "#f8fafc",
    textColor: "#1e3a8a",
    minScore: 0.0,
    maxScore: 1.99,
  },
  {
    level: 2,
    key: "ok",
    labelEn: "OK",
    labelVi: "Tạm ổn",
    color: "#60a5fa",     // Sky blue
    lightBg: "#eff6ff",
    textColor: "#1e3a8a",
    minScore: 2.0,
    maxScore: 2.99,
  },
  {
    level: 3,
    key: "good",
    labelEn: "Good",
    labelVi: "Khá",
    color: "#3b82f6",     // Medium blue
    lightBg: "#eff6ff",
    textColor: "#1e3a8a",
    minScore: 3.0,
    maxScore: 3.79,
  },
  {
    level: 4,
    key: "great",
    labelEn: "Great",
    labelVi: "Tốt",
    color: "#2563eb",     // Royal blue
    lightBg: "#eff6ff",
    textColor: "#1e3a8a",
    minScore: 3.8,
    maxScore: 4.49,
  },
  {
    level: 5,
    key: "awesome",
    labelEn: "Awesome",
    labelVi: "Xuất sắc",
    color: "#1d4ed8",     // Deep academic blue
    lightBg: "#dbeafe",
    textColor: "#1e3a8a",
    minScore: 4.5,
    maxScore: 5.0,
  },
];

/**
 * Returns the corresponding RatingLevel for a discrete integer rating (1..5).
 */
export function getRatingLevelByValue(val: number): RatingLevel {
  const rounded = Math.max(1, Math.min(5, Math.round(val)));
  return RATING_LEVELS.find((l) => l.level === rounded) || RATING_LEVELS[2];
}

/**
 * Maps a continuous floating score (e.g., 4.2) to its rating level.
 */
export function getRatingLevel(score: number | null | undefined): RatingLevel {
  if (score === null || score === undefined || isNaN(score) || score <= 0) {
    return RATING_LEVELS[2]; // Default to Good / neutral
  }
  if (score >= 4.5) return RATING_LEVELS[4]; // Awesome
  if (score >= 3.8) return RATING_LEVELS[3]; // Great
  if (score >= 3.0) return RATING_LEVELS[2]; // Good
  if (score >= 2.0) return RATING_LEVELS[1]; // OK
  return RATING_LEVELS[0];                   // Awful
}

/**
 * Returns localized label for a rating score.
 */
export function getRatingLabel(score: number, locale: string): string {
  const level = getRatingLevel(score);
  return locale === "vi" ? level.labelVi : level.labelEn;
}

export interface DifficultyLevel {
  level: 1 | 2 | 3 | 4 | 5;
  key: "very_easy" | "easy" | "average" | "difficult" | "very_difficult";
  labelEn: string;
  labelVi: string;
  color: string;         // Solid blue accent
  lightBg: string;       // Subtle background
  textColor: string;     // Blue text color
  minScore: number;      // For mapping average floating scores
  maxScore: number;
}

/**
 * Minimalist & Elegant Difficulty Scale (Blue & White Palette)
 */
export const DIFFICULTY_LEVELS: DifficultyLevel[] = [
  {
    level: 1,
    key: "very_easy",
    labelEn: "Very Easy",
    labelVi: "Rất dễ",
    color: "#1d4ed8",     // Deep blue
    lightBg: "#eff6ff",
    textColor: "#1e3a8a",
    minScore: 0.0,
    maxScore: 1.99,
  },
  {
    level: 2,
    key: "easy",
    labelEn: "Easy",
    labelVi: "Dễ",
    color: "#2563eb",     // Royal blue
    lightBg: "#eff6ff",
    textColor: "#1e3a8a",
    minScore: 2.0,
    maxScore: 2.99,
  },
  {
    level: 3,
    key: "average",
    labelEn: "Average",
    labelVi: "Vừa phải",
    color: "#3b82f6",     // Medium blue
    lightBg: "#eff6ff",
    textColor: "#1e3a8a",
    minScore: 3.0,
    maxScore: 3.79,
  },
  {
    level: 4,
    key: "difficult",
    labelEn: "Difficult",
    labelVi: "Khó",
    color: "#60a5fa",     // Soft blue
    lightBg: "#f8fafc",
    textColor: "#1e3a8a",
    minScore: 3.8,
    maxScore: 4.49,
  },
  {
    level: 5,
    key: "very_difficult",
    labelEn: "Very Difficult",
    labelVi: "Rất khó",
    color: "#93c5fd",     // Muted blue
    lightBg: "#f8fafc",
    textColor: "#1e3a8a",
    minScore: 4.5,
    maxScore: 5.0,
  },
];

/**
 * Returns the corresponding DifficultyLevel for a discrete integer rating (1..5).
 */
export function getDifficultyLevelByValue(val: number): DifficultyLevel {
  const rounded = Math.max(1, Math.min(5, Math.round(val)));
  return DIFFICULTY_LEVELS.find((l) => l.level === rounded) || DIFFICULTY_LEVELS[2];
}

/**
 * Maps a continuous floating difficulty score (e.g., 3.4) to its difficulty level.
 */
export function getDifficultyLevel(score: number | null | undefined): DifficultyLevel {
  if (score === null || score === undefined || isNaN(score) || score <= 0) {
    return DIFFICULTY_LEVELS[2]; // Default to Average / neutral
  }
  if (score >= 4.5) return DIFFICULTY_LEVELS[4]; // Very Difficult
  if (score >= 3.8) return DIFFICULTY_LEVELS[3]; // Difficult
  if (score >= 3.0) return DIFFICULTY_LEVELS[2]; // Average
  if (score >= 2.0) return DIFFICULTY_LEVELS[1]; // Easy
  return DIFFICULTY_LEVELS[0];                   // Very Easy
}

/**
 * Returns localized label for a difficulty score.
 */
export function getDifficultyLabel(score: number, locale: string): string {
  const level = getDifficultyLevel(score);
  return locale === "vi" ? level.labelVi : level.labelEn;
}
