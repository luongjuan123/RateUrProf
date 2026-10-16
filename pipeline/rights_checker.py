"""Image Rights Assessment and Neutral SVG Placeholder Generator.
Categorizes images according to copyright and fair-use standards, preventing unauthorized hotlinking.
Generates dignified, accessible SVG initials avatar placeholders when rights are restricted or missing.
"""

from __future__ import annotations
import urllib.parse
import hashlib
from typing import Optional, Tuple
from pipeline.models import ImageAssetRecord, ProfessorRecord


class ImageRightsChecker:
    """Evaluates rights and manages profile photo representations."""

    EDUCATIONAL_DOMAINS = [
        "edu.vn",
        "vnu.edu.vn",
        "udn.vn",
        "hueuni.edu.vn",
        "rmit.edu.vn",
        "ac.uk",
        "edu",
    ]

    OPEN_LICENSE_DOMAINS = [
        "wikimedia.org",
        "wikipedia.org",
        "creativecommons.org",
    ]

    RESTRICTED_DOMAINS = [
        "facebook.com",
        "fbcdn.net",
        "instagram.com",
        "linkedin.com",
        "shutterstock.com",
        "gettyimages.com",
        "pinterest.com",
    ]

    @classmethod
    def evaluate_image_url(cls, image_url: str) -> Tuple[str, str, str]:
        """
        Evaluates an image URL.
        Returns (license_category, permission_status, storage_mode).
        """
        if not image_url or not image_url.startswith("http"):
            return "unknown", "rejected", "neutral_placeholder"

        parsed = urllib.parse.urlparse(image_url)
        domain = parsed.netloc.lower()

        # Check restricted domains (social media, stock photos)
        if any(r_dom in domain for r_dom in cls.RESTRICTED_DOMAINS):
            return "restricted", "rejected", "neutral_placeholder"

        # Check open license repositories
        if any(o_dom in domain for o_dom in cls.OPEN_LICENSE_DOMAINS):
            return "open_license", "approved", "source_url"

        # Check official university domains
        if any(domain.endswith(e_dom) or f".{e_dom}" in domain for e_dom in cls.EDUCATIONAL_DOMAINS):
            return "official_academic_public", "approved", "source_url"

        # Other third-party websites: requires admin review before publication
        return "fair_use_educational", "pending_review", "neutral_placeholder"

    @classmethod
    def create_image_asset(
        cls, image_url: str, professor_id: str
    ) -> ImageAssetRecord:
        """Constructs an ImageAssetRecord with rights assessment and hash."""
        lic_cat, perm_status, storage_mode = cls.evaluate_image_url(image_url)
        url_hash = hashlib.sha256(image_url.encode("utf-8")).hexdigest()[:16]

        return ImageAssetRecord(
            id=f"img-{professor_id}-{url_hash}",
            source_url=image_url,
            professor_id=professor_id,
            license_category=lic_cat,  # type: ignore
            permission_status=perm_status,  # type: ignore
            storage_mode=storage_mode,  # type: ignore
            sha256=url_hash,
        )

    @classmethod
    def generate_svg_avatar(cls, full_name: str, academic_title: Optional[str] = None) -> str:
        """
        Generates a clean, accessible SVG avatar placeholder with the professor's initials
        and an academic navy/indigo gradient.
        """
        words = [w for w in full_name.strip().split() if w]
        if len(words) >= 2:
            initials = f"{words[0][0]}{words[-1][0]}".upper()
        elif len(words) == 1:
            initials = words[0][:2].upper()
        else:
            initials = "GV"

        # Academic color palette based on initials hash
        colors = [
            ("#1e3a8a", "#3b82f6"),  # Navy to Royal
            ("#0f766e", "#14b8a6"),  # Teal to Cyan
            ("#4338ca", "#6366f1"),  # Indigo
            ("#701a75", "#a855f7"),  # Plum to Purple
            ("#1e293b", "#475569"),  # Slate
        ]
        color_idx = sum(ord(c) for c in initials) % len(colors)
        c1, c2 = colors[color_idx]

        svg = (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">'
            f'<defs>'
            f'<linearGradient id="grad-{color_idx}" x1="0%" y1="0%" x2="100%" y2="100%">'
            f'<stop offset="0%" stop-color="{c1}"/>'
            f'<stop offset="100%" stop-color="{c2}"/>'
            f'</linearGradient>'
            f'</defs>'
            f'<circle cx="60" cy="60" r="58" fill="url(#grad-{color_idx})" stroke="#ffffff" stroke-width="2"/>'
            f'<text x="60" y="68" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif" '
            f'font-size="40" font-weight="600" fill="#ffffff" letter-spacing="1">{initials}</text>'
            f'</svg>'
        )
        return svg

    @classmethod
    def resolve_profile_image(cls, professor: ProfessorRecord) -> str:
        """
        Resolves the safest image URL for a professor.
        If the current avatar fails rights check or is empty, returns an inline SVG data URI.
        """
        if not professor.avatar:
            svg = cls.generate_svg_avatar(professor.name, professor.academic_title)
            import urllib.parse
            return f"data:image/svg+xml;utf8,{urllib.parse.quote(svg)}"

        lic_cat, perm_status, storage_mode = cls.evaluate_image_url(professor.avatar)
        if perm_status == "approved" and storage_mode == "source_url":
            return professor.avatar

        # Fallback to neutral SVG
        svg = cls.generate_svg_avatar(professor.name, professor.academic_title)
        import urllib.parse
        return f"data:image/svg+xml;utf8,{urllib.parse.quote(svg)}"
