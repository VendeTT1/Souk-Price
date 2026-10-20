# Souk Prices

Crowd-sourced prices for vegetables, fruits, meat, fish, poultry and eggs across Morocco.
React + Vite, Supabase backend, French / English / Arabic (RTL), no accounts.

## Run locally

```bash
npm install
cp .env.example .env     # optional: leave empty for demo mode
npm run dev
```

With no Supabase variables the app runs in **demo mode**: data is seeded and stored in the browser's localStorage, so you can try every screen immediately.

## Connect Supabase

1. Create a project at supabase.com.
2. Open the SQL editor and run `supabase/schema.sql` (table, checks, RLS policies, `price_summary` view).
3. Copy the project URL and anon key (Project Settings → API) into `.env`:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   VITE_MIN_ENTRIES=3
   ```
4. Restart `npm run dev`.

## Deploy (GitHub + Vercel)

```bash
git remote add origin git@github.com:<you>/souk-prices.git
git push -u origin main
```

In Vercel: Import the repo (framework preset: Vite) and add the same three env vars. Every push to `main` redeploys.

## How it works

| Piece | Where |
| --- | --- |
| Product catalog (category → item, trilingual names, default unit) | `src/data/catalog.js` |
| Regions, cities, neighborhood suggestions, market types, supermarket chains | `src/data/locations.js` |
| Backend switch (`addPrice`, `listPrices`, `getSummary`) | `src/lib/store.js` |
| Supabase implementation / local demo implementation | `src/lib/supabaseStore.js`, `src/lib/localStore.js` |
| Dashboard: averages per item, last 30 days, shown once an item has `VITE_MIN_ENTRIES` entries | `src/components/Dashboard.jsx` + `price_summary` view |
| Search with filters (item, region, city, neighborhood, market name, rating) | `src/components/Search.jsx` |
| Add-price form (dropdowns, numeric-only price, rating, comment) | `src/components/AddPriceForm.jsx` |
| Translations | `src/locales/{fr,en,ar}.json` |

Switching to Firebase or Google Sheets later means writing one new file that implements the three store functions and pointing `store.js` at it.

## Known limits of the POC

- Anyone can insert (no auth). The DB enforces value ranges and the form has a honeypot, but there is no rate limiting. Add Supabase Edge Function + captcha or per-IP limits before a public launch.
- Averages are plain means; a few bad entries can skew an item. A median or trimmed mean in the view is an easy next step.
- Item names are static in `catalog.js` for now; move to a table/API when the list grows.
