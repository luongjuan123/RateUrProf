# RateProfCuaBan (Đánh Giá Giảng Viên Của Bạn)

> **Comprehensive Nationwide Academic Information Platform & Bilingual RAG Search Engine for Vietnam**

RateProfCuaBan is an institutional-grade academic discovery platform that catalogs universities, faculties, departments, and professors across Vietnam. It combines an automated, polite data acquisition and enrichment pipeline with a citation-grounded bilingual (Vietnamese/English) Retrieval-Augmented Generation (RAG) assistant, while preserving community student reviews and ratings.

---

## 🏛️ Platform Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       RATEPROFCUABAN SYSTEM ARCHITECTURE                     │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────────────────┐
  │ 1. DATA ACQUISITION & ENRICHMENT PIPELINE (Python 3.10+)                │
  │                                                                         │
  │  [Seed Directory] ────> [Polite Crawler] ───> [University Adapters]    │
  │  • 35+ VN Unis          • robots.txt check    • HUST, VNU, HCMUT, FTU   │
  │  • North/Central/South  • 1.5s rate limit     • NEU, UIT, Generic       │
  │                                                                         │
  │  [Entity Resolution] ─> [Image Rights Check]─> [Quality Assurance]     │
  │  • Vietnamese Diacritics• Fair use classifier • Completeness scoring    │
  │  • Academic title strip • SVG Avatar fallback • Regional balance audit  │
  └────────────────────────────────────┬────────────────────────────────────┘
                                       │ Generates JSON & Synced to DB
                                       ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ 2. CLOUD FIRESTORE PERSISTENCE & HARDENED SECURITY RULES                │
  │                                                                         │
  │  • Public Academic Catalogs: universities, faculties, professors,      │
  │    departments, courses, academicPublications, sourceDocuments         │
  │  • Community Reviews: reviews, reports, users (Rating rollup rules)     │
  │  • Admin Pipeline Controls: sourceRegistry, entityMatchCandidates,     │
  │    ingestionJobs, ingestionRuns, dataQualityReports                     │
  └────────────────────────────────────┬────────────────────────────────────┘
                                       │ Indexed for Retrieval
                                       ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │ 3. NEXT.JS 16 WEB PLATFORM & BILINGUAL RAG SEARCH ASSISTANT             │
  │                                                                         │
  │  • App Router (Next.js 16.4.1) with Cache Components & Partial Prefetch  │
  │  • Full Bilingual Routing (/vi and /en) with Search Param Preservation  │
  │  • RAG Assistant with Clickable Source Citations & Anti-Hallucination    │
  │  • Sub-millisecond In-Memory Search (p95 = 0.22ms over 1,000 queries)    │
  └─────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Key Features

### 1. Nationwide Academic Coverage
- **Geographic Balance**: Seeded across Northern (Hà Nội, Thái Nguyên), Central (Đà Nẵng, Huế, Quy Nhơn), and Southern (TP. Hồ Chí Minh, Cần Thơ) Vietnam.
- **Academic Hierarchy**: Institutions $\rightarrow$ Faculties/Schools $\rightarrow$ Departments $\rightarrow$ Teaching Staff $\rightarrow$ Courses & Publications.
- **Instructional Rank Integrity**: Strictly distinguishes statutory instructional ranks (**GS** / **PGS**) from academic degrees (**TS** / **ThS**) in compliance with the State Council for Professorship (*Hội đồng Giáo sư Nhà nước*).

### 2. Bilingual Citation-Grounded RAG Assistant
- **Strict Anti-Hallucination Policy**: Grounded exclusively in verified `.edu.vn` official records. If institutional evidence is unavailable (e.g., narrow subfields without indexed staff), the engine explicitly abstains rather than inventing faculty records.
- **Clickable Markdown Citations**: Every factual statement provides clickable source links to official university faculty directories.
- **Identity Disambiguation**: Detects cross-university identical or near-identical names and presents clear disambiguation notices.
- **Language Auto-Matching**: Automatically detects Vietnamese or English query intent and responds in the user's preferred language.

### 3. Polite & Legal Compliance Engine
- **Polite Crawling**: Respects `robots.txt`, identifies via `RateProfCuaBan-Academic-Bot/1.0 (+https://rateprofcuaban.vn/bot)`, and enforces a minimum 1.5s polite delay with exponential backoff.
- **No Anti-Bot Bypassing**: Social platforms (Facebook/LinkedIn) are never scraped behind authentication. Optional authorized manual exports are imported as unverified leads (`social_lead_unverified`) requiring administrative review.
- **Image Rights & Neutral SVG Fallbacks**: Copyright classifier checks whether photographs are licensed for reuse. If rights are uncertain, the system generates neutral SVG initials avatars.
- **Privacy Compliance**: Built to adhere to Vietnamese **Decree 13/2023/NĐ-CP** on Personal Data Protection, offering clear distinction between public institutional records and student opinions, accompanied by an administrative Right to Erasure / Correction protocol.

---

## 🛠️ CLI Runbook & Data Pipeline Commands

