"""Vercel Python Function: live, public-page catalog lookup for the demo."""

from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

from scripts.live_catalog import SEEDS, fetch, fit_status


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

        for seed in SEEDS:
            try:
                item = fetch(seed)
            except Exception as error:
                # A retailer being unavailable should never make the demo fail.
                results.append({"source": seed.source, "url": seed.url, "error": "source unavailable"})
                continue
            searchable = " ".join(str(item.get(field, "")) for field in ("source", "category", "title")).lower()
            if terms and not all(term in searchable for term in terms):
                continue
            if item["price"] is None or item["price"] > budget:
                continue
            item["fit_status"], item["rationale"] = fit_status(item, wall_span, max_depth)
            results.append(item)

        body = json.dumps({
            "constraints_inches": {"free_wall_span": wall_span, "max_depth": max_depth},
            "results": results,
            "notice": "Live public-page demo data. Product facts are point-in-time observations; verify dimensions before purchase.",
        }).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "s-maxage=900, stale-while-revalidate=900")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
