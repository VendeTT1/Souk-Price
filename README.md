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

## Known limits of the POC

- No accounts: the rate limit is per IP, so many people behind one mobile-carrier address share a budget.
- Item names are static in `catalog.js`; move to a table/API when the list grows.