The Python ingestion pipeline is located in the `pipeline/` directory.

### Environment Setup
```bash
# Python 3.10+ virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r pipeline/requirements.txt
```

### Running Pipeline Commands
```bash
# 1. Run quick pilot pipeline (Seeds, Crawls, Deduplicates, and produces verified JSON)
python3 -m pipeline.cli --pilot

# 2. Run nationwide university discovery
python3 -m pipeline.cli --discover

# 3. Crawl a specific university using its custom adapter
python3 -m pipeline.cli --crawl hust

# 4. Run entity deduplication and generate cross-university candidate pairs
python3 -m pipeline.cli --dedup

# 5. Run automated Quality Assurance & Completeness scoring
python3 -m pipeline.cli --qa

# 6. Generate semantic RAG search index
python3 -m pipeline.cli --build-index

# 7. Import authorized social export (flagged as unverified leads)
python3 -m pipeline.cli --import-social path/to/export.json --platform facebook

# 8. Synchronize verified records to Firebase Firestore (Dry-run or Live)
python3 -m pipeline.cli --sync-firestore --dry-run
python3 -m pipeline.cli --sync-firestore
```

---

## 🧪 Testing & Verification

The project includes an exhaustive testing suite across Python and TypeScript layers:

```bash
# Run all Next.js bilingual, RAG, and search benchmark suites
npm test

# Run individual test suites
npm run test:bilingual    # 25 bilingual routing, diacritics, and terminology tests
npm run test:rag          # 6 mandatory RAG scenarios (Grounding, Disambiguation, etc.)
npm run test:pipeline     # Python pipeline unit tests (Deduplication, Adapters, QA)

# Run full production build
npm run build
```

### Test Suite Summary
- **25 Bilingual Integration Tests**: Route switching, diacritic-insensitive search, terminology mapping, translation key parity.
- **6 Mandatory RAG Scenarios**:
  1. *Cross-university research interest search* (e.g., AI/Machine Learning).
  2. *Regional faculty search* (e.g., IT professors in TP. Hồ Chí Minh).
  3. *Multilingual English queries* with English synthesis and source citations.
  4. *Instructional rank filtering* (Associate Professor PGS vs Full Professor GS).
  5. *Identity disambiguation* across professors with identical names.
  6. *Strict grounding abstention* (no hallucination on unindexed disciplines).
- **30 Search & Filtering Scenarios**: Sub-millisecond performance benchmark (`p95 = 0.22ms`, well under the 500ms target).
- **5 Python Pipeline Tests**: Unit tests for name normalization, image rights checking, and QA scoring.

---

## 🔒 Firestore Security Rules & Permissions

`firestore.rules` enforces granular access control across 15 collections:

| Collection Category | Collections | Permissions |
| :--- | :--- | :--- |
| **Public Academic Catalog** | `universities`, `faculties`, `departments`, `professors`, `courses`, `professorCourses`, `academicPublications`, `imageAssets`, `sourceDocuments` | Public Read (`allow read: if true`), Admin Write |
| **Community Reviews** | `reviews`, `reports`, `users` | Authenticated users create/edit own reviews and vote on helpfulness; Admins moderate |
| **Review Aggregation** | `professors` (rating rollups) | Controlled write via `isProfessorRatingUpdate` preserving atomic rating counts |
| **Administrative Pipeline** | `sourceRegistry`, `entityMatchCandidates`, `ingestionJobs`, `ingestionRuns`, `dataQualityReports` | Admin Only Read & Write |

To validate security rules against Firebase:
```bash
firebase deploy --only firestore:rules --dry-run
```

---

## 🌐 Next.js Web Application

The frontend is built on **Next.js 16.4.1** using React 19, Tailwind CSS v4, and Partial Prefetching.

### Key Pages
- `/` or `/[lang]`: Landing page featuring nationwide statistics, university shortcuts, and the interactive RAG Assistant.
- `/[lang]/professors`: Nationwide faculty search with multi-dimensional filtering (University, Region, Academic Rank, Minimum Rating).
- `/[lang]/professors/[id]`: Detailed professor profile with official institutional credentials, verified source citations, and student reviews.
- `/[lang]/universities/[id]`: University overview with accredited faculties, campuses, and faculty rosters.
- `/[lang]/admin`: Administrative dashboard with Review Moderation, Data Quality & Completeness Audit, and Entity Disambiguation Resolver.
- `/[lang]/guidelines`: Community and academic guidelines detailing provenance standards and the Decree 13/2023/NĐ-CP removal protocol.

---

## 📜 Ethical & Legal Policy

RateProfCuaBan maintains an absolute boundary between **verified institutional facts** and **subjective student reviews**:
1. **Institutional Facts**: Sourced exclusively from public `.edu.vn` university websites and official government registries. Verified by administrators.
2. **Student Reviews**: Subjective, moderated evaluations submitted by students. Governed by community moderation guidelines.
3. **Right to Erasure / Correction**: Lecturers wishing to correct outdated biographical information or request removal may submit a formal request via the platform's verified protocol in accordance with Vietnamese regulations.
