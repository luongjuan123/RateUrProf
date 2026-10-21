"""Durable, Atomic Checkpointing for RateUrProfs Long-Running Collection Pipeline."""

from __future__ import annotations
import os
import json
import time
import tempfile
import threading
from typing import Dict, Any, Optional, Set
from data_collection.config import CONFIG


class CheckpointManager:
    """Thread-safe persistent checkpointing engine that enables safe interruption and immediate resumption."""

    def __init__(self, checkpoint_path: Optional[str] = None):
        self.checkpoint_path = checkpoint_path or CONFIG.CHECKPOINT_FILE
        self._lock = threading.Lock()
        self._state: Dict[str, Any] = {
            "version": "2.0",
            "created_at": int(time.time() * 1000),
            "last_updated_at": int(time.time() * 1000),
            "status": "initialized",
            "current_stage": "Stage_A_Discovery",
            "current_institution_id": None,
            "total_pages_crawled": 0,
            "total_lecturers_saved": 0,
            "total_errors": 0,
            "completed_urls": [],
            "blocked_domains": [],
            "meta": {},
        }
        self._completed_urls_set: Set[str] = set()
        self._load_if_exists()

    def _load_if_exists(self):
        """Loads state from disk if checkpoint file exists."""
        if os.path.exists(self.checkpoint_path):
            try:
                with open(self.checkpoint_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self._state.update(data)
                    self._completed_urls_set = set(self._state.get("completed_urls", []))
            except Exception as e:
                # If checkpoint is corrupted, preserve backup
                backup_path = f"{self.checkpoint_path}.corrupt.{int(time.time())}"
                try:
                    os.rename(self.checkpoint_path, backup_path)
                except Exception:
                    pass

    def is_url_completed(self, url: str) -> bool:
        """Checks if a URL has already been crawled and processed successfully."""
        clean = url.strip().rstrip("/")
        with self._lock:
            return clean in self._completed_urls_set

    def mark_url_completed(self, url: str):
        """Marks a URL as completed in the checkpoint."""
        clean = url.strip().rstrip("/")
        with self._lock:
            if clean not in self._completed_urls_set:
                self._completed_urls_set.add(clean)
                self._state["completed_urls"].append(clean)
                self._state["total_pages_crawled"] = len(self._completed_urls_set)
                self._state["last_updated_at"] = int(time.time() * 1000)

    def mark_domain_blocked(self, domain: str, reason: str):
        """Records a domain that has blocked crawling (e.g. strict robots or 403)."""
        with self._lock:
            blocked = self._state.setdefault("blocked_domains", [])
            for b in blocked:
                if b.get("domain") == domain:
                    return
            blocked.append({
                "domain": domain,
                "reason": reason,
                "recorded_at": int(time.time() * 1000),
            })

    def is_domain_blocked(self, domain: str) -> bool:
        """Checks if domain has been marked permanently blocked."""
        with self._lock:
            blocked = self._state.get("blocked_domains", [])
            return any(b.get("domain") == domain for b in blocked)

    def update_progress(
        self,
        stage: Optional[str] = None,
        institution_id: Optional[str] = None,
        new_lecturers: int = 0,
        errors: int = 0,
    ):
        """Updates runtime progress metrics."""
        with self._lock:
            if stage:
                self._state["current_stage"] = stage
            if institution_id:
                self._state["current_institution_id"] = institution_id
            if new_lecturers > 0:
                self._state["total_lecturers_saved"] += new_lecturers
            if errors > 0:
                self._state["total_errors"] += errors
            self._state["last_updated_at"] = int(time.time() * 1000)

    def save_checkpoint(self, status: str = "running"):
        """Atomically saves checkpoint to disk."""
        with self._lock:
            self._state["status"] = status
            self._state["last_updated_at"] = int(time.time() * 1000)
            target_dir = os.path.dirname(self.checkpoint_path)
            os.makedirs(target_dir, exist_ok=True)

            # Atomic write via tempfile and replace
            with tempfile.NamedTemporaryFile("w", dir=target_dir, delete=False, encoding="utf-8") as tf:
                json.dump(self._state, tf, ensure_ascii=False, indent=2)
                temp_name = tf.name

            os.replace(temp_name, self.checkpoint_path)

    def get_summary(self) -> Dict[str, Any]:
        """Returns snapshot of current checkpoint progress."""
        with self._lock:
            return {
                "status": self._state.get("status"),
                "current_stage": self._state.get("current_stage"),
                "current_institution_id": self._state.get("current_institution_id"),
                "total_pages_crawled": len(self._completed_urls_set),
                "total_lecturers_saved": self._state.get("total_lecturers_saved", 0),
                "total_errors": self._state.get("total_errors", 0),
                "blocked_domains_count": len(self._state.get("blocked_domains", [])),
                "last_updated_at": self._state.get("last_updated_at"),
            }
