# Roomly

Find furniture across Amazon, Facebook Marketplace, Target, Wayfair and IKEA within your budget, then see the room come to life in 2D and 3D.

## Tech stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + shadcn-style utilities, 21st.dev-inspired components
- Framer Motion animations
- React Three Fiber + drei for the 3D room
- Draggable 2D top-view planner (native pointer events, no heavy canvas lib)
- Deployed on Vercel

## Run locally

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

## Deploy to Vercel

1. `vercel login`
2. `vercel` in the project root, follow prompts
3. `vercel --prod` to promote

`vercel.json` already sets Next.js as the framework.

## Roadmap after MVP

- Real listing search via SerpAPI (Amazon, Target) and Apify actors (Facebook Marketplace)
- Save/share rooms via Supabase
- Style quiz onboarding
- Room photo upload with dimension inference
- AR preview on mobile (WebXR)
- Price drop alerts
- Room render with Google Gemini 2.5 Flash Image (free) for photorealistic previews
