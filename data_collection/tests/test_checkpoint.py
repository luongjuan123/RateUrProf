"""Unit tests for checkpoint manager and resumability."""

import unittest
import tempfile
import os
from data_collection.checkpoint import CheckpointManager


class TestCheckpoint(unittest.TestCase):

    def setUp(self):
        self.tmp_dir = tempfile.mkdtemp()
        self.cp_path = os.path.join(self.tmp_dir, "checkpoint.json")
        self.cp = CheckpointManager(self.cp_path)

    def tearDown(self):
        try:
            if os.path.exists(self.cp_path):
                os.remove(self.cp_path)
            os.rmdir(self.tmp_dir)
        except Exception:
            pass

    def test_mark_and_resume(self):
        url = "https://soict.hust.edu.vn/can-bo"
        self.assertFalse(self.cp.is_url_completed(url))

        self.cp.mark_url_completed(url)
        self.assertTrue(self.cp.is_url_completed(url))

        # Save to disk
        self.cp.save_checkpoint(status="running")
        self.assertTrue(os.path.exists(self.cp_path))

        # Reload from disk in a fresh instance
        cp2 = CheckpointManager(self.cp_path)
        self.assertTrue(cp2.is_url_completed(url))
        self.assertEqual(cp2.get_summary()["total_pages_crawled"], 1)


if __name__ == "__main__":
    unittest.main()
