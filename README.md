# Sightline

A camera-first room editor. Guided photos become an editable room. Furniture is placed with fit rationale drawn from architectural and feng shui principles, then cross-shopped across Amazon, Facebook Marketplace, Target, Wayfair, IKEA, West Elm, CB2, and Article.

## Highlights

- **Capture flow**: Frame → Capture → Confirm → Brief. 6-12 photos, real-time blur/brightness quality checks, an editable detected room (walls, openings, existing furniture, palette).
- **Principles library**: 12 encoded rules pulled from *A Pattern Language*, *Form, Space, and Order*, *Human Dimension & Interior Space*, and classical feng shui bagua. Command position, light on two sides, intimacy gradient, conversation radius, walkway clearance, door swing, and more.
- **Three principled layouts** per room: Command, Salon, Airy. Each placement carries a rationale.
- **Furniture swap** with alternates ranked by vibe + price proximity.
- **Pinterest vibe extraction**: paste a pin URL or upload a screenshot; we extract the palette and mood tags in-browser (no API keys).
- **Aesthetic suggestions** that reference the tradition they come from.
- **2D top-view planner + interactive 3D room** (React Three Fiber).
- Editorial dark UI: charcoal, warm paper, brass signal color, serif display type.

## Tech

- Next.js 14 (App Router) + TypeScript, Tailwind
- Framer Motion, React Three Fiber + drei
- Client-side image analysis (Canvas API + palette k-means-lite)
- Deployed on Vercel

## Local dev

```bash
npm install
cp .env.example .env.local   # optional, see below
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

Served at `/api/catalog`. The canvas runs it alongside `/api/search` and
prefers its results, because its dimensions are confirmed rather than parsed.

## API keys

Every key is optional. With none set the app runs on the seed catalog and a
local heuristic room reader, so the full flow still works end to end.

| Variable | Powers | Get it |
|---|---|---|
| `GOOGLE_AI_API_KEY` | Room geometry from photos, Pinterest vibe reading | https://aistudio.google.com/apikey |
| `SERPAPI_KEY` | Amazon, Target, Wayfair, IKEA, Google Shopping | https://serpapi.com/manage-api-key |
| `APIFY_TOKEN` | Facebook Marketplace, Pinterest boards | https://console.apify.com/settings/integrations |

Graceful degradation is built in at every layer:

- No Gemini key: photos are scored locally for blur and brightness, and the room falls back to a typed default you edit by hand.
- No SerpAPI or Apify: the seed catalog serves the recommendation.
- A source that errors or times out: the others still return; the canvas badge shows whether the feed was live or seeded.

### In Vercel

Project → Settings → Environment Variables. Add each name, check all three
environments, save, then redeploy (env vars only apply to new deployments).

## Persistence

No database. Rooms are saved to `localStorage` and share links encode the
entire plan into the URL, so a room can be sent to someone without a server
ever holding a copy. Swap in a database when you want cross-device sync.

## How the AI is scoped

Per the product spec: AI does perception and explanation. Deterministic code
does geometry. Gemini reads photos into walls, openings, and furniture
footprints, and reads inspiration images into a palette and search terms.
It never decides whether something fits — collision, clearance, and door-swing
checks live in `src/lib/layout.ts` and are the only source of a fit verdict.
Listings whose dimensions cannot be parsed are marked unverified and are
deprioritized rather than placed on a false premise.

## Image generation guidance

For **real product photos**: don't generate. Pull from the listing directly, which is what the SerpAPI and Apify adapters do.

For **room mockups** (photorealistic previews of the composed room):
- **Google Gemini 2.5 Flash Image** (Nano Banana), free via AI Studio — same key already wired here.
- **Pollinations.ai** — no key, unlimited, decent quality.
- **Replicate SDXL** — free tier, more control if you want fine-tuning.

## Roadmap

- Room render pass via Gemini for magazine-grade previews
- Cross-device sync behind an account
- WebXR AR preview on mobile
- Multi-room projects, then whole-property
