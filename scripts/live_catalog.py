#!/usr/bin/env python3
"""Fetch a small, public-product catalog for the Sightline demo.

This is deliberately a limited collector, not a general web crawler. It reads a
short, curated list of public retailer pages once per run, honors normal HTTPS
validation, makes no authenticated requests, and never attempts to evade bot
checks or access controls. Products without all three dimensions are returned
but marked ineligible for spatial placement.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import ssl
import sys
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from typing import Any, Iterable
from urllib.request import Request, urlopen

try:
    import certifi
except ImportError:  # pragma: no cover - only used on hosts without certifi
    certifi = None


USER_AGENT = "SightlineDemoCatalog/0.1 (+https://code-box-hack.vercel.app)"
TIMEOUT_SECONDS = 15


@dataclass(frozen=True)
class ProductSeed:
    source: str
    category: str
    url: str


# Keep this deliberately small for a hackathon demo. Add a source only after
# confirming that its public page can be read without authentication.
SEEDS = (
    ProductSeed("IKEA", "desk", "https://www.ikea.com/us/en/p/micke-desk-white-anthracite-10489839/"),
    ProductSeed("IKEA", "shelf", "https://www.ikea.com/us/en/p/jonaxel-shelf-unit-white-50419972/"),
    ProductSeed("IKEA", "shelf", "https://www.ikea.com/us/en/p/kallax-shelf-unit-white-20631639/"),
)


def page_text(markup: str) -> str:
    """Make page content searchable without executing page JavaScript."""
    without_scripts = re.sub(r"<script[\\s\\S]*?</script>|<style[\\s\\S]*?</style>", " ", markup, flags=re.I)
    return re.sub(r"\\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", without_scripts))).strip()


def meta(markup: str, key: str) -> str | None:
    pattern = rf'<meta[^>]+(?:property|name)=["\']{re.escape(key)}["\'][^>]+content=["\']([^"\']+)'
    match = re.search(pattern, markup, flags=re.I)
    return html.unescape(match.group(1)) if match else None


def json_ld_nodes(markup: str) -> Iterable[dict[str, Any]]:
    for script in re.findall(r'<script[^>]+type=["\']application/ld\\+json["\'][^>]*>([\\s\\S]*?)</script>', markup, flags=re.I):
        try:
            payload = json.loads(html.unescape(script.strip()))
        except json.JSONDecodeError:
            continue
        stack: list[Any] = [payload]
        while stack:
            value = stack.pop()
            if isinstance(value, dict):
                yield value
                stack.extend(value.values())
            elif isinstance(value, list):
                stack.extend(value)


def first_product_node(markup: str) -> dict[str, Any]:
    for node in json_ld_nodes(markup):
        kind = node.get("@type", "")
        types = kind if isinstance(kind, list) else [kind]
        if "Product" in types:
            return node
    return {}


def to_inches(value: str) -> float:
    """Convert values such as '31 1/2' or '15.375' to inches."""
    compact_fraction = re.fullmatch(r"(\d+)(\d)/(\d+)", value.strip())
    if compact_fraction:
        whole, numerator, denominator = compact_fraction.groups()
        return round(float(whole) + float(numerator) / float(denominator), 2)
    parts = value.strip().split()
    total = 0.0
    for part in parts:
        if "/" in part:
            numerator, denominator = part.split("/", 1)
            total += float(numerator) / float(denominator)
        else:
            total += float(part)
    return round(total, 2)


def dimension(text: str, label: str) -> float | None:
    # IKEA and most retailer product descriptions render this as e.g. Width 31 1/2 ".
    match = re.search(
        rf"{label}\s*(?:[:—-]\s*)?(\d+(?:\.\d+)?(?:\s+\d+/\d+)?)\s*(?:inches|in\.?|[\"″])",
        text,
        flags=re.I,
    )
    return to_inches(match.group(1)) if match else None


def numeric(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def ikea_price(markup: str) -> float | None:
    """Read IKEA's server-rendered price component without executing its JS."""
    match = re.search(
        r'currentPriceProps":\{"integerValue":"(\d+)"(?:[^}])*?decimalValue":"(\d+)"',
        markup,
    )
    return float(f"{match.group(1)}.{match.group(2)}") if match else None


