// Pure functions (no imports) that turn the raw JSON files in ./location-data into the lists the app uses.
// Kept separate from locations.js so Node scripts can use them too.
//
// Hierarchy:  region (12)  >  province / prefecture (75)  >  city / town
// ids are the English name in lower case without accents ("Fès" -> "fes"). They are stored in the
// database (prices.region, prices.city), so never change an id once data exists.

export function slug(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFD').replace(/\p{M}/gu, '')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const names = (x) => ({ en: x.en, fr: x.fr || x.en, ar: x.ar || x.en });

export function buildLocations({ regions, provinces, provinceRegion, towns, neighborhoods = {} }) {
  const REGIONS = regions.map((r) => ({ id: slug(r.en), names: names(r) }));
  const regionIds = new Set(REGIONS.map((r) => r.id));

  const PROVINCES = provinces.map((p) => {
    const regionEn = provinceRegion[p.en];
    if (!regionEn) throw new Error(`No region for province "${p.en}"`);
    const region = slug(regionEn);
    if (!regionIds.has(region)) throw new Error(`Unknown region "${regionEn}" for province "${p.en}"`);
    return { id: slug(p.en), region, names: names(p) };
  });
  const provinceById = new Map(PROVINCES.map((p) => [p.id, p]));

  const CITIES = towns.map((c) => {
    const province = provinceById.get(slug(c.province));
    if (!province) throw new Error(`Unknown province "${c.province}" for town "${c.en}"`);
    return {
      id: c.id || slug(c.en),
      region: province.region,
      province: province.id,
      names: names(c),
      neighborhoods: neighborhoods[c.id || slug(c.en)] ?? [],
    };
  });

  const ids = new Set();
  CITIES.forEach((c) => {
    if (ids.has(c.id)) throw new Error(`Duplicate city id "${c.id}"`);
    ids.add(c.id);
  });

  return { REGIONS, PROVINCES, CITIES };
}
