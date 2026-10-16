"""Base Adapter interface for Vietnamese University Web Portals."""

from __future__ import annotations
from abc import ABC, abstractmethod
from typing import List, Optional
from pipeline.models import (
    UniversityRecord,
    FacultyRecord,
    DepartmentRecord,
    ProfessorRecord,
    CourseRecord,
)


class BaseAcademicAdapter(ABC):
    """Abstract base adapter for university web ingestion."""

    @abstractmethod
    def can_handle(self, url: str) -> bool:
        """Returns True if this adapter supports the given URL or domain."""
        pass

    @abstractmethod
    def extract_professors(
        self, html: str, url: str, university: UniversityRecord
    ) -> List[ProfessorRecord]:
        """Extracts structured professor/lecturer records from the page HTML."""
        pass

    def extract_faculties(
        self, html: str, url: str, university: UniversityRecord
    ) -> List[FacultyRecord]:
        """Optionally extracts faculties and departments."""
        return []

    def extract_courses(
        self, html: str, url: str, university: UniversityRecord
    ) -> List[CourseRecord]:
        """Optionally extracts public course listings."""
        return []
