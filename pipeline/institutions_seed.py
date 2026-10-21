"""Comprehensive Nationwide Vietnamese Educational Institutions Registry.
Covers all ~244 Higher Education Institutions and 400+ Colleges across all 63 provinces of Vietnam.
"""

import os
import json
from typing import List, Dict, Any

_SEED_PATH = os.path.join(os.path.dirname(__file__), "institutions_seed.json")

with open(_SEED_PATH, "r", encoding="utf-8") as _f:
    VIETNAMESE_INSTITUTIONS_SEED: List[Dict[str, Any]] = json.load(_f)
