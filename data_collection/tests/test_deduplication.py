"""Unit tests for deduplication and identity resolution."""

import unittest
from data_collection.deduplication import DeduplicationEngine


class TestDeduplication(unittest.TestCase):

    def test_same_institution_merge(self):
        r1 = {
            "id": "prof-hust-nguyen-van-a",
            "name": "Nguyễn Văn A",
            "university_id": "hust",
            "university_name": "ĐH Bách Khoa Hà Nội",
            "faculty": "Khoa CNTT",
            "source_urls": ["https://soict.hust.edu.vn/can-bo"],
            "identifiers": {"institutionalEmail": "anv@hust.edu.vn"},
        }
        r2 = {
            "id": "prof-hust-nguyen-van-a-2",
            "name": "TS. Nguyễn Văn A",
            "university_id": "hust",
            "university_name": "ĐH Bách Khoa Hà Nội",
            "faculty": "Khoa CNTT",
            "source_urls": ["https://hust.edu.vn/can-bo/anv"],
            "identifiers": {"institutionalEmail": "anv@hust.edu.vn"},
        }

        merged, candidates = DeduplicationEngine.deduplicate_batch([r2], [r1])
        self.assertEqual(len(merged), 1)
        self.assertEqual(len(candidates), 0)
        self.assertEqual(len(merged[0]["source_urls"]), 2)

    def test_cross_institution_candidate_creation(self):
        # Two professors with identical names at DIFFERENT universities
        r1 = {
            "id": "prof-hust-nguyen-van-a",
            "name": "Nguyễn Văn A",
            "university_id": "hust",
            "university_name": "ĐH Bách Khoa Hà Nội",
            "faculty": "Khoa CNTT",
            "source_urls": ["https://soict.hust.edu.vn/can-bo"],
            "identifiers": {},
        }
        r2 = {
            "id": "prof-uit-nguyen-van-a",
            "name": "Nguyễn Văn A",
            "university_id": "uit",
            "university_name": "ĐH Công nghệ Thông tin",
            "faculty": "Khoa Khoa học Máy tính",
            "source_urls": ["https://cs.uit.edu.vn/giang-vien"],
            "identifiers": {},
        }

        merged, candidates = DeduplicationEngine.deduplicate_batch([r2], [r1])
        # Crucial requirement: Must NOT silently merge across universities!
        self.assertEqual(len(merged), 2)
        self.assertEqual(len(candidates), 1)
        self.assertEqual(candidates[0]["source_university"], "ĐH Công nghệ Thông tin")
        self.assertEqual(candidates[0]["candidate_university"], "ĐH Bách Khoa Hà Nội")


if __name__ == "__main__":
    unittest.main()
