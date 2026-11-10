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
2. Open the SQL editor and run `supabase/schema.sql` (table, checks, RLS policies, anti-abuse trigger, `price_summary` view, `search_stats` function). It is safe to re-run and upgrades an existing database in place.
   Optionally run `supabase/seed.sql` for ~48 test rows (remove later with `delete from public.prices where comment = '[seed]';`).
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

## Data quality and abuse protection

Everything runs inside Supabase (`supabase/schema.sql`), so it also protects against anyone calling the API directly:

- **Rate limit** per visitor (salted hash of the IP, kept 2 days): 15 submissions per hour and 60 per day. Tune `c_hour_limit` / `c_day_limit` in the trigger and re-run the file. The app shows a friendly message when it triggers.
- **Duplicate guard**: the same item, place and price from the same visitor within an hour is refused.
- **Plausibility check**: once an item has 5 prices, a new price more than 5x above or below the median is stored with `suspect = true`. It still shows in search but is ignored by the dashboard and the search median. The form also warns the user before submitting.
- **Medians instead of averages** on the dashboard and in search, so one typo cannot move the headline price.
- **Moderation**: `hidden = true` removes a row everywhere. Visitors cannot set `hidden` or `suspect` (column-level insert grants + the trigger forces them). SQL snippets are at the bottom of `schema.sql`.

## Places and products that are not in the lists

Locations are a hierarchy: **region > province / prefecture > city or town**, built from `src/data/location-data/`
(`region.json`, `citties.json`, `province-region.json`, `towns-by-province.json`, optional `neighborhoods.json`).
To add a place, add it to `towns-by-province.json` (`id` = English name in lower case without accents; never change an id later).

If a visitor cannot find their city, neighborhood or product, they can type it. **Those submissions never go straight into
`prices`.** The whole form is stored as JSON in `public.pending_submissions` (visitors can write to it but not read it).
Review flow:

1. In the Supabase SQL editor, export the queue:
   `select jsonb_pretty(jsonb_agg(to_jsonb(p) order by created_at)) from public.pending_submissions p where status = 'pending';`
   Copy the result into `pending.json`.
2. Check each row. Add the real place to `towns-by-province.json` / the product to `src/data/catalog.js` (and deploy).
3. In `pending.json` mark each row `"approved": true` (or `"rejected": true`) and, for unknown names, add the fixed values:
   `"resolved": { "city": "tafraout", "item": "some-product-id", "neighborhood": "Centre" }`.
4. `node scripts/pending-to-sql.mjs pending.json > approved.sql`, read `approved.sql`, run it in the SQL editor.
   The script checks every id against the data files and skips rows with problems (it tells you why).

A typed neighborhood is held only for cities that have a suggestion list in `neighborhoods.json`
(switch: `HOLD_UNKNOWN_NEIGHBORHOODS` in `src/components/AddPriceForm.jsx`).

## Known limits of the POC

- No accounts: the rate limit is per IP, so many people behind one mobile-carrier address share a budget.
- Item names are static in `catalog.js`; move to a table/API when the list grows.
