/**
 * Parameters for the ASCII / dither renderer.
 *
 * This is a from-scratch reimplementation of the "Ink Garden" look — the
 * source photo is divided into cells, each cell is sampled for its average
 * colour, and a primitive is stamped per cell according to that cell's
 * luminance. Nothing here depends on the original editor; the shape of the
 * parameter object is the only thing borrowed, so a preset copied out of the
 * editor drops straight in.
 */

/** One primitive per cell. "characters" is the classic ASCII pass. */
export type RenderMode =
  | "characters"
  | "dither"
  | "mosaic"
  | "pixel"
  | "dots"
  | "cross"
  | "diamond"
  | "voxel"
  | "lego"
  | "mixed"
  | "lines"
  | "diagonal"
  | "braille"
  | "disco"
  | "hexdump"
  | "matrix"
  | "rings"
  | "hearts"
  | "stars"
  | "hexagons"
  | "triangles"
  | "bubbles"
  | "hatch"
  | "contour"
  | "halfblocks";

/** What shows behind the cell pass: nothing, a blurred copy, a flat fill, the photo. */
export type BgMode = "none" | "blur" | "color" | "photo";

export type AnimStyle = "wave" | "pulse" | "shimmer" | "ripple" | "flicker";

export type BlurType = "off" | "gaussian" | "directional" | "tilt" | "lens" | "progressive";

export type CharSetName = "standard" | "blocks" | "shades" | "minimal" | "dots" | "binary" | "hex" | "custom";

export type PfxKey =
  | "vignette"
  | "scanLines"
  | "chromatic"
  | "bloom"
  | "filmGrain"
  | "glitch"
  | "pixelate"
  | "halftone"
  | "filmDust";

/** Every toggleable stage shares this shape: on/off plus a 0-100 strength. */
export interface Toggle {
  enabled: boolean;
  intensity: number;
}

export interface CurvePoint {
  x: number;
  y: number;
}

/** Normalised (0-1) position, radius as a fraction of the diagonal, 0-100 strength. */
export interface LightPoint {
  x: number;
  y: number;
  radius: number;
  intensity: number;
}

export interface MaskParams {
  enabled: boolean;
  /** A greyscale PNG data URL. White reveals, black keeps the effect. */
  dataUrl: string | null;
  invert: boolean;
  /** Editor-only fields, carried so an exported preset round-trips unchanged. */
  tool?: string;
  brushSize?: number;
  showOverlay?: boolean;
  shapes?: unknown[];
}

export interface AsciiParams {
  renderMode: RenderMode;

  /* ------------------------------------------------------------- backdrop -- */
  bgMode: BgMode;
  /** Blur radius in px for bgMode "blur". */
  bgBlur: number;
  /** 0-100 opacity of whatever the backdrop draws. */
  bgOpacity: number;
  /** Fill used by bgMode "color". Not part of the editor export, so optional. */
  bgColor?: string;

  /* ----------------------------------------------------------------- grid -- */
  cellSize: number;
  /** Percentage of cells actually drawn, chosen by a stable per-cell hash. */
  coverage: number;
  invert: boolean;
  styleBlend: GlobalCompositeOperation;
  charSet: CharSetName;
  customChars: string;

  /* ------------------------------------------------------------------ tone -- */
  /** -100..100 */
  brightness: number;
  /** 0..200, where 100 is untouched. */
  contrast: number;
  /** 0..100 — how much a cell on an edge is pushed brighter. */
  edgeEmphasis: number;
  /** 0..100 — how large each cell's mark is drawn. */
  density: number;
  /** Monotonic luminance remap, in unit space. */
  toneCurve: CurvePoint[];

  /* ----------------------------------------------------------------- colour -- */
  tint: string;
  tintOpacity: number;
  overlayBlend: GlobalCompositeOperation;
  /** 0..200, where 100 is untouched. */
  saturation: number;
  /** 0..100 */
  grayscale: number;

  /* ------------------------------------------------------------------ blur -- */
  blurType: BlurType;
  blurAmount: number;
  blurAngle: number;
  directionalBothSides: boolean;
  tiltFocus: number;
  tiltPosition: number;
  tiltFeather: number;
  lensFocus: number;
  blurCenterX: number;
  blurCenterY: number;
  progressivePosition: number;
  progressiveReverse: boolean;

