#!/usr/bin/env python3

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from island_source_workloop import WorkloopError, collect_status, intake, mark_done, sha256_file


PASS_REVIEW = {
    "overall": 0.86,
    "dimensions": {
        "composition": 0.84,
        "landmarkIdentity": 0.88,
        "paletteMaterials": 0.86,
        "terrainBackground": 0.83,
        "phoneReadability": 0.89,
    },
    "criticalMismatches": [],
    "decision": "pass",
}


class IslandSourceWorkloopTests(unittest.TestCase):
    def test_intake_dry_run_does_not_rename(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            inbox = Path(directory)
            (inbox / "013.png").write_bytes(b"source")
            actions = intake(inbox, apply=False)
            self.assertEqual(actions[0]["to"], "013-source.png")
            self.assertTrue((inbox / "013.png").exists())
            self.assertFalse((inbox / "013-source.png").exists())

    def test_intake_apply_renames_and_hashes_source(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            inbox = Path(directory)
            (inbox / "013.png").write_bytes(b"source")
            intake(inbox, apply=True)
            source = inbox / "013-source.png"
            state = json.loads((inbox / "_workflow/013/status.json").read_text(encoding="utf-8"))
            self.assertTrue(source.exists())
            self.assertEqual(state["source"]["sha256"], sha256_file(source))
            self.assertEqual(state["status"], "source-ready")

    def test_intake_collision_fails_before_mutation(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            inbox = Path(directory)
            (inbox / "013.png").write_bytes(b"new")
            (inbox / "013-source.png").write_bytes(b"existing")
            with self.assertRaises(WorkloopError):
                intake(inbox, apply=True)
            self.assertTrue((inbox / "013.png").exists())
            self.assertEqual((inbox / "013-source.png").read_bytes(), b"existing")

    def test_existing_workflow_state_fails_before_any_rename(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            inbox = Path(directory)
            (inbox / "013.png").write_bytes(b"source-13")
            (inbox / "014.png").write_bytes(b"source-14")
            state = inbox / "_workflow/014/status.json"
            state.parent.mkdir(parents=True)
            state.write_text("{}", encoding="utf-8")
            with self.assertRaises(WorkloopError):
                intake(inbox, apply=True)
            self.assertTrue((inbox / "013.png").exists())
            self.assertTrue((inbox / "014.png").exists())
            self.assertFalse((inbox / "013-source.png").exists())
            self.assertFalse((inbox / "014-source.png").exists())

    def test_mark_done_is_versioned_and_never_changes_source(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            inbox = Path(directory)
            source_bytes = b"immutable-source"
            (inbox / "012.png").write_bytes(source_bytes)
            intake(inbox, apply=True)
            evidence = inbox / "render.png"
            evidence.write_bytes(b"render-v1")
            review = inbox / "review.json"
            review.write_text(json.dumps(PASS_REVIEW), encoding="utf-8")
            first = mark_done(inbox, 12, evidence, review, "first pass", apply=True)
            evidence.write_bytes(b"render-v2")
            second = mark_done(inbox, 12, evidence, review, "second pass", apply=True)
            self.assertEqual(first["file"], "012-done-v001.png")
            self.assertEqual(second["file"], "012-done-v002.png")
            self.assertEqual((inbox / "012-source.png").read_bytes(), source_bytes)
            report = collect_status(inbox)
            self.assertEqual(report["islands"][0]["status"], "done")
            self.assertEqual(report["islands"][0]["integrity"], "ok")

    def test_user_accepted_drift_requires_an_explicit_note(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            inbox = Path(directory)
            (inbox / "012.png").write_bytes(b"source")
            intake(inbox, apply=True)
            evidence = inbox / "render.png"
            evidence.write_bytes(b"render")
            review = inbox / "review.json"
            drift_review = {
                **PASS_REVIEW,
                "overall": 0.55,
                "decision": "user-accepted-drift",
                "userApprovalNote": "",
            }
            review.write_text(json.dumps(drift_review), encoding="utf-8")
            with self.assertRaises(WorkloopError):
                mark_done(inbox, 12, evidence, review, "accepted exception", apply=True)


if __name__ == "__main__":
    unittest.main()
