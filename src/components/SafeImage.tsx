"use client";

import { useEffect, useState } from "react";

/**
 * A remote image that cannot render blank.
 *
 * Two things were leaving empty tiles in the Pinterest feed and the shop.
 *
 * The first is fixable: plenty of retailer CDNs reject a request that arrives
 * carrying our Referer, so the image 403s and the browser draws nothing.
 * Sending no referrer at all gets most of those back.
 *
 * The second is not: a listing's image URL goes stale, or the host is simply
 * down. So anything that still fails falls back to a labelled placeholder that
 * occupies exactly the same space — a blank box in a masonry column shifts
 * every pin below it, and reads as the page being broken.
 */
export function SafeImage({
  src,
  alt,
  className = "",
  style,
  label,
  loading = "lazy"
}: {
  src?: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  /** Shown when the image can't load. Defaults to the alt text. */
  label?: string;
  loading?: "lazy" | "eager";
}) {
  const [failed, setFailed] = useState(false);

  // A different image deserves a fresh attempt; without this a recycled
  // component stays stuck on the placeholder forever.
  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-surface ${className}`}
        style={style}
        role="img"
        aria-label={alt}
      >
        <span className="eyebrow px-2 text-center text-[9px] leading-tight opacity-70">
          {label || alt || "Image unavailable"}
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      loading={loading}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
