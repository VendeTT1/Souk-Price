#!/usr/bin/env node
// Turns reviewed rows of public.pending_submissions into clean SQL.
//
//   node scripts/pending-to-sql.mjs pending.json > approved.sql
//
// pending.json = the export of the review queue (see README: a JSON array of rows).
// For every row you decide, by editing the JSON:
//   "approved": true          -> the price is inserted into public.prices
//   "rejected": true          -> the row is only marked as rejected
//   (neither)                 -> skipped, stays pending
//   "resolved": { ... }       -> the corrected values, required when the row has unknown names:
//        "city":         id of the city      (add the place to src/data/location-data/towns-by-province.json first)
//        "item":         id of the product   (add it to src/data/catalog.js first)
//        "neighborhood": cleaned spelling    (optional; the typed text is used when missing)
// The script checks every id against the app's data files, so a typo cannot reach the database.
// Nothing is executed: you read approved.sql and run it yourself in the Supabase SQL editor.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildLocations } from '../src/data/location-build.js';
import { ITEMS } from '../src/data/catalog.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'src/data/location-data');
const readJson = (f) => JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf8'));
const { CITIES } = buildLocations({
  regions: readJson('region.json'),
  provinces: readJson('citties.json'),
  provinceRegion: readJson('province-region.json'),
  towns: readJson('towns-by-province.json'),
  neighborhoods: readJson('neighborhoods.json'),
});
const cityById = new Map(CITIES.map((c) => [c.id, c]));
const itemById = new Map(ITEMS.map((i) => [i.id, i]));

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/pending-to-sql.mjs pending.json > approved.sql');
  process.exit(1);
}
let rows = JSON.parse(fs.readFileSync(file, 'utf8'));
if (!Array.isArray(rows)) rows = rows.rows ?? [rows];

const q = (v) => `'${String(v).replace(/'/g, "''")}'`; // SQL string literal
const warn = (row, msg) => console.error(`-- skipped ${row.id ?? '(no id)'}: ${msg}`);
const MARKETS = ['souk', 'street', 'supermarket', 'shop'];

const out = [];
let inserted = 0;
let rejected = 0;
let skipped = 0;

for (const row of rows) {
  if (!row?.id || !/^[0-9a-f-]{36}$/i.test(row.id)) { warn(row, 'missing or invalid id'); skipped += 1; continue; }

  if (row.rejected) {
    out.push(`update public.pending_submissions set status = 'rejected', review_note = ${q(row.review_note ?? '')} where id = ${q(row.id)};`);
    rejected += 1;
    continue;
  }
  if (!row.approved) { skipped += 1; continue; }

  const p = row.payload ?? {};
  const r = row.resolved ?? {};
  const custom = p.custom ?? {};
  const problems = [];

  const cityId = r.city ?? p.city;
  const itemId = r.item ?? p.item;
  const city = cityById.get(cityId);
  const item = itemById.get(itemId);
  if (!city) problems.push(custom.city ? `unknown city "${custom.city}": set resolved.city to a city id` : `unknown city id "${cityId}"`);
  if (!item) problems.push(custom.item ? `unknown product "${custom.item}": set resolved.item to a product id` : `unknown product id "${itemId}"`);

  const neighborhood = String(r.neighborhood ?? p.neighborhood ?? '').trim();
  const marketName = String(p.market_name ?? '').trim();
  const comment = p.comment ? String(p.comment).trim() : null;
  const price = Number(p.price);
  const rating = Number(p.rating);

  if (!neighborhood || neighborhood.length > 80) problems.push('neighborhood must be 1-80 characters');
  if (!marketName || marketName.length > 80) problems.push('market_name must be 1-80 characters');
  if (comment && comment.length > 500) problems.push('comment is longer than 500 characters');
  if (!MARKETS.includes(p.market_type)) problems.push(`bad market_type "${p.market_type}"`);
  if (!(price > 0 && price < 10000)) problems.push(`bad price "${p.price}"`);
  if (![1, 2, 3].includes(rating)) problems.push(`bad rating "${p.rating}"`);
  if (item && p.unit !== 'kg' && p.unit !== 'unit') problems.push(`bad unit "${p.unit}"`);

  if (problems.length) { warn(row, problems.join('; ')); skipped += 1; continue; }

  // region and category always come from the data files, so the hierarchy stays consistent
  const created = row.created_at && !Number.isNaN(Date.parse(row.created_at)) ? new Date(row.created_at).toISOString() : null;
  out.push(
    'insert into public.prices (created_at, region, city, neighborhood, market_type, market_name, category, item, price, unit, rating, comment)\n'
    + `values (${created ? q(created) : 'now()'}, ${q(city.region)}, ${q(city.id)}, ${q(neighborhood)}, ${q(p.market_type)}, ${q(marketName)}, `
    + `${q(item.category)}, ${q(item.id)}, ${price}, ${q(p.unit)}, ${rating}, ${comment ? q(comment) : 'null'});`,
  );
  out.push(`update public.pending_submissions set status = 'approved' where id = ${q(row.id)};`);
  inserted += 1;
}

console.log('-- Generated by scripts/pending-to-sql.mjs. Read it, then run it in the Supabase SQL editor.');
if (out.length) {
  console.log('begin;');
  console.log(out.join('\n'));
  console.log('commit;');
}
console.error(`${inserted} price(s) to insert, ${rejected} rejected, ${skipped} skipped.`);