  /* ----------------------------------------------------------- post effects -- */
  pfx: Record<PfxKey, Toggle>;

  /* ------------------------------------------------------------- animation -- */
  animated: boolean;
  animStyle: AnimStyle;
  animSpeed: Toggle;
  animIntensity: Toggle;

  lights: { enabled: boolean; points: LightPoint[] };
  mask: MaskParams;
}

/**
 * Glyph ramps, darkest first. The renderer indexes these by luminance, so the
 * first character stands for an empty cell and the last for a solid one.
 */
export const CHAR_SETS: Record<Exclude<CharSetName, "custom">, string> = {
  standard: " .:-=+*#%@",
  blocks: " ░▒▓█",
  shades: " ·∙•◦○◍◉●",
  minimal: " .oO@",
  dots: " ....::;;",
  binary: " 01",
  hex: "0123456789ABCDEF"
};

export function charsFor(params: AsciiParams): string {
  if (params.charSet === "custom") {
    return params.customChars.length > 0 ? params.customChars : CHAR_SETS.standard;
  }
  return CHAR_SETS[params.charSet] ?? CHAR_SETS.standard;
}

const EMPTY_PFX: Record<PfxKey, Toggle> = {
  vignette: { enabled: false, intensity: 38 },
  scanLines: { enabled: false, intensity: 40 },
  chromatic: { enabled: false, intensity: 15 },
  bloom: { enabled: false, intensity: 25 },
  filmGrain: { enabled: false, intensity: 30 },
  glitch: { enabled: false, intensity: 20 },
  pixelate: { enabled: false, intensity: 15 },
  halftone: { enabled: false, intensity: 20 },
  filmDust: { enabled: false, intensity: 20 }
};

/**
 * "Ink Garden" — the preset this was built to reproduce, verbatim.
 *
 * A 9px dither at high contrast with the marks kept small (density 20), no
 * backdrop, no tint, no post effects, pulsing at full speed and a little over
 * half strength.
 */
export const INK_GARDEN: AsciiParams = {
  renderMode: "dither",
  bgMode: "none",
  bgBlur: 12,
  bgOpacity: 90,
  cellSize: 9,
  coverage: 100,
  invert: false,
  styleBlend: "source-over",
  charSet: "standard",
  customChars: "",
  brightness: 0,
  contrast: 158,
  edgeEmphasis: 0,
  density: 20,
  toneCurve: [
    { x: 0, y: 0 },
    { x: 1, y: 1 }
  ],
  tint: "#3ca6ff",
  tintOpacity: 0,
  overlayBlend: "multiply",
  saturation: 100,
  grayscale: 0,
  blurType: "off",
  blurAmount: 35,
  blurAngle: 0,
  directionalBothSides: false,
  tiltFocus: 35,
  tiltPosition: 50,
  tiltFeather: 15,
  lensFocus: 40,
  blurCenterX: 50,
  blurCenterY: 50,
  progressivePosition: 55,
  progressiveReverse: false,
  pfx: EMPTY_PFX,
  animated: true,
  animStyle: "pulse",
  animSpeed: { enabled: true, intensity: 100 },
  animIntensity: { enabled: true, intensity: 60 },
  lights: { enabled: false, points: [] },
  mask: {
    enabled: false,
    tool: "freehand",
    brushSize: 30,
    showOverlay: true,
    invert: false,
    dataUrl: null,
    shapes: []
  }
};

/** Shallow-merges an override onto the preset, keeping nested groups intact. */
export function withParams(base: AsciiParams, patch: Partial<AsciiParams>): AsciiParams {
  return {
    ...base,
    ...patch,
    pfx: { ...base.pfx, ...(patch.pfx ?? {}) },
    lights: { ...base.lights, ...(patch.lights ?? {}) },
    mask: { ...base.mask, ...(patch.mask ?? {}) }
  };
}

export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** A stable 0-1 value per grid cell — used by coverage, shimmer and "mixed". */
export function cellHash(col: number, row: number, salt = 0): number {
  let h = (col * 374761393 + row * 668265263 + salt * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Small deterministic PRNG, so the garden looks the same on every load. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "").trim();
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const n = parseInt(full || "000000", 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
