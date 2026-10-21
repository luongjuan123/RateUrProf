"""Unit tests for storage engine operations in SQLite."""

import unittest
import tempfile
import os
from data_collection.storage import StorageEngine


class TestStorage(unittest.TestCase):

    def setUp(self):
        self.tmp_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.tmp_dir, "test_rateprof.db")
        self.storage = StorageEngine(self.db_path)

    def tearDown(self):
        try:
            if os.path.exists(self.db_path):
                os.remove(self.db_path)
            os.rmdir(self.tmp_dir)
        except Exception:
            pass

    def test_upsert_universities_and_professors(self):
        unis = [{
            "id": "hust",
            "name": "Đại học Bách Khoa Hà Nội",
            "short_name": "HUST",
            "city": "Hà Nội",
            "region": "Miền Bắc",
        }]
        u_count = self.storage.batch_upsert_universities(unis)
        self.assertEqual(u_count, 1)

        profs = [{
            "id": "prof-hust-nguyen-van-a",
            "name": "Nguyễn Văn A",
            "university_id": "hust",
            "faculty": "Công nghệ Thông tin",
            "title": "PGS. TS",
            "source_urls": ["https://soict.hust.edu.vn/can-bo"],
        }]
        p_count, a_count = self.storage.batch_upsert_professors(profs)
        self.assertEqual(p_count, 1)
        self.assertEqual(a_count, 1)

        stats = self.storage.get_stats()
        self.assertEqual(stats["total_lecturers"], 1)
        self.assertEqual(stats["verified_lecturers"], 1)
        self.assertEqual(stats["pgs_count"], 1)

    def test_idempotent_writes(self):
        profs = [{
            "id": "prof-hust-nguyen-van-b",
            "name": "Nguyễn Văn B",
            "university_id": "hust",
            "faculty": "Toán - Tin",
            "source_urls": ["https://soict.hust.edu.vn/can-bo"],
        }]
        self.storage.batch_upsert_professors(profs)
        # Running second time should NOT create duplicate
        self.storage.batch_upsert_professors(profs)
        stats = self.storage.get_stats()
        self.assertEqual(stats["total_lecturers"], 1)


if __name__ == "__main__":
    unittest.main()
