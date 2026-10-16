import { AcademicTerminologyItem } from "@/types";

export const INITIAL_TERMINOLOGY: AcademicTerminologyItem[] = [
  {
    canonicalId: "cs",
    termVi: "Khoa học máy tính",
    termEn: "Computer Science",
    aliasesVi: ["Khoa học MT", "KHMT", "Khoa học Máy tính", "Tin học"],
    aliasesEn: ["CS", "CompSci", "Computing Science"],
    category: "major"
  },
  {
    canonicalId: "ce",
    termVi: "Kỹ thuật máy tính",
    termEn: "Computer Engineering",
    aliasesVi: ["KTMT", "Kỹ thuật MT", "Kỹ thuật Máy tính"],
    aliasesEn: ["CE", "CompEng"],
    category: "major"
  },
  {
    canonicalId: "it",
    termVi: "Công nghệ thông tin",
    termEn: "Information Technology",
    aliasesVi: ["CNTT", "Công nghệ TT", "Tin học ứng dụng"],
    aliasesEn: ["IT", "InfoTech", "Information Systems"],
    category: "major"
  },
  {
    canonicalId: "ai",
    termVi: "Trí tuệ nhân tạo",
    termEn: "Artificial Intelligence",
    aliasesVi: ["TTNT", "Học máy", "Hoc may", "Thị giác máy tính", "Xử lý ngôn ngữ tự nhiên"],
    aliasesEn: ["AI", "Machine Learning", "ML", "Deep Learning", "Computer Vision", "NLP"],
    category: "keyword"
  },
  {
    canonicalId: "ds",
    termVi: "Khoa học dữ liệu",
    termEn: "Data Science",
    aliasesVi: ["KHDL", "Khoa học DL", "Phân tích dữ liệu", "Dữ liệu lớn"],
    aliasesEn: ["DS", "Data Science", "Data Analytics", "Big Data"],
    category: "major"
  },
  {
    canonicalId: "se",
    termVi: "Kỹ thuật phần mềm",
    termEn: "Software Engineering",
    aliasesVi: ["KTPM", "Kỹ thuật PM", "Phát triển phần mềm", "Lập trình"],
    aliasesEn: ["SE", "Software Engineering", "Software Dev", "Software Development"],
    category: "major"
  },
  {
    canonicalId: "ee",
    termVi: "Kỹ thuật điện",
    termEn: "Electrical Engineering",
    aliasesVi: ["Điện - Điện tử", "Điện tử viễn thông", "KT Điện"],
    aliasesEn: ["EE", "Electrical Engineering", "Electronics & Telecommunications"],
    category: "major"
  },
  {
    canonicalId: "me",
    termVi: "Kỹ thuật cơ khí",
    termEn: "Mechanical Engineering",
    aliasesVi: ["Cơ khí", "KT Cơ khí", "Chế tạo máy"],
    aliasesEn: ["ME", "Mechanical Engineering", "Machinery"],
    category: "major"
  },
  {
    canonicalId: "ba",
    termVi: "Quản trị kinh doanh",
    termEn: "Business Administration",
    aliasesVi: ["QTKD", "Quản trị KD", "Kinh doanh"],
    aliasesEn: ["BA", "BBA", "MBA", "Business Admin", "Business Administration"],
    category: "major"
  },
  {
    canonicalId: "econ",
    termVi: "Kinh tế học",
    termEn: "Economics",
    aliasesVi: ["Kinh tế", "Kinh tế quốc tế", "Kinh tế đối ngoại", "Kinh tế học"],
    aliasesEn: ["Econ", "Economics", "International Economics", "International Trade"],
    category: "major"
  },
  {
    canonicalId: "algorithms",
    termVi: "Cấu trúc dữ liệu & Giải thuật",
    termEn: "Data Structures & Algorithms",
    aliasesVi: ["Giải thuật", "Cấu trúc dữ liệu", "CTDL & GT", "Thuật toán"],
    aliasesEn: ["DSA", "Data Structures", "Algorithms"],
    category: "keyword"
  },
  {
    canonicalId: "database",
    termVi: "Cơ sở dữ liệu",
    termEn: "Database Systems",
    aliasesVi: ["CSDL", "Hệ quản trị CSDL", "Cơ sở DL"],
    aliasesEn: ["DBMS", "Database", "Databases", "SQL"],
    category: "keyword"
  },
  {
    canonicalId: "cybersecurity",
    termVi: "An toàn thông tin",
    termEn: "Information Security & Cybersecurity",
    aliasesVi: ["ATTT", "An ninh mạng", "Bảo mật", "Mật mã"],
    aliasesEn: ["Cybersecurity", "InfoSec", "Network Security", "Cryptography"],
    category: "keyword"
  }
];

// In-memory registry that supports dynamic runtime additions
const registry: AcademicTerminologyItem[] = [...INITIAL_TERMINOLOGY];

export function getTerminologyRegistry(): AcademicTerminologyItem[] {
  return registry;
}

export function addTerminologyItem(item: AcademicTerminologyItem): void {
  const existingIdx = registry.findIndex(t => t.canonicalId === item.canonicalId);
  if (existingIdx >= 0) {
    registry[existingIdx] = item;
  } else {
    registry.push(item);
  }
}

/**
 * Expand a user search query by finding matching canonical terminology items
 * and returning cross-lingual equivalents and aliases.
 */
export function expandQueryTerminology(query: string): string[] {
  const qClean = query.toLowerCase().trim();
  if (!qClean) return [];

  const matchedTerms = new Set<string>();

  for (const item of registry) {
    const allTokens = [
      item.canonicalId.toLowerCase(),
      item.termVi.toLowerCase(),
      item.termEn.toLowerCase(),
      ...item.aliasesVi.map(a => a.toLowerCase()),
      ...item.aliasesEn.map(a => a.toLowerCase()),
    ];

    const isMatch = allTokens.some(token => 
      token.includes(qClean) || qClean.includes(token)
    );

    if (isMatch) {
      matchedTerms.add(item.termVi);
      matchedTerms.add(item.termEn);
      item.aliasesVi.forEach(a => matchedTerms.add(a));
      item.aliasesEn.forEach(a => matchedTerms.add(a));
    }
  }

  return Array.from(matchedTerms);
}

export const expandTerminology = expandQueryTerminology;

export function findTerminology(query: string): AcademicTerminologyItem | undefined {
  const qClean = query.toLowerCase().trim();
  return registry.find(item =>
    item.canonicalId.toLowerCase() === qClean ||
    item.termVi.toLowerCase() === qClean ||
    item.termEn.toLowerCase() === qClean ||
    item.aliasesVi.some(a => a.toLowerCase() === qClean) ||
    item.aliasesEn.some(a => a.toLowerCase() === qClean)
  );
}

export function normalizeQueryWithTerminology(query: string): string[] {
  const expanded = expandQueryTerminology(query);
  return expanded.length > 0 ? expanded : [query];
}
