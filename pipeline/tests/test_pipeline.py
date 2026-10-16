"""Comprehensive Unit Tests for RateProfCuaBan Academic Pipeline."""

import unittest
from pipeline.dedup import IdentityResolutionEngine
from pipeline.rights_checker import ImageRightsChecker
from pipeline.discovery import UniversityDiscoveryService
from pipeline.quality_assurance import AcademicQualityAssuranceService
from pipeline.models import (
    UniversityRecord,
    ProfessorRecord,
    ProvenanceEvidence,
    EntityMatchCandidateRecord,
    SourceRegistryRecord,
)
from pipeline.adapters.hust_adapter import HustAdapter
from pipeline.adapters.vnu_uet_adapter import VnuUetAdapter
from pipeline.adapters.hcmut_adapter import HcmutAdapter
from pipeline.adapters.neu_adapter import NeuAdapter
from pipeline.adapters.ftu_adapter import FtuAdapter
from pipeline.adapters.uit_adapter import UitAdapter
from pipeline.adapters.generic_academic_adapter import GenericAcademicAdapter


class TestAcademicPipeline(unittest.TestCase):

    def test_vietnamese_name_normalization(self):
        # Academic prefixes stripped
        name1 = "PGS. TS. Nguyễn Văn A"
        norm1 = IdentityResolutionEngine.normalize_name(name1)
        self.assertEqual(norm1, "nguyen van a")

        name2 = "GS.TS. Đỗ Đình Đạt"
        norm2 = IdentityResolutionEngine.normalize_name(name2)
        self.assertEqual(norm2, "do dinh dat")

        name3 = "ThS. Trần Thị Thu Thảo"
        norm3 = IdentityResolutionEngine.normalize_name(name3)
        self.assertEqual(norm3, "tran thi thu thao")

    def test_identity_resolution_matching(self):
        # Exact identifier match
        p1 = ProfessorRecord(
            id="p1",
            name="Nguyễn Văn A",
            university_id="hust",
            university_name="ĐH Bách Khoa Hà Nội",
            university_short_name="HUST",
            faculty="CNTT",
            identifiers={"institutionalEmail": "anv@hust.edu.vn"},
        )
        p2 = ProfessorRecord(
            id="p2",
            name="Nguyễn Văn A",
            university_id="hust",
            university_name="ĐH Bách Khoa Hà Nội",
            university_short_name="HUST",
            faculty="CNTT",
            identifiers={"institutionalEmail": "anv@hust.edu.vn"},
        )
        score, reasons = IdentityResolutionEngine.compare_professors(p1, p2)
        self.assertEqual(score, 1.0)
        self.assertTrue(any("định danh" in r for r in reasons))

        # Cross university candidate creation
        p3 = ProfessorRecord(
            id="p3",
            name="Nguyễn Văn A",
            university_id="uit",
            university_name="ĐH Công nghệ Thông tin",
            university_short_name="UIT",
            faculty="Khoa học Máy tính",
        )
        merged, candidates = IdentityResolutionEngine.deduplicate_batch([p1, p3], [])
        self.assertEqual(len(candidates), 1)
        self.assertEqual(candidates[0].status, "pending")

    def test_image_rights_checker(self):
        # Official university image
        lic, status, mode = ImageRightsChecker.evaluate_image_url(
            "https://soict.hust.edu.vn/uploads/avatar.jpg"
        )
        self.assertEqual(lic, "official_academic_public")
        self.assertEqual(status, "approved")

        # Restricted social image
        lic_fb, status_fb, mode_fb = ImageRightsChecker.evaluate_image_url(
            "https://facebook.com/profile/pic.jpg"
        )
        self.assertEqual(lic_fb, "restricted")
        self.assertEqual(status_fb, "rejected")

        # SVG Avatar generation
        svg = ImageRightsChecker.generate_svg_avatar("Huỳnh Thị Thanh Bình")
        self.assertIn("<svg", svg)
        self.assertIn("HB", svg)

    def test_adapters_domain_matching(self):
        hust = HustAdapter()
        self.assertTrue(hust.can_handle("https://soict.hust.edu.vn/can-bo"))
        self.assertFalse(hust.can_handle("https://uet.vnu.edu.vn"))

        uet = VnuUetAdapter()
        self.assertTrue(uet.can_handle("https://uet.vnu.edu.vn/giang-vien"))

        hcmut = HcmutAdapter()
        self.assertTrue(hcmut.can_handle("https://cse.hcmut.edu.vn/people/faculty"))

        neu = NeuAdapter()
        self.assertTrue(neu.can_handle("https://neu.edu.vn/giang-vien"))

        ftu = FtuAdapter()
        self.assertTrue(ftu.can_handle("https://ftu.edu.vn/doi-ngu"))

        uit = UitAdapter()
        self.assertTrue(uit.can_handle("https://cs.uit.edu.vn/giang-vien"))

        generic = GenericAcademicAdapter()
        self.assertTrue(generic.can_handle("https://ctu.edu.vn/can-bo"))

    def test_quality_assurance_metrics(self):
        discovery = UniversityDiscoveryService()
        universities = discovery.get_all_universities()
        sources = discovery.build_source_registry()

        p1 = ProfessorRecord(
            id="p1",
            name="Huỳnh Thị Thanh Bình",
            university_id="hust",
            university_name="ĐHBK Hà Nội",
            university_short_name="HUST",
            faculty="CNTT",
            verification_status="verified",
        )
        report = AcademicQualityAssuranceService.generate_report(
            universities, [p1], [], sources
        )
        self.assertGreaterEqual(report.total_universities, 10)
        self.assertEqual(report.verified_professors_count, 1)
        self.assertIn("north", report.coverage_by_region)
        self.assertIn("central", report.coverage_by_region)
        self.assertIn("south", report.coverage_by_region)


if __name__ == "__main__":
    unittest.main()
