"""Unit Tests for SQLite Relational Persistence Engine in RateProfCuaBan."""

import unittest
import tempfile
import os
import sqlite3
from pipeline.sql_storage import SqliteStorage, strip_vietnamese_diacritics
from pipeline.models import UniversityRecord, ProfessorRecord, SourceRegistryRecord


class TestSqliteStorage(unittest.TestCase):

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.temp_dir.name, "test_rateprof.db")
        self.storage = SqliteStorage(db_path=self.db_path)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_schema_initialization(self):
        """Verifies all normalized tables and foreign keys are created properly."""
        with self.storage.get_connection() as conn:
            # Check foreign keys pragma
            fk = conn.execute("PRAGMA foreign_keys;").fetchone()[0]
            self.assertEqual(fk, 1)

            # Check required tables exist
            tables = [r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table';").fetchall()]
            expected = [
                "universities", "faculties", "departments", "lecturers",
                "affiliations", "sources", "crawl_jobs", "crawl_logs",
                "provenance", "entity_match_candidates", "reviews"
            ]
            for t in expected:
                self.assertIn(t, tables, f"Expected table '{t}' was not found in database.")

    def test_diacritic_normalization(self):
        """Verifies Vietnamese diacritics stripping for name indexing."""
        self.assertEqual(strip_vietnamese_diacritics("Nguyễn Văn An"), "nguyen van an")
        self.assertEqual(strip_vietnamese_diacritics("Đỗ Đình Đạt"), "do dinh dat")
        self.assertEqual(strip_vietnamese_diacritics("Phan Tuấn Nghĩa"), "phan tuan nghia")
        self.assertEqual(strip_vietnamese_diacritics("Huỳnh Thị Thanh Bình"), "huynh thi thanh binh")

    def test_batch_upsert_universities(self):
        """Verifies transactional upsert of universities with conflict handling."""
        u1 = UniversityRecord(
            id="hust",
            name="Đại học Bách Khoa Hà Nội",
            short_name="HUST",
            city="Hà Nội",
            region="north",
            official_domain="hust.edu.vn",
            total_professors=120,
        )
        u2 = UniversityRecord(
            id="vnu-uet",
            name="Trường Đại học Công nghệ - ĐHQGHN",
            short_name="VNU-UET",
            city="Hà Nội",
            region="north",
            official_domain="uet.vnu.edu.vn",
            total_professors=85,
        )

        inserted = self.storage.batch_upsert_universities([u1, u2])
        self.assertEqual(inserted, 2)

        with self.storage.get_connection() as conn:
            cnt = conn.execute("SELECT COUNT(*) FROM universities;").fetchone()[0]
            self.assertEqual(cnt, 2)

            # Update u1 professor count
            u1.total_professors = 150
            self.storage.batch_upsert_universities([u1])
            updated_cnt = conn.execute("SELECT total_professors FROM universities WHERE id = 'hust';").fetchone()[0]
            self.assertEqual(updated_cnt, 150)

    def test_batch_upsert_professors_and_affiliations(self):
        """Verifies transactional upsert of lecturers and foreign key integrity."""
        u = UniversityRecord(
            id="ctu",
            name="Trường Đại học Cần Thơ",
            short_name="CTU",
            city="Cần Thơ",
            region="south",
            official_domain="ctu.edu.vn",
        )
        self.storage.batch_upsert_universities([u])

        p1 = ProfessorRecord(
            id="prof-ctu-nguyen-van-a",
            name="Nguyễn Văn A",
            university_id="ctu",
            university_name="Trường Đại học Cần Thơ",
            university_short_name="CTU",
            faculty="Công nghệ Thông tin",
            title="PGS. TS.",
            academic_title="PGS",
            rating_average=4.8,
            rating_count=12,
        )

        profs_saved, affs_saved = self.storage.batch_upsert_professors([p1])
        self.assertEqual(profs_saved, 1)
        self.assertEqual(affs_saved, 1)

        with self.storage.get_connection() as conn:
            lecturer = conn.execute("SELECT name, normalized_name, academic_rank FROM lecturers WHERE id = ?;", (p1.id,)).fetchone()
            self.assertIsNotNone(lecturer)
            self.assertEqual(lecturer["name"], "Nguyễn Văn A")
            self.assertEqual(lecturer["normalized_name"], "nguyen van a")
            self.assertEqual(lecturer["academic_rank"], "PGS")

            aff = conn.execute("SELECT university_id, faculty, is_primary FROM affiliations WHERE lecturer_id = ?;", (p1.id,)).fetchone()
            self.assertIsNotNone(aff)
            self.assertEqual(aff["university_id"], "ctu")
            self.assertEqual(aff["faculty"], "Công nghệ Thông tin")
            self.assertEqual(aff["is_primary"], 1)

    def test_foreign_key_protection_for_new_universities(self):
        """Verifies that inserting professors with unlisted institutions automatically creates the university."""
        p_new = ProfessorRecord(
            id="prof-new-le-van-b",
            name="Lê Văn B",
            university_id="new-inst",
            university_name="Trường Đại học Mới",
            university_short_name="NEW-INST",
            faculty="Toán Tin",
            title="GS. TS.",
            academic_title="GS",
        )

        # Upsert without explicitly registering university first
        profs_saved, affs_saved = self.storage.batch_upsert_professors([p_new])
        self.assertEqual(profs_saved, 1)

        with self.storage.get_connection() as conn:
            uni = conn.execute("SELECT id, name FROM universities WHERE id = 'new-inst';").fetchone()
            self.assertIsNotNone(uni)
            self.assertEqual(uni["name"], "Trường Đại học Mới")


if __name__ == "__main__":
    unittest.main()
