"""Configuration and environment settings for the RateUrProfs Nationwide Data Collection Pipeline."""

from __future__ import annotations
import os
from dataclasses import dataclass, field
from typing import List


@dataclass
class CollectionConfig:
    # Filesystem Paths
    PROJECT_ROOT: str = field(
        default_factory=lambda: os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    )
    DATA_DIR: str = field(
        default_factory=lambda: os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src", "data"
        )
    )
    SQLITE_DB_PATH: str = field(
        default_factory=lambda: os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "src",
            "data",
            "rateprof.db",
        )
    )
    JSON_OUTPUT_PATH: str = field(
        default_factory=lambda: os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "src",
            "data",
            "verified_academic_data.json",
        )
    )
    LOGS_DIR: str = field(
        default_factory=lambda: os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "logs"
        )
    )
    CHECKPOINT_FILE: str = field(
        default_factory=lambda: os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "data_collection",
            "checkpoint.json",
        )
    )

    # HTTP & Politeness
    USER_AGENT: str = (
        "RateUrProfs-Academic-Bot/2.0 (+https://rateurprofs.site/bot; contact@rateurprofs.site)"
    )
    REQUEST_TIMEOUT: int = 15  # seconds
    DEFAULT_DOMAIN_DELAY: float = 1.0  # seconds between hits to same domain
    MAX_RETRIES: int = 3
    BACKOFF_BASE: float = 2.0
    JITTER_RANGE: float = 0.5  # seconds of random jitter

    # Concurrency & Workload (Tuned for i5-13400F & 32GB RAM)
    MAX_GLOBAL_WORKERS: int = 12  # worker threads across distinct domains
    MAX_PER_DOMAIN_CONCURRENCY: int = 2  # conservative per-host limit
    SWEEP_BATCH_SIZE: int = 25  # tasks fetched from queue per sweep
    IDLE_POLL_INTERVAL: int = 5  # seconds when queue is idle

    # Persistence & Checkpointing
    CHECKPOINT_EVERY_N_RECORDS: int = 50
    JSON_EXPORT_EVERY_N_RECORDS: int = 200

    # National Benchmark
    NATIONAL_HEMIS_BENCHMARK: int = 90700  # Ministry of Education and Training official permanent lecturers
    NATIONAL_TOTAL_BENCHMARK: int = 95300  # Total higher education system estimate (HEMIS + colleges)

    # Discovery
    MAX_DISCOVERY_DEPTH: int = 2
    DISCOVERY_PATH_KEYWORDS: List[str] = field(
        default_factory=lambda: [
            "can-bo", "giang-vien", "faculty", "staff", "doi-ngu",
            "nhan-su", "bo-mon", "khoa", "people", "academic", "members",
            "teachers", "danh-ba", "nhan-luc", "gioi-thieu", "thanh-vien",
            "chuyen-gia", "giao-vien"
        ]
    )

    def ensure_directories(self):
        """Ensures all necessary data and log directories exist."""
        os.makedirs(self.DATA_DIR, exist_ok=True)
        os.makedirs(self.LOGS_DIR, exist_ok=True)


CONFIG = CollectionConfig()
