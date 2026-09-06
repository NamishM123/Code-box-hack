# Sightline

A camera-first room editor. Guided photos become an editable room. Furniture is placed with fit rationale drawn from architectural and feng shui principles, then cross-shopped across Amazon, Facebook Marketplace, Target, Wayfair, IKEA, West Elm, CB2, and Article.

## Highlights

- **Capture flow**: Frame → Capture → Confirm → Brief. 6-12 photos, real-time blur/brightness quality checks, an editable detected room (walls, openings, existing furniture, palette).
- **Principles library**: 12 encoded rules pulled from *A Pattern Language*, *Form, Space, and Order*, *Human Dimension & Interior Space*, and classical feng shui bagua. Command position, light on two sides, intimacy gradient, conversation radius, walkway clearance, door swing, and more.
- **Three principled layouts** per room: Command, Salon, Airy. Each placement carries a rationale.
- **Furniture swap** with alternates ranked by vibe + price proximity.
- **Pinterest vibe extraction**: paste a pin URL or upload a screenshot; we extract the palette and mood tags in-browser (no API keys).
- **Aesthetic suggestions** that reference the tradition they come from.
- **Three views of the same room**: a 2D top-view planner, a 3D block view for reading volumes, and a **3D rendered view**.
- **The rendered view shows the actual products.** Each listing's own photo is cut out of its studio backdrop in the browser and stood up in the room at its measured size — the exact Target sofa, not a stand-in. A listing whose photo is a styled room scene has no clean silhouette to cut, so that piece falls back to a furniture model built parametrically from its real width, depth and height (sofas get arms and cushions, bookshelves get books, beds get made, mirrors are arched). Toggle between the two with **Real photos / Models**.
- **Photoreal pass**: the **Photoreal** button sends the room's exact dimensions, every placement in feet, and the listing photos themselves to Gemini, which returns a magazine-grade photograph of that room containing those products. Needs `GEMINI_API_KEY`; `GEMINI_IMAGE_MODEL` and `GEMINI_API_BASE` override the model and host.
- Daylight/evening lighting, click-to-select, and a PNG export of the 3D view.
- Editorial dark UI: charcoal, warm paper, brass signal color, serif display type.

## Tech

- Next.js 14 (App Router) + TypeScript, Tailwind
- Framer Motion, React Three Fiber + drei
- Furniture, room shell, wood/plaster/rug/art textures and the lighting environment are all generated in code — no model files, no HDR downloads, so the rendered view works offline
- Client-side image analysis (Canvas API + palette k-means-lite)
- Deployed on Vercel

## Local dev

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Dynamic catalog demo

`scripts/live_catalog.py` fetches a deliberately small, curated list of public
retailer product pages and returns normalized JSON for the Sightline demo. It
does not log in, evade access controls, or contact marketplace sellers. Items
without width, depth, and height are ineligible for a spatial placement.

```bash
python3 scripts/live_catalog.py --query shelf --budget 250 --free-wall-span 36 --max-depth 18
```

The script is a live-data proof of concept, not a broad retailer crawler. Add
new sources only through permitted APIs, feeds, or publicly accessible pages.

## Deploy

```bash
vercel
vercel --prod
```

## Image generation guidance

For **real product photos**: don't generate. Pull from the marketplace listing directly (SerpAPI for Amazon/Target, Apify for Facebook Marketplace).

Wired up already: `/api/render` sends the layout plus the real listing photos to
Gemini (`gemini-2.5-flash-image` by default) and returns the composed room. Set
`GEMINI_API_KEY` to switch the Photoreal button on.

Other options for **room mockups**:
- **Google Gemini 2.5 Flash Image** (Nano Banana), free tier via AI Studio — highest quality, handles compositing products into rooms.
- **Pollinations.ai** — no key, unlimited, decent quality for MVP.
- **Replicate SDXL** — free tier, more control if you want fine-tuning.

## Roadmap

- Real listing search adapters (SerpAPI, Apify)
- Supabase for saved rooms + share links
- Photo-to-dimensions via Gemini Vision for higher confidence
- WebXR AR preview on mobile
- Room render pass via Gemini for magazine-grade previews
- Multi-room projects, then whole-property
