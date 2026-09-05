import type { DetectedRoom, PlacedItem, Product, RoomSpec } from "../types";

/**
 * Turns a plan (coordinates in feet) into spatial prose an image model can use.
 *
 * Raw coordinates render badly — the model does not reason about (4.2, 9.7).
 * It does reason about "against the far wall, slightly left of center, seen
 * from the doorway". This module is that translation.
 */

export type Camera = "dollhouse" | "corner" | "doorway" | "window";

export const CAMERAS: { key: Camera; label: string; blurb: string }[] = [
  { key: "dollhouse", label: "Dollhouse", blurb: "Cutaway box seen from above, the whole layout at once" },
  { key: "corner", label: "Corner", blurb: "Standing in the near corner, eye level" },
  { key: "doorway", label: "Doorway", blurb: "The first thing you see walking in" },
  { key: "window", label: "By the window", blurb: "Looking back into the room" }
];

const CAMERA_PROMPT: Record<Camera, string> = {
  dollhouse:
    "Render this as a clean architectural 'dollhouse' cutaway: the room is an open box viewed from above at roughly a 50 degree downward angle, near-isometric, with the two near walls removed so the whole floor and all the furniture are visible at once. " +
    "The two remaining walls (the far wall and the left wall) are plain matte white with clean white baseboards, and their outer faces and cut edges are visible as crisp white slabs about 4 inches thick. " +
    "The floor is light natural wood plank. The room sits alone on a plain flat neutral warm-grey background with no environment around it, like a product visualization or a floor-plan app render. " +
    "Even, soft, shadowless studio lighting with gentle contact shadows under the furniture. No ceiling.",
  corner:
    "Camera in the near-left corner of the room at standing eye level (about 5 ft 6 in), 35mm lens, looking diagonally across the space toward the far wall. Both the left wall and the far wall are visible.",
  doorway:
    "Camera at the doorway looking straight into the room at standing eye level (about 5 ft 6 in), 28mm lens. This is the view a person gets the moment they walk in.",
  window:
    "Camera at the window wall looking back into the room at eye level, 35mm lens, with the daylight behind the camera falling across the furniture."
};

/** Position of a piece, in words, relative to the room and the viewer. */
function placement(item: PlacedItem, product: Product, room: RoomSpec): string {
  const W = room.widthFt;
  const D = room.depthFt;

  const nearWall =
    item.y < D * 0.22 ? "against the far wall" :
    item.y > D * 0.78 ? "against the near wall" :
    item.x < W * 0.22 ? "against the left wall" :
    item.x > W * 0.78 ? "against the right wall" :
    "in the middle of the room";

  const lateral =
    item.x < W * 0.35 ? "toward the left" :
    item.x > W * 0.65 ? "toward the right" :
    "centered";

  const depth =
    item.y < D * 0.35 ? "at the back of the room" :
    item.y > D * 0.65 ? "near the front" :
    "mid-room";

  const facing = item.rotation
    ? `, angled about ${Math.round(item.rotation)} degrees`
    : "";

  const size = `${fmt(product.width)} wide by ${fmt(product.depth)} deep by ${fmt(product.height)} tall`;

  return `- ${product.title} (${product.category}), ${size}: ${nearWall}, ${lateral}, ${depth}${facing}.`;
}

function fmt(ft: number): string {
  if (ft < 1) return `${Math.round(ft * 12)} in`;
  const whole = Math.floor(ft);
  const inches = Math.round((ft - whole) * 12);
  return inches ? `${whole} ft ${inches} in` : `${whole} ft`;
}

export interface RenderPromptArgs {
  room: RoomSpec;
  detected?: DetectedRoom | null;
  placed: PlacedItem[];
  products: Product[];
  camera: Camera;
  /** How many products are attached as reference images, in plan order. */
  referenceCount: number;
}

export function buildRenderPrompt(args: RenderPromptArgs): string {
  const { room, detected, placed, products, camera, referenceCount } = args;
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));

  const lines = placed
    .map((p) => {
      const prod = byId[p.productId];
      return prod ? placement(p, prod, room) : null;
    })
    .filter(Boolean);

  const openings = (detected?.openings || []).map((o) => {
    const wall = { N: "far", S: "near", W: "left", E: "right" }[o.wall] || "far";
    return `- A ${o.kind} about ${fmt(o.widthFt)} wide on the ${wall} wall.`;
  });

  const palette = (room.vibePalette?.length ? room.vibePalette : detected?.palette || [])
    .slice(0, 5)
    .join(", ");

  const mood = room.vibeTags?.length ? room.vibeTags.join(", ") : room.style.replace("-", " ");

  const reference = referenceCount
    ? `\nREFERENCE IMAGES\nThe ${referenceCount} attached product photo${referenceCount > 1 ? "s are" : " is"} the actual furniture being placed, listed in the same order as the FURNITURE list above. Reproduce each piece faithfully — its real shape, proportion, material, and color. Do not substitute a different style of furniture. Relight each piece to match the room's daylight, but keep it recognizably the same product.\n`
    : "";

  const isDoll = camera === "dollhouse";

  const opening = isDoll
    ? "Generate a clean 3D architectural cutaway visualization of a single room, in the style of a modern interior-design app."
    : "Generate a photorealistic interior photograph of a single room.";

  const styleRules = isDoll
    ? `- Matte white walls and white baseboards. Light natural wood plank floor.
- Furniture rendered as clean, accurate 3D models with real materials and soft realistic shading — not flat shapes, not cartoon, not wireframe.
${palette ? `- Accent the furniture and textiles from this palette: ${palette}.` : ""}
- Plain flat neutral warm-grey backdrop. Nothing outside the room.`
    : `- Overall mood: ${mood}.
${palette ? `- The room's color palette: ${palette}.` : ""}
- Walls in a warm neutral. Floor in natural wood unless a rug is listed above.`;

  const finishRules = isDoll
    ? `- Even soft studio lighting with gentle contact shadows. No dramatic shadows, no lens flare, no vignette.
- Crisp, clean, uncluttered. This is a layout visualization, so clarity beats atmosphere.`
    : `- Natural interior photography: soft directional daylight, accurate shadows and contact shadows on the floor, realistic materials and fabric texture.`;

  return `${opening}

ROOM
- ${fmt(room.widthFt)} wide by ${fmt(room.depthFt)} deep, standard 9 ft ceiling.
- Room type: ${room.roomType || "living room"}.
${openings.length ? openings.join("\n") : "- No windows or doors visible in this view."}
- ${detected?.lightingNote || "Soft natural daylight."}

FURNITURE, placed exactly as described
${lines.join("\n")}
${reference}
STYLE
${styleRules}

CAMERA
${CAMERA_PROMPT[camera]}

RULES
- Respect the stated dimensions. The furniture must read at the correct scale relative to the room and to each other. A ${fmt(room.widthFt)} wall should look like a ${fmt(room.widthFt)} wall.
- Place every listed piece, and place nothing that is not listed. Do not add extra furniture, extra plants, extra art, or people.
- Keep walkways clear and believable. Do not overlap furniture, and do not push anything through a wall.
${finishRules}
- No text, no watermarks, no labels, no dimension lines, no measurement annotations.`;
}
