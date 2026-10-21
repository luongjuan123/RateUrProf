"""Unit tests for HauCollector."""

import unittest
from data_collection.collectors.hau import HauCollector


class TestHauCollector(unittest.TestCase):
    def setUp(self):
        self.collector = HauCollector()

    def test_can_handle_domains(self):
        self.assertTrue(self.collector.can_handle("https://hau.edu.vn/gioi-thieu"))
        self.assertTrue(self.collector.can_handle("https://kxd-dhkt.edu.vn/co-cau-to-chuc"))
        self.assertTrue(self.collector.can_handle("http://khoadothi.hau.edu.vn/bo-mon/"))
        self.assertTrue(self.collector.can_handle("https://art.hau.edu.vn/danh-muc-khoa/"))
        self.assertTrue(self.collector.can_handle("https://fit.hau.edu.vn/"))
        self.assertTrue(self.collector.can_handle("https://docs.google.com/document/d/1jxKIsCfSg70vMv2HLwn6X3FeeOUBzkrv/mobilebasic"))
        self.assertFalse(self.collector.can_handle("https://hust.edu.vn/faculty"))

    def test_extract_ba_cong_khai_table(self):
        names = ["Nguyễn Văn Nam", "Trần Thị Mai", "Lê Văn Hùng", "Phạm Thị Lan", "Hoàng Văn Đức"]
        sample_html = """
        <html>
        <body>
            <p>BIEU MAU 20</p>
            <table>
                <tr>
                    <th>STT</th>
                    <th>Họ và tên</th>
                    <th>Năm sinh</th>
                    <th>Giới tính</th>
                    <th>Chức danh khoa học</th>
                    <th>Trình độ đào tạo</th>
                    <th>Khối ngành giảng dạy</th>
                </tr>
                """ + "".join([f"""
                <tr>
                    <td>{i}</td>
                    <td>{names[i % len(names)]}</td>
                    <td>1980</td>
                    <td>Nam</td>
                    <td>{'Phó giáo sư' if i % 10 == 0 else ''}</td>
                    <td>Tiến sĩ</td>
                    <td>Khối ngành V</td>
                </tr>
                """ for i in range(1, 60)]) + """
            </table>
        </body>
        </html>
        """
        results = self.collector.collect(sample_html, "https://docs.google.com/document/d/1jxKIsCfSg70vMv2HLwn6X3FeeOUBzkrv/mobilebasic")
        self.assertEqual(len(results), 59)
        self.assertEqual(results[0]["name"], "Trần Thị Mai")
        self.assertEqual(results[0]["university_id"], "hau")


if __name__ == "__main__":
    unittest.main()
