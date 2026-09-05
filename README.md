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

## Authentication setup

Sightline is prepared for Google OAuth through Supabase, while still allowing
the demo flow to work until credentials are configured. Copy `.env.example` to
`.env.local` for local development and put the same values in Vercel's
Environment Variables for Production and Preview.

1. In Supabase, run `supabase/migrations/20260905000000_sightline_auth.sql` in
   the SQL Editor.
2. In Google Cloud Console, create an OAuth **Web application**. Add
   `https://rvqwklzeqdxfzlhtvsbz.supabase.co/auth/v1/callback` as its authorized
   redirect URI.
3. Paste that Google client ID and secret into Supabase: Authentication →
   Providers → Google. In Supabase Authentication → URL Configuration, add
   `http://localhost:3000/auth/callback` and
   `https://code-box-hack.vercel.app/auth/callback` to Redirect URLs.

The service-role key is never required in browser code and must remain a
server-only Vercel environment variable.

## Image generation guidance

For **real product photos**: don't generate. Pull from the marketplace listing directly (SerpAPI for Amazon/Target, Apify for Facebook Marketplace).

For **room mockups** (photorealistic previews of the composed room):
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
