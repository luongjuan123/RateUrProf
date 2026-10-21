"""Source-specific and generic collectors for Vietnamese higher education institutions."""

from data_collection.collectors.base import BaseCollector
from data_collection.collectors.hdgsnn import HdgsnnCollector
from data_collection.collectors.ctu import CtuCollector
from data_collection.collectors.dut import DutCollector
from data_collection.collectors.hust import HustCollector
from data_collection.collectors.vnu import VnuCollector
from data_collection.collectors.vju import VjuCollector
from data_collection.collectors.vnuhcm import VnuHcmCollector
from data_collection.collectors.hau import HauCollector
from data_collection.collectors.mtcn import MtcnCollector
from data_collection.collectors.generic import GenericAcademicCollector

__all__ = [
    "BaseCollector",
    "HdgsnnCollector",
    "CtuCollector",
    "DutCollector",
    "HustCollector",
    "VnuCollector",
    "VjuCollector",
    "VnuHcmCollector",
    "HauCollector",
    "MtcnCollector",
    "GenericAcademicCollector",
]
