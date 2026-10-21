"""Unit tests for record validation and anti-fabrication gates."""

import unittest
from data_collection.validation import RecordValidator


class TestValidation(unittest.TestCase):

    def test_valid_human_names(self):
        valid_names = [
            "Nguyễn Văn A",
            "Trần Thị Thu Thảo",
            "Đỗ Đình Đạt",
            "Hoàng Đăng Khoa",
            "Huỳnh Thị Thanh Bình",
            "PGS. TS. Phạm Văn Nam",
            "GS. Vũ Đình Thành",
        ]
        for name in valid_names:
            is_valid, reason = RecordValidator.is_valid_human_name(name)
            self.assertTrue(is_valid, f"Failed for {name}: {reason}")

    def test_reject_navigation_and_menu_items(self):
        # These are real false positives found during the audit!
        bad_names = [
            "Đội ngũ GS, PGS",
            "Văn bản liên quan",
            "Công khai bổ nhiệm GS-PGS",
            "Chi tiết bài viết",
            "Xem thêm danh sách",
            "Thông báo tuyển sinh",
            "Quy chế đào tạo",
            "Ban Giám Hiệu Trường",
            "Trang chủ Khoa CNTT",
        ]
        for name in bad_names:
            is_valid, reason = RecordValidator.is_valid_human_name(name)
            self.assertFalse(is_valid, f"Should have rejected '{name}', but passed")

    def test_validate_email(self):
        self.assertEqual(RecordValidator.validate_email("anv@hust.edu.vn"), "anv@hust.edu.vn")
        self.assertEqual(RecordValidator.validate_email("  User.Test@VNU.EDU.VN "), "user.test@vnu.edu.vn")
        self.assertIsNone(RecordValidator.validate_email("not-an-email"))
        self.assertIsNone(RecordValidator.validate_email(None))

    def test_validate_professor_record(self):
        valid_rec = {
            "name": "Nguyễn Văn A",
            "university_id": "hust",
            "source_urls": ["https://soict.hust.edu.vn/can-bo"],
        }
        is_valid, errors = RecordValidator.validate_professor_record(valid_rec)
        self.assertTrue(is_valid, f"Errors: {errors}")

        # Missing source URLs
        invalid_rec = {
            "name": "Nguyễn Văn A",
            "university_id": "hust",
            "source_urls": [],
        }
        is_valid, errors = RecordValidator.validate_professor_record(invalid_rec)
        self.assertFalse(is_valid)


if __name__ == "__main__":
    unittest.main()
