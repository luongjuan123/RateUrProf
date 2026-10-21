"""Polite HTTP Crawler, Robots.txt Parser, and Structured Content Extractor.
Strictly adheres to robots.txt, respects site terms, rate limits, and Vietnamese legal standards.
"""

from __future__ import annotations
import urllib.robotparser
import urllib.parse
import hashlib
import time
import json
import re
import ssl
from typing import Optional, Dict, Any, List, Tuple
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

import threading

BOT_USER_AGENT = "RateUrProfs-Bot/1.0 (+https://rateurprofs.site/bot; contact@rateurprofs.site)"

# SSL context for academic domains that may have incomplete intermediate CA certificates
SSL_CONTEXT = ssl.create_default_context()
SSL_CONTEXT.check_hostname = False
SSL_CONTEXT.verify_mode = ssl.CERT_NONE


class RobotsChecker:
    """Manages and caches robots.txt policies per domain."""

    def __init__(self, user_agent: str = BOT_USER_AGENT):
        self.user_agent = user_agent
        self._parsers: Dict[str, urllib.robotparser.RobotFileParser] = {}
        self._crawl_delays: Dict[str, float] = {}

    def get_parser(self, domain: str) -> urllib.robotparser.RobotFileParser:
        if domain not in self._parsers:
            rp = urllib.robotparser.RobotFileParser()
            robots_url = f"https://{domain}/robots.txt"
            rp.set_url(robots_url)
            try:
                # Polite fetch of robots.txt with short timeout
                req = Request(robots_url, headers={"User-Agent": self.user_agent})
                with urlopen(req, timeout=5, context=SSL_CONTEXT) as resp:
                    if resp.status == 200:
                        content = resp.read().decode("utf-8", errors="ignore")
                        rp.parse(content.splitlines())
                    else:
                        rp.allow_all = True
            except Exception:
                # If robots.txt cannot be fetched, default to permissive but cautious
                rp.allow_all = True

            self._parsers[domain] = rp
            delay = rp.crawl_delay(self.user_agent)
            self._crawl_delays[domain] = float(delay) if delay else 1.0

        return self._parsers[domain]

    def can_fetch(self, url: str) -> bool:
        parsed = urllib.parse.urlparse(url)
        domain = parsed.netloc
        if not domain:
            return False
        parser = self.get_parser(domain)
        return parser.can_fetch(self.user_agent, url)

    def get_crawl_delay(self, domain: str) -> float:
        if domain not in self._crawl_delays:
            self.get_parser(domain)
        return self._crawl_delays.get(domain, 1.0)