def ikea_dimensions(title: str | None) -> dict[str, float | None]:
    """IKEA product titles expose measurements in Width × Depth × Height order."""
    if not title:
        return {"width": None, "depth": None, "height": None}
    match = re.search(
        r"(\d+(?:\.\d+)?(?:\s+\d+/\d+)?)\s*x\s*"
        r"(\d+(?:\.\d+)?(?:\s+\d+/\d+)?)\s*x\s*"
        r"(\d+(?:\.\d+)?(?:\s+\d+/\d+)?)\s*(?:[\"″]|in)",
        title,
        flags=re.I,
    )
    if not match:
        return {"width": None, "depth": None, "height": None}
    return {"width": to_inches(match.group(1)), "depth": to_inches(match.group(2)), "height": to_inches(match.group(3))}


def fetch(seed: ProductSeed) -> dict[str, Any]:
    context = ssl.create_default_context(cafile=certifi.where()) if certifi else ssl.create_default_context()
    request = Request(seed.url, headers={"User-Agent": USER_AGENT, "Accept-Language": "en-US,en;q=0.8"})
    with urlopen(request, context=context, timeout=TIMEOUT_SECONDS) as response:
        markup = response.read().decode("utf-8", "replace")

    product = first_product_node(markup)
    offers = product.get("offers", {})
    if isinstance(offers, list):
        offers = offers[0] if offers else {}
    rating = product.get("aggregateRating", {})
    text = page_text(markup)
    title = product.get("name") or meta(markup, "og:title")
    width, depth, height = (dimension(text, label) for label in ("Width", "Depth", "Height"))
    price = numeric(offers.get("price") or offers.get("lowPrice"))
    if seed.source == "IKEA":
        source_dimensions = ikea_dimensions(title)
        width = width or source_dimensions["width"]
        depth = depth or source_dimensions["depth"]
        height = height or source_dimensions["height"]
        price = price or ikea_price(markup)
    availability = str(offers.get("availability", "unknown")).rsplit("/", 1)[-1].replace("OutOfStock", "out-of-stock")

    return {
        "source": seed.source,
        "category": seed.category,
        "title": title,
        "url": seed.url,
        "image_url": product.get("image") or meta(markup, "og:image"),
        "price": price,
        "currency": offers.get("priceCurrency", "USD"),
        "availability": availability,
        "rating": numeric(rating.get("ratingValue")),
        "review_count": numeric(rating.get("reviewCount")),
        "dimensions_inches": {"width": width, "depth": depth, "height": height},
        "fetched_at": datetime.now(UTC).isoformat(),
    }


def fit_status(item: dict[str, Any], free_wall_span: float, max_depth: float) -> tuple[str, str]:
    dimensions = item["dimensions_inches"]
    width, depth, height = dimensions["width"], dimensions["depth"], dimensions["height"]
    if None in (width, depth, height):
        return "cannot-verify", "Missing one or more product dimensions; browsing is allowed but placement is disabled."
    if width > free_wall_span:
        return "does-not-fit", f"Needs {width:g} in of wall span; only {free_wall_span:g} in is available."
    if depth > max_depth:
        return "tight-fit", f"Fits the wall span but extends {depth:g} in into a {max_depth:g} in depth allowance."
    return "fits", f"Uses {width:g} in of wall span and {depth:g} in of the allowed depth. Verify doors, windows, and existing furniture."


def main() -> int:
    parser = argparse.ArgumentParser(description="Fetch and fit-check the curated Sightline demo catalog.")
    parser.add_argument("--query", default="", help="Optional words used to filter the curated catalog.")
    parser.add_argument("--budget", type=float, default=250, help="Maximum item price in USD.")
    parser.add_argument("--free-wall-span", type=float, default=36, help="Available wall span in inches.")
    parser.add_argument("--max-depth", type=float, default=18, help="Maximum allowed furniture depth in inches.")
    args = parser.parse_args()

    results: list[dict[str, Any]] = []
    for seed in SEEDS:
        try:
            item = fetch(seed)
        except Exception as error:  # A failing retailer must not break the demo.
            results.append({"source": seed.source, "url": seed.url, "error": str(error)})
            continue
        haystack = " ".join(str(item.get(key, "")) for key in ("source", "category", "title")).lower()
        if args.query and not all(term in haystack for term in args.query.lower().split()):
            continue
        if item["price"] is None or item["price"] > args.budget:
            continue
        item["fit_status"], item["rationale"] = fit_status(item, args.free_wall_span, args.max_depth)
        results.append(item)

    print(json.dumps({
        "query": args.query,
        "constraints_inches": {"free_wall_span": args.free_wall_span, "max_depth": args.max_depth},
        "results": results,
        "notice": "Public-page demo collector. Prices and availability are point-in-time observations; no retailer access controls are bypassed.",
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
