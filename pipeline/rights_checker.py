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
        "tnu.edu.vn",
        "rmit.edu.vn",
        "fpt.edu.vn",
        "phenikaa-uni.edu.vn",
        "tdtu.edu.vn",
        "iuh.edu.vn",
        "hutech.edu.vn",
        "vanlanguni.edu.vn",
        "hoasen.edu.vn",
        "ueh.edu.vn",
        "ctu.edu.vn",
        "dlu.edu.vn",
        "vinhuni.edu.vn",
        "qnu.edu.vn",
        "ntu.edu.vn",
        "ac.uk",
        "edu",
        "gov.vn",
        "org.vn",
    ]

    OPEN_LICENSE_DOMAINS = [
        "wikimedia.org",
        "wikipedia.org",
        "creativecommons.org",
        "githubusercontent.com",
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
        if not image_url or not isinstance(image_url, str):
            return "unknown", "rejected", "neutral_placeholder"

        image_url = image_url.strip().strip("'\"")
        if image_url.startswith("//"):
            image_url = "https:" + image_url

        if not image_url.startswith(("http://", "https://")):
            return "unknown", "rejected", "neutral_placeholder"

        # Filter out obvious spacers/icons/UI assets
        lower_url = image_url.lower()
        if any(bad in lower_url for bad in ["1x1", "spacer", "pixel", "blank", "icon", "logo", "favicon", "pdf.gif", "printer", "button", "arrow", "bullet"]):
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
        and solid flat Neo-Brutalist color (zero gradients).
        """
        words = [w for w in full_name.strip().split() if w]
        if len(words) >= 2:
            initials = f"{words[0][0]}{words[-1][0]}".upper()
        elif len(words) == 1:
            initials = words[0][:2].upper()
        else:
            initials = "GV"

        # Academic solid flat color palette based on initials hash
        colors = [
            "#1e3a8a",  # Navy
            "#0f766e",  # Teal
            "#4338ca",  # Indigo
            "#701a75",  # Plum
            "#1e293b",  # Slate
            "#047857",  # Dark Green
            "#c2410c",  # Orange Rust
            "#b91c1c",  # Red
        ]
        color_idx = sum(ord(c) for c in initials) % len(colors)
        bg = colors[color_idx]

        svg = (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">'
            f'<rect width="120" height="120" fill="{bg}"/>'
            f'<text x="60" y="68" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif" '
            f'font-size="40" font-weight="700" fill="#ffffff" letter-spacing="1">{initials}</text>'
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
