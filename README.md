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

## Deploy

```bash
vercel
vercel --prod
```

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
