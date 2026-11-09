// Morocco: regions > provinces/prefectures > cities and towns, built from the JSON files in ./location-data.
//  - region.json, citties.json   : region and province names (fr/en/ar)
//  - province-region.json        : which region each province belongs to
//  - towns-by-province.json      : cities and towns of each province  <- add missing places here
//  - neighborhoods.json          : optional neighborhood suggestions per city id
// A place that is not in these lists can be suggested from the form; it is reviewed before it is added here.
import regions from './location-data/region.json';
import provinces from './location-data/citties.json';
import provinceRegion from './location-data/province-region.json';
import towns from './location-data/towns-by-province.json';
import neighborhoods from './location-data/neighborhoods.json';
import { buildLocations } from './location-build';

export const { REGIONS, PROVINCES, CITIES } = buildLocations({
  regions, provinces, provinceRegion, towns, neighborhoods,
});

export const MARKET_TYPES = ['souk', 'street', 'supermarket', 'shop'];

// Suggested names when the market type is "supermarket".
export const SUPERMARKET_CHAINS = ['Marjane', 'Carrefour', 'Aswak Assalam', 'Label’Vie', 'Acima', 'Atacadao', 'BIM', 'Uniprix'];

export const getCity = (id) => CITIES.find((c) => c.id === id);
export const getRegion = (id) => REGIONS.find((r) => r.id === id);
export const getProvince = (id) => PROVINCES.find((p) => p.id === id);
export const citiesOfRegion = (regionId) => CITIES.filter((c) => c.region === regionId);
export const provincesOfRegion = (regionId) => PROVINCES.filter((p) => p.region === regionId);
export const cityName = (id, lang) => getCity(id)?.names[lang] ?? id;
export const regionName = (id, lang) => getRegion(id)?.names[lang] ?? id;
export const provinceName = (id, lang) => getProvince(id)?.names[lang] ?? id;
