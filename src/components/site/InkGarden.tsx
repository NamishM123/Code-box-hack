"use client";

import { useEffect, useRef } from "react";

import { AsciiRenderer } from "@/lib/ascii/render";
import { descreen, loadImageSource, paintInkGarden } from "@/lib/ascii/source";
import { INK_GARDEN, withParams, type AsciiParams } from "@/lib/ascii/types";

/** Where the painted garden lives before it's sampled. 3:2 covers most screens. */
const SOURCE_W = 1800;
const SOURCE_H = 1200;

export interface InkGardenProps {
  /** Defaults to the Ink Garden preset. */
  params?: Partial<AsciiParams>;
  /** A photo to sample instead of the painted garden. Missing files fall back to it. */
  sourceUrl?: string;
  /** Blur radius applied to `sourceUrl` before sampling. See descreen(); 0 for a photo. */
  sourceBlur?: number;
  /** 0-1, applied to the canvas element rather than the effect. */
  opacity?: number;
  /** Frames per second. Kept below 60 on purpose — this runs behind everything. */
  fps?: number;
  /** Device pixel ratio ceiling. A dither doesn't gain much from 3x. */
  maxDpr?: number;
  className?: string;
}

/**
 * The Ink Garden effect, filling whatever box it's placed in.
 *
 * It samples a picture into cells and stamps one mark per cell — see
 * src/lib/ascii/render.ts for the pipeline. The picture is painted, not
 * photographed, because the preset's reference image isn't in this repo; pass
 * `sourceUrl` to sample a real one instead.
 */
export function InkGarden({
  params,
  sourceUrl,
  sourceBlur = 0,
  opacity = 1,
  fps = 30,
  maxDpr = 1.5,
  className = ""
}: InkGardenProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Held in a ref so a new object literal from the caller doesn't restart the loop.
  const paramsRef = useRef<AsciiParams>(withParams(INK_GARDEN, params ?? {}));
  paramsRef.current = withParams(INK_GARDEN, params ?? {});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: AsciiRenderer;
    try {
      renderer = new AsciiRenderer(canvas, paramsRef.current);
    } catch {
      // No 2D context (very old browser, or a canvas-blocking extension). The
      // page is perfectly usable without a backdrop, so leave it blank.
      return;
    }

    const garden = document.createElement("canvas");
    garden.width = SOURCE_W;
    garden.height = SOURCE_H;
    paintInkGarden(garden);
    renderer.setSource(garden);

    let alive = true;

    if (sourceUrl) {
      // A 404 resolves null and simply leaves the painted garden in place, so
      // dropping the real photo in is the whole of the change.
      loadImageSource(sourceUrl).then((img) => {
        if (!alive || !img) return;
        renderer.setSource(sourceBlur > 0 ? descreen(img, sourceBlur) : img);
      });
    }

    const p = paramsRef.current;
    if (p.mask.enabled && p.mask.dataUrl) {
      loadImageSource(p.mask.dataUrl).then((img) => {
        if (alive) renderer.setMask(img);
      });
    }

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(maxDpr, window.devicePixelRatio || 1);
      renderer.resize(rect.width || window.innerWidth, rect.height || window.innerHeight, dpr);
    };

    let raf = 0;
    let last = 0;
    const started = performance.now();
    const interval = 1000 / Math.max(1, fps);

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < interval) return;
      last = now;
      if (document.hidden) return;
      renderer.setParams(paramsRef.current);
      renderer.render((now - started) / 1000);
    };

    const still = () => {
      renderer.setParams(paramsRef.current);
      renderer.render(0);
    };

    const onResize = () => {
      fit();
      if (reduced) still();
    };

    fit();
    if (reduced || !paramsRef.current.animated) {
      still();
    } else {
      raf = requestAnimationFrame(loop);
    }

    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
    // The loop reads params through a ref, so it only needs rebuilding when the
    // source or the rendering budget changes.
  }, [sourceUrl, sourceBlur, fps, maxDpr]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`h-full w-full ${className}`}
      style={{ opacity }}
    />
  );
}

/**
 * The site's backdrop: the same effect, fixed behind every page.
 *
 * Sits at z-0 with the page's own content lifted to z-10 in the root layout, so
 * it reads through the gaps between cards without ever catching a click.
 */
export function InkGardenBackdrop({ opacity = 0.38, params, sourceUrl, sourceBlur }: InkGardenProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <InkGarden opacity={opacity} params={params} sourceUrl={sourceUrl} sourceBlur={sourceBlur} />
    </div>
  );
}
