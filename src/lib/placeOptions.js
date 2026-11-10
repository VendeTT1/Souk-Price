import { CITIES, PROVINCES, REGIONS, citiesOfRegion, provincesOfRegion, getProvince, getRegion } from '../data/locations';

const regionOrder = (id) => REGIONS.findIndex((r) => r.id === id);
const provinceOrder = (id) => PROVINCES.findIndex((p) => p.id === id);

// Picker options for cities, grouped under their province. Typing a province name also finds its cities.
export function cityOptions(regionId, lang) {
  return (regionId ? citiesOfRegion(regionId) : CITIES)
    .map((c) => {
      const p = getProvince(c.province);
      return {
        value: c.id,
        label: c.names[lang],
        keywords: `${c.names.en} ${c.names.fr} ${c.names.ar} ${p.names.en} ${p.names.fr} ${p.names.ar}`,
        group: c.province,
        groupLabel: p.names[lang],
        _r: regionOrder(c.region),
      };
    })
    .sort((a, b) => a._r - b._r || provinceOrder(a.group) - provinceOrder(b.group)
      || a.label.localeCompare(b.label, lang));
}

// Picker options for provinces, grouped under their region.
export function provinceOptions(regionId, lang) {
  return (regionId ? provincesOfRegion(regionId) : PROVINCES)
    .map((p) => {
      const r = getRegion(p.region);
      return {
        value: p.id,
        label: p.names[lang],
        keywords: `${p.names.en} ${p.names.fr} ${p.names.ar} ${r.names.en} ${r.names.fr} ${r.names.ar}`,
        group: p.region,
        groupLabel: r.names[lang],
        _r: regionOrder(p.region),
      };
    })
    .sort((a, b) => a._r - b._r || a.label.localeCompare(b.label, lang));
}
