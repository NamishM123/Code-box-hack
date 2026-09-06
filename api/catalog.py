"""Vercel Python Function: live, public-page catalog lookup for the demo."""

from __future__ import annotations

import json
import os
import sys
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

# The repo root is not on sys.path inside a Vercel Python function, so the
# sibling `scripts` package has to be pointed at explicitly. vercel.json ships
# it via includeFiles.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from scripts.live_catalog import SEEDS, fetch, fit_status
    IMPORT_ERROR = None
except Exception as exc:  # pragma: no cover - only hit when bundling is wrong
    # A raised ImportError at module scope is a 502 from the browser's side,
    # and the canvas then has no idea why its catalog feed vanished. Degrade to
    # an empty, valid response instead: the canvas already treats an empty
    # catalog as "no confirmed listings" and fills the room from /api/search.
    SEEDS, fetch, fit_status = [], None, None
    IMPORT_ERROR = f"{type(exc).__name__}: {exc}"


def number(values: dict[str, list[str]], key: str, default: float, minimum: float, maximum: float) -> float:
    try:
        value = float(values.get(key, [str(default)])[0])
    except ValueError:
        return default
    return min(max(value, minimum), maximum)


class handler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        query = parse_qs(urlparse(self.path).query)
        budget = number(query, "budget", 250, 1, 10_000)
        wall_span = number(query, "free_wall_span", 36, 1, 500)
        max_depth = number(query, "max_depth", 18, 1, 300)
        terms = query.get("query", [""])[0].lower().split()
        results = []
        for seed in SEEDS if fetch else []:
            try:
                item = fetch(seed)
            except Exception:
                results.append({"source": seed.source, "url": seed.url, "error": "source unavailable"})
                continue
            searchable = " ".join(str(item.get(field, "")) for field in ("source", "category", "title")).lower()
            if terms and not all(term in searchable for term in terms):
                continue
            if item["price"] is None or item["price"] > budget:
                continue
            item["fit_status"], item["rationale"] = fit_status(item, wall_span, max_depth)
            results.append(item)

        payload = {
            "constraints_inches": {"free_wall_span": wall_span, "max_depth": max_depth},
            "results": results,
            "notice": "Live public-page demo data. Product facts are point-in-time observations; verify dimensions before purchase.",
        }
        if IMPORT_ERROR:
            payload["error"] = IMPORT_ERROR
        body = json.dumps(payload).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "s-maxage=900, stale-while-revalidate=900")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
