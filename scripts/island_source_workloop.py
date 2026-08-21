#!/usr/bin/env python3
"""Fail-closed source intake and acceptance ledger for Island Run references."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
RAW_SOURCE_RE = re.compile(r"^(?P<island>\d{3})(?P<ext>\.(?:png|jpe?g|webp))$", re.IGNORECASE)
CANONICAL_SOURCE_RE = re.compile(r"^(?P<island>\d{3})-source(?P<ext>\.(?:png|jpe?g|webp))$", re.IGNORECASE)
DONE_RE = re.compile(r"^(?P<island>\d{3})-done-v(?P<version>\d{3})(?P<ext>\.(?:png|jpe?g|webp))$", re.IGNORECASE)
REQUIRED_FIDELITY_DIMENSIONS = (
    "composition",
    "landmarkIdentity",
    "paletteMaterials",
    "terrainBackground",
    "phoneReadability",
)
MINIMUM_OVERALL_FIDELITY = 0.80
MINIMUM_DIMENSION_FIDELITY = 0.75
STAGES = (
    "reference-lock",
    "blockout",
    "terrain-background",
    "landmarks",
    "materials-life",
    "integration",
    "final-review",
)


class WorkloopError(RuntimeError):
    pass


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def normalize_island_number(value: int | str) -> int:
    try:
        island = int(value)
    except (TypeError, ValueError) as error:
        raise WorkloopError(f"Invalid island number: {value!r}") from error
    if island < 1 or island > 120:
        raise WorkloopError(f"Island number must be 001–120, received {island}")
    return island


def island_slug(value: int | str) -> str:
    return f"{normalize_island_number(value):03d}"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise WorkloopError(f"Could not read JSON {path}: {error}") from error
    if not isinstance(value, dict):
        raise WorkloopError(f"Expected an object in {path}")
    return value


def atomic_write_json(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(value, indent=2, ensure_ascii=False) + "\n"
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as handle:
        handle.write(payload)
        temporary_path = Path(handle.name)
    os.replace(temporary_path, path)


def workflow_root(inbox: Path) -> Path:
    return inbox / "_workflow"


def state_path(inbox: Path, island: int | str) -> Path:
    return workflow_root(inbox) / island_slug(island) / "status.json"


def find_source(inbox: Path, island: int | str) -> Path:
    slug = island_slug(island)
    matches = sorted(
        path for path in inbox.iterdir()
        if path.is_file() and CANONICAL_SOURCE_RE.fullmatch(path.name) and path.name.startswith(slug)
    )
    if len(matches) != 1:
        raise WorkloopError(f"Expected exactly one {slug}-source image, found {len(matches)}")
    return matches[0]


def new_source_state(island: int, source: Path, at: str | None = None) -> dict[str, Any]:
    timestamp = at or utc_now()
    return {
        "schemaVersion": 1,
        "islandNumber": island,
        "status": "source-ready",
        "source": {
            "file": source.name,
            "sha256": sha256_file(source),
            "immutable": True,
        },
        "latestCheckpoint": None,
        "done": [],
        "history": [
            {
                "event": "source-intake",
                "at": timestamp,
                "file": source.name,
            }
        ],
        "updatedAt": timestamp,
    }


def load_verified_state(inbox: Path, island: int | str) -> tuple[dict[str, Any], Path]:
    island_number = normalize_island_number(island)
    source = find_source(inbox, island_number)
    path = state_path(inbox, island_number)
    state = read_json(path) if path.exists() else new_source_state(island_number, source)
    recorded_source = state.get("source")
    if not isinstance(recorded_source, dict):
        raise WorkloopError(f"Missing source record in {path}")
    recorded_name = recorded_source.get("file")
    recorded_hash = recorded_source.get("sha256")
    current_hash = sha256_file(source)
    if recorded_name != source.name or recorded_hash != current_hash:
        raise WorkloopError(
            f"Source integrity failure for Island {island_number:03d}: "
            f"recorded {recorded_name}/{recorded_hash}, current {source.name}/{current_hash}"
        )
    return state, source


def intake(inbox: Path, apply: bool = False) -> list[dict[str, Any]]:
    if not inbox.is_dir():
        raise WorkloopError(f"Inbox does not exist: {inbox}")
    candidates: list[tuple[int, Path, Path]] = []
    for path in sorted(inbox.iterdir()):
        if not path.is_file():
            continue
        match = RAW_SOURCE_RE.fullmatch(path.name)
        if not match:
            continue
        island = normalize_island_number(match.group("island"))
        target = inbox / f"{island:03d}-source{match.group('ext').lower()}"
        candidates.append((island, path, target))

    blockers: list[str] = []
    for island, source, target in candidates:
        if target.exists():
            blockers.append(f"{source.name} -> {target.name} (target exists)")
        workflow_state = state_path(inbox, island)
        if workflow_state.exists():
            blockers.append(f"{source.name} -> {workflow_state.relative_to(inbox)} (state exists)")
    if blockers:
        details = ", ".join(blockers)
        raise WorkloopError(f"Intake stopped before changing files: {details}")

    actions: list[dict[str, Any]] = []
    for island, source, target in candidates:
        action = {
            "islandNumber": island,
            "from": source.name,
            "to": target.name,
            "applied": apply,
        }
        actions.append(action)
        if not apply:
            continue
        source.rename(target)
        path = state_path(inbox, island)
        atomic_write_json(path, new_source_state(island, target))
    return actions


def validate_review(review: dict[str, Any], require_completion: bool = False) -> dict[str, Any]:
    decision = review.get("decision")
    allowed_decisions = {"pass", "revise", "user-accepted-drift"}
    if decision not in allowed_decisions:
        raise WorkloopError(f"Review decision must be one of {sorted(allowed_decisions)}")
    dimensions = review.get("dimensions")
    if not isinstance(dimensions, dict):
        raise WorkloopError("Review must contain a dimensions object")
    normalized_dimensions: dict[str, float] = {}
    for key in REQUIRED_FIDELITY_DIMENSIONS:
        value = dimensions.get(key)
        if not isinstance(value, (int, float)) or isinstance(value, bool) or not 0 <= float(value) <= 1:
            raise WorkloopError(f"Review dimension {key} must be a number from 0 to 1")
        normalized_dimensions[key] = float(value)
    overall = review.get("overall")
    if not isinstance(overall, (int, float)) or isinstance(overall, bool) or not 0 <= float(overall) <= 1:
        raise WorkloopError("Review overall must be a number from 0 to 1")
    critical_mismatches = review.get("criticalMismatches", [])
    if not isinstance(critical_mismatches, list) or not all(isinstance(item, str) for item in critical_mismatches):
        raise WorkloopError("criticalMismatches must be an array of strings")

    if decision == "pass":
        if float(overall) < MINIMUM_OVERALL_FIDELITY:
            raise WorkloopError(f"Pass requires overall fidelity >= {MINIMUM_OVERALL_FIDELITY:.2f}")
        failed = [key for key, value in normalized_dimensions.items() if value < MINIMUM_DIMENSION_FIDELITY]
        if failed:
            raise WorkloopError(
                f"Pass requires every fidelity dimension >= {MINIMUM_DIMENSION_FIDELITY:.2f}; failed {failed}"
            )
        if critical_mismatches:
            raise WorkloopError("Pass cannot contain critical mismatches")
    if decision == "user-accepted-drift" and not str(review.get("userApprovalNote", "")).strip():
        raise WorkloopError("user-accepted-drift requires a userApprovalNote")
    if require_completion and decision == "revise":
        raise WorkloopError("A revise review cannot mark an island done")
    return {
        **review,
        "overall": float(overall),
        "dimensions": normalized_dimensions,
        "criticalMismatches": critical_mismatches,
    }


def checkpoint(
    inbox: Path,
    island: int | str,
    stage: str,
    evidence: Path,
    review_path: Path,
    apply: bool = False,
) -> dict[str, Any]:
    if stage not in STAGES:
        raise WorkloopError(f"Unknown stage {stage!r}; expected one of {STAGES}")
    if not evidence.is_file():
        raise WorkloopError(f"Checkpoint evidence does not exist: {evidence}")
    review = validate_review(read_json(review_path))
    state, _ = load_verified_state(inbox, island)
    slug = island_slug(island)
    evidence_dir = workflow_root(inbox) / slug / "evidence"
    existing = sorted(evidence_dir.glob(f"{stage}-v*{evidence.suffix.lower()}")) if evidence_dir.exists() else []
    version = len(existing) + 1
    target = evidence_dir / f"{stage}-v{version:03d}{evidence.suffix.lower()}"
    record = {
        "stage": stage,
        "version": version,
        "evidence": str(target.relative_to(inbox)),
        "evidenceSha256": sha256_file(evidence),
        "review": review,
        "at": utc_now(),
    }
    if apply:
        evidence_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(evidence, target)
        state["status"] = "review" if review["decision"] != "pass" else "in-progress"
        state["latestCheckpoint"] = record
        state.setdefault("history", []).append({"event": "checkpoint", **record})
        state["updatedAt"] = record["at"]
        atomic_write_json(state_path(inbox, island), state)
    return {**record, "applied": apply}


def mark_done(
    inbox: Path,
    island: int | str,
    evidence: Path,
    review_path: Path,
    summary: str,
    apply: bool = False,
) -> dict[str, Any]:
    if not evidence.is_file():
        raise WorkloopError(f"Done evidence does not exist: {evidence}")
    review = validate_review(read_json(review_path), require_completion=True)
    state, source = load_verified_state(inbox, island)
    slug = island_slug(island)
    existing_versions = [
        int(match.group("version"))
        for path in inbox.iterdir()
        if path.is_file() and (match := DONE_RE.fullmatch(path.name)) and match.group("island") == slug
    ]
    version = max(existing_versions, default=0) + 1
    target = inbox / f"{slug}-done-v{version:03d}{evidence.suffix.lower()}"
    if target.exists():
        raise WorkloopError(f"Refusing to overwrite existing done evidence: {target}")
    timestamp = utc_now()
    record = {
        "version": version,
        "file": target.name,
        "sha256": sha256_file(evidence),
        "sourceFile": source.name,
        "sourceSha256": sha256_file(source),
        "summary": summary.strip(),
        "review": review,
        "at": timestamp,
    }
    if apply:
        shutil.copy2(evidence, target)
        state["status"] = "done"
        state.setdefault("done", []).append(record)
        state["latestCheckpoint"] = {
            "stage": "final-review",
            "evidence": target.name,
            "review": review,
            "at": timestamp,
        }
        state.setdefault("history", []).append({"event": "done", **record})
        state["updatedAt"] = timestamp
        atomic_write_json(state_path(inbox, island), state)
    return {**record, "applied": apply}


def collect_status(inbox: Path) -> dict[str, Any]:
    if not inbox.is_dir():
        raise WorkloopError(f"Inbox does not exist: {inbox}")
    sources: dict[int, Path] = {}
    done: dict[int, list[Path]] = {}
    raw: list[str] = []
    unassigned: list[str] = []
    for path in sorted(inbox.iterdir()):
        if path.name in {".DS_Store", "README.md"} or path.name == "_workflow":
            continue
        if not path.is_file():
            continue
        if match := CANONICAL_SOURCE_RE.fullmatch(path.name):
            sources[int(match.group("island"))] = path
        elif match := DONE_RE.fullmatch(path.name):
            done.setdefault(int(match.group("island")), []).append(path)
        elif RAW_SOURCE_RE.fullmatch(path.name):
            raw.append(path.name)
        elif path.suffix.lower() in IMAGE_EXTENSIONS:
            unassigned.append(path.name)

    islands = []
    for island in sorted(set(sources) | set(done)):
        source = sources.get(island)
        path = state_path(inbox, island)
        state = read_json(path) if path.exists() else None
        integrity = "untracked"
        if source and state and isinstance(state.get("source"), dict):
            integrity = "ok" if state["source"].get("sha256") == sha256_file(source) else "source-hash-drift"
        islands.append({
            "islandNumber": island,
            "status": state.get("status", "untracked") if state else "untracked",
            "source": source.name if source else None,
            "done": [path.name for path in sorted(done.get(island, []))],
            "integrity": integrity,
        })
    return {
        "inbox": str(inbox),
        "islands": islands,
        "rawIntake": raw,
        "unassignedImages": unassigned,
    }


def print_human_status(report: dict[str, Any]) -> None:
    print(f"Island source inbox: {report['inbox']}")
    for island in report["islands"]:
        done = ", ".join(island["done"]) or "—"
        print(
            f"{island['islandNumber']:03d}  {island['status']:<12} "
            f"source={island['source'] or '—'} done={done} integrity={island['integrity']}"
        )
    if report["rawIntake"]:
        print("Raw intake awaiting rename: " + ", ".join(report["rawIntake"]))
    if report["unassignedImages"]:
        print("Unassigned/ambiguous (left untouched): " + ", ".join(report["unassignedImages"]))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    intake_parser = subparsers.add_parser("intake", help="Rename exact NNN images to immutable NNN-source images")
    intake_parser.add_argument("--inbox", type=Path, required=True)
    intake_parser.add_argument("--apply", action="store_true")

    status_parser = subparsers.add_parser("status", help="Show source, workflow and done state")
    status_parser.add_argument("--inbox", type=Path, required=True)
    status_parser.add_argument("--json", action="store_true")

    checkpoint_parser = subparsers.add_parser("checkpoint", help="Record a source/current comparison checkpoint")
    checkpoint_parser.add_argument("--inbox", type=Path, required=True)
    checkpoint_parser.add_argument("--island", required=True)
    checkpoint_parser.add_argument("--stage", choices=STAGES, required=True)
    checkpoint_parser.add_argument("--evidence", type=Path, required=True)
    checkpoint_parser.add_argument("--review-json", type=Path, required=True)
    checkpoint_parser.add_argument("--apply", action="store_true")

    done_parser = subparsers.add_parser("mark-done", help="Copy immutable versioned done evidence and update status")
    done_parser.add_argument("--inbox", type=Path, required=True)
    done_parser.add_argument("--island", required=True)
    done_parser.add_argument("--evidence", type=Path, required=True)
    done_parser.add_argument("--review-json", type=Path, required=True)
    done_parser.add_argument("--summary", required=True)
    done_parser.add_argument("--apply", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        if args.command == "intake":
            result = intake(args.inbox, args.apply)
            print(json.dumps(result, indent=2))
        elif args.command == "status":
            result = collect_status(args.inbox)
            if args.json:
                print(json.dumps(result, indent=2))
            else:
                print_human_status(result)
        elif args.command == "checkpoint":
            result = checkpoint(args.inbox, args.island, args.stage, args.evidence, args.review_json, args.apply)
            print(json.dumps(result, indent=2))
        elif args.command == "mark-done":
            result = mark_done(
                args.inbox,
                args.island,
                args.evidence,
                args.review_json,
                args.summary,
                args.apply,
            )
            print(json.dumps(result, indent=2))
        return 0
    except WorkloopError as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
