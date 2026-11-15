// Adds the cities and products approved from the admin dashboard to the built-in lists.
// Called once before the app is drawn, so every component simply sees the longer lists.
import { ITEMS } from '../data/catalog';
import { CITIES, getProvince } from '../data/locations';
import { store } from './store';

export async function loadExtras() {
  try {
    const { items = [], cities = [] } = await store.getExtras();
    items.forEach((it) => { if (!ITEMS.some((x) => x.id === it.id)) ITEMS.push(it); });
    cities.forEach((c) => {
      // a city whose province is unknown could not be grouped in the pickers: ignore it
      if (getProvince(c.province) && !CITIES.some((x) => x.id === c.id)) CITIES.push(c);
    });
  } catch {
    // tables missing or offline: the app keeps working with the built-in lists
  }
}
