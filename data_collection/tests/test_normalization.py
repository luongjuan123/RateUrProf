"""Unit tests for Vietnamese name and title normalization."""

import unittest
from data_collection.normalization import Normalizer


class TestNormalization(unittest.TestCase):

    def test_strip_academic_titles(self):
        cases = [
            ("PGS. TS. Nguyễn Văn A", "Nguyễn Văn A"),
            ("GS.TS. Đỗ Đình Đạt", "Đỗ Đình Đạt"),
            ("ThS. Trần Thị Thu Thảo", "Trần Thị Thu Thảo"),
            ("GS. TS. BS. Phạm Như Hiệp", "Phạm Như Hiệp"),
            ("TS. KTS. Lê Văn B", "Lê Văn B"),
            ("Giáo sư, Tiến sĩ Hoàng Nam", "Hoàng Nam"),
            ("Phó Giáo sư Nguyễn An", "Nguyễn An"),
        ]
        for raw, expected in cases:
            self.assertEqual(Normalizer.strip_academic_titles(raw), expected)

    def test_normalize_name_for_matching(self):
        cases = [
            ("PGS. TS. Nguyễn Văn A", "nguyen van a"),
            ("Đỗ Đình Đạt", "do dinh dat"),
            ("Trần Thị Thu Thảo", "tran thi thu thao"),
            ("Lê Nhựt Đăng Khoa", "le nhut dang khoa"),
        ]
        for raw, expected in cases:
            self.assertEqual(Normalizer.normalize_name_for_matching(raw), expected)

    def test_parse_academic_ranks(self):
        rank, degree, title = Normalizer.parse_academic_ranks("GS. TS. Nguyễn Văn A")
        self.assertEqual(rank, "GS")
        self.assertEqual(degree, "TS")
        self.assertEqual(title, "GS.TS")

        rank, degree, title = Normalizer.parse_academic_ranks("PGS. ThS. Trần Thị B")
        self.assertEqual(rank, "PGS")
        self.assertEqual(degree, "ThS")
        self.assertEqual(title, "PGS.ThS")

        rank, degree, title = Normalizer.parse_academic_ranks("TS. Lê Văn C")
        self.assertIsNone(rank)
        self.assertEqual(degree, "TS")
        self.assertEqual(title, "TS")

        rank, degree, title = Normalizer.parse_academic_ranks("ThS. Phạm Văn D")
        self.assertIsNone(rank)
        self.assertEqual(degree, "ThS")
        self.assertEqual(title, "ThS")


if __name__ == "__main__":
    unittest.main()
