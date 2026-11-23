#!/usr/bin/env python3
"""Build ASTRA's static site and an auto-discovered glossary index.

Usage: python3 scripts/build_glossary.py
No third-party Python packages required.
"""
from __future__ import annotations
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "_site"
GLOSSARY = ROOT / "content" / "glossary"


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def main() -> None:
    if not (ROOT / "index.html").is_file():
        fail("index.html must be at repository root")
    if not GLOSSARY.is_dir():
        fail("Missing content/glossary directory")

    if SITE.exists():
        shutil.rmtree(SITE)
    SITE.mkdir()
    for item in ("index.html", ".nojekyll", "css", "js", "models", "assets"):
        src = ROOT / item
        if src.is_file():
            shutil.copy2(src, SITE / item)
        elif src.is_dir():
            shutil.copytree(src, SITE / item)
    (SITE / ".nojekyll").touch(exist_ok=True)

    entries = []
    observed = {}
    for path in sorted(GLOSSARY.glob("*.json")):
        if path.name == "manifest.json":
            continue  # Legacy file: no longer used
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (UnicodeError, json.JSONDecodeError) as exc:
            fail(f"Invalid JSON at {path.relative_to(ROOT)}: {exc}")
        if not isinstance(data, dict):
            fail(f"{path.name} must contain one JSON object")
        term = data.get("term")
        if not isinstance(term, str) or not term.strip():
            fail(f"{path.name} is missing a nonempty term")
        term = term.strip()
        key = term.casefold()
        if key in observed:
            fail(f"Duplicate term '{term}' in {path.name} and {observed[key]}")
        observed[key] = path.name
        data["term"] = term
        definition = data.get("definition", "")
        # Safely accommodate an earlier temporary array format, if any.
        if isinstance(definition, list) and all(isinstance(s, str) for s in definition):
            data["definition"] = "\n\n".join(definition)
        elif not isinstance(definition, str):
            fail(f"{path.name}: definition must be text")
        if not isinstance(data.get("related", []), list):
            fail(f"{path.name}: related must be an array")
        if "moreResources" in data and not isinstance(data["moreResources"], list):
            fail(f"{path.name}: moreResources must be an array")
        entries.append(data)

    entries.sort(key=lambda d: (str(d.get("unit", "")), str(d.get("category", "")).casefold(), d["term"].casefold()))
    output = SITE / "content" / "glossary-index.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(entries, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Successfully built {len(entries)} glossary entries → {output.relative_to(ROOT)}")
    print(f"Published site files → {SITE.relative_to(ROOT)}/")

if __name__ == "__main__":
    main()