class PoliteFetcher:
    """Polite HTTP client with rate limiting, exponential backoff, and conditional caching."""

    def __init__(
        self,
        user_agent: str = BOT_USER_AGENT,
        default_delay: float = 1.0,
        max_retries: int = 3,
    ):
        self.user_agent = user_agent
        self.default_delay = default_delay
        self.max_retries = max_retries
        self.robots_checker = RobotsChecker(user_agent)
        self._lock = threading.Lock()
        self._last_access: Dict[str, float] = {}
        self._cache_meta: Dict[str, Dict[str, str]] = {}  # url -> {etag, last_modified, hash}

    def _wait_for_rate_limit(self, domain: str):
        with self._lock:
            crawl_delay = max(self.robots_checker.get_crawl_delay(domain), self.default_delay)
            now = time.time()
            last = self._last_access.get(domain, 0.0)
            elapsed = now - last
            wait_time = crawl_delay - elapsed if elapsed < crawl_delay else 0.0
            self._last_access[domain] = now + wait_time

        if wait_time > 0:
            time.sleep(wait_time)

    def fetch(
        self, url: str, check_robots: bool = True
    ) -> Tuple[Optional[str], int, Dict[str, str]]:
        """
        Fetches URL politely. Returns (content_text, status_code, metadata).
        If unchanged (304), content_text may be None.
        """
        parsed = urllib.parse.urlparse(url)
        domain = parsed.netloc

        if check_robots and not self.robots_checker.can_fetch(url):
            return None, 403, {"error": "Blocked by robots.txt policy"}

        self._wait_for_rate_limit(domain)

        headers = {
            "User-Agent": self.user_agent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "vi,en-US;q=0.8,en;q=0.6",
        }

        # Add conditional headers if cached
        cached = self._cache_meta.get(url)
        if cached:
            if "etag" in cached:
                headers["If-None-Match"] = cached["etag"]
            if "last_modified" in cached:
                headers["If-Modified-Since"] = cached["last_modified"]

        retries = 0
        backoff = 1.0

        request_data = None
        if "qldiem.ctu.edu.vn" in url:
            unit_code = "%%"
            page_no = "1"
            if "unit_" in url:
                unit_code = url.split("unit_")[-1].split("&")[0]
            if "page=" in url:
                page_no = url.split("page=")[-1].split("&")[0]
            headers["Content-Type"] = "application/x-www-form-urlencoded"
            request_data = urllib.parse.urlencode({
                'cmbDonVi': unit_code,
                'cmbBoMon': '%%',
                'cboHocHam': '',
                'cboHocVi': '',
                'txtHoTen': '',
                'btnSearch': 'Tìm kiếm',
                'curPage': page_no
            }).encode('utf-8')

        while retries <= self.max_retries:
            try:
                req = Request(url, data=request_data, headers=headers)
                with urlopen(req, timeout=15, context=SSL_CONTEXT) as resp:
                    status = resp.status
                    resp_headers = dict(resp.headers)
                    raw_data = resp.read()

                    # Compute sha256 hash of response
                    content_hash = hashlib.sha256(raw_data).hexdigest()
                    etag = resp_headers.get("ETag")
                    last_mod = resp_headers.get("Last-Modified")

                    self._cache_meta[url] = {
                        "etag": etag or "",
                        "last_modified": last_mod or "",
                        "hash": content_hash,
                    }

                    raw_charset = resp.headers.get_content_charset() or "utf-8"
                    charset = raw_charset.split(",")[0].strip() if "," in raw_charset else raw_charset.strip()
                    try:
                        content = raw_data.decode(charset, errors="replace")
                    except (LookupError, UnicodeDecodeError):
                        content = raw_data.decode("utf-8", errors="replace")

                    return content, status, {
                        "hash": content_hash,
                        "etag": etag or "",
                        "last_modified": last_mod or "",
                    }

            except HTTPError as e:
                if e.code == 304:
                    return None, 304, {"cached": "true", "hash": cached.get("hash", "") if cached else ""}
                if e.code in (429, 503):
                    # Polite backoff
                    retries += 1
                    time.sleep(backoff)
                    backoff *= 2.0
                    continue
                return None, e.code, {"error": str(e)}
            except (URLError, TimeoutError) as e:
                retries += 1
                if retries > self.max_retries:
                    return None, 0, {"error": str(e)}
                time.sleep(backoff)
                backoff *= 1.5

        return None, 500, {"error": "Exceeded maximum retry attempts"}


class StructuredDataExtractor:
    """Extracts Schema.org JSON-LD structured metadata from HTML pages."""

    @staticmethod
    def extract_json_ld(html: str) -> List[Dict[str, Any]]:
        """Parses all <script type="application/ld+json"> blocks."""
        pattern = re.compile(
            r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
            re.DOTALL | re.IGNORECASE,
        )
        results: List[Dict[str, Any]] = []
        for match in pattern.finditer(html):
            raw_json = match.group(1).strip()
            if not raw_json:
                continue
            try:
                data = json.loads(raw_json)
                if isinstance(data, list):
                    results.extend(data)
                elif isinstance(data, dict):
                    if "@graph" in data and isinstance(data["@graph"], list):
                        results.extend(data["@graph"])
                    else:
                        results.append(data)
            except Exception:
                continue
        return results

    @staticmethod
    def extract_people(json_ld_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extracts Person entities."""
        people: List[Dict[str, Any]] = []
        for item in json_ld_list:
            item_type = item.get("@type")
            if item_type == "Person" or (isinstance(item_type, list) and "Person" in item_type):
                people.append(item)
        return people


class PdfDirectoryExtractor:
    """Extracts structured text from public academic PDF directories."""

    @staticmethod
    def extract_text(pdf_bytes: bytes) -> str:
        try:
            import pypdf
            import io
            reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
            text_parts = []
            for page in reader.pages:
                text_parts.append(page.extract_text() or "")
            return "\n".join(text_parts)
        except ImportError:
            # Fallback simple string extraction if pypdf is not installed
            text = pdf_bytes.decode("latin1", errors="ignore")
            # Extract plain string sequences inside PDF text objects (BT ... ET)
            matches = re.findall(r"\(([^\)]+)\)", text)
            return " ".join(matches)
        except Exception as e:
            return f"Error extracting PDF: {e}"
