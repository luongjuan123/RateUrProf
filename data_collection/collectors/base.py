"""Abstract Base Collector for Vietnamese Academic Portals."""

from __future__ import annotations
from abc import ABC, abstractmethod
from typing import List, Dict, Any


class BaseCollector(ABC):
    """Abstract collector for higher-education data sources."""

    @abstractmethod
    def can_handle(self, url: str, university: Optional[Dict[str, Any]] = None) -> bool:
        """Determines if this collector handles the target URL."""
        pass

    @abstractmethod
    def collect(
        self, html: str, url: str, university: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Extracts structured professor/lecturer dictionaries from HTML."""
        pass
