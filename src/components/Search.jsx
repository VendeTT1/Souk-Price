import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { store } from '../lib/store';
import { CATEGORIES, ITEMS, itemName } from '../data/catalog';
import { REGIONS, citiesOfRegion, CITIES, cityName, regionName } from '../data/locations';
import { formatPrice, formatDate } from '../lib/format';
import { RatingBadge } from './Rating';
import Pagination from './Pagination';

const PAGE_SIZE = 10;
const EMPTY = { item: '', region: '', city: '', neighborhood: '', marketName: '', rating: '' };

function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

export default function Search({ version }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [f, setF] = useState(EMPTY);
  const [result, setResult] = useState(null); // { rows, total }
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(false);
  const [pageState, setPageState] = useState({ key: '', page: 1 });

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const debounced = useDebounced(f);

  const sortedItems = useMemo(
    () => CATEGORIES.map((c) => ({ c, items: ITEMS.filter((i) => i.category === c)
      .sort((a, b) => a.names[lang].localeCompare(b.names[lang], lang)) })),
    [lang],
  );

  const cityOptions = f.region ? citiesOfRegion(f.region) : CITIES;

  // page belongs to a set of filters: when the filters change, we are back on page 1
  const filterKey = `${JSON.stringify(debounced)}|${version}`;
  const page = pageState.key === filterKey ? pageState.page : 1;

  useEffect(() => {
    let alive = true;
    setResult(null);
    setError(false);
    store.listPrices(debounced, { page, pageSize: PAGE_SIZE })
      .then((r) => alive && setResult(r))
      .catch(() => alive && setError(true));
    return () => { alive = false; };
  }, [debounced, page, version]);

  // average over ALL matches (not just the visible page); only meaningful for a single item
  useEffect(() => {
    let alive = true;
    setStats(null);
    if (!debounced.item) return undefined;
    store.getStats(debounced)
      .then((r) => alive && setStats(r))
      .catch(() => alive && setStats(null));
    return () => { alive = false; };
  }, [debounced, version]);

  const unitLabel = (u) => (u === 'kg' ? t('common.perKg') : t('common.perUnit'));

  return (
    <section>
      <h2>{t('search.title')}</h2>

      <div className="filters">
        <label>
          {t('search.item')}
          <select value={f.item} onChange={set('item')}>
            <option value="">{t('search.anyItem')}</option>
            {sortedItems.map(({ c, items }) => (
              <optgroup key={c} label={t(`categories.${c}`)}>
                {items.map((i) => <option key={i.id} value={i.id}>{i.names[lang]}</option>)}
              </optgroup>
            ))}
          </select>
        </label>

        <label>
          {t('search.region')}
          <select value={f.region} onChange={(e) => setF((p) => ({ ...p, region: e.target.value, city: '' }))}>
            <option value="">{t('common.all')}</option>
            {REGIONS.map((r) => <option key={r.id} value={r.id}>{r.names[lang]}</option>)}
          </select>
        </label>

        <label>
          {t('search.city')}
          <select value={f.city} onChange={set('city')}>
            <option value="">{t('common.all')}</option>
            {cityOptions.map((c) => <option key={c.id} value={c.id}>{c.names[lang]}</option>)}
          </select>
        </label>

        <label>
          {t('search.neighborhood')}
          <input type="search" value={f.neighborhood} onChange={set('neighborhood')} />
        </label>

        <label>
          {t('search.market')}
          <input type="search" value={f.marketName} onChange={set('marketName')} />
        </label>

        <label>
          {t('search.rating')}
          <select value={f.rating} onChange={set('rating')}>
            <option value="">{t('common.all')}</option>
            <option value="3">😊 {t('rating.3')}</option>
            <option value="2">😐 {t('rating.2')}</option>
            <option value="1">😞 {t('rating.1')}</option>
          </select>
        </label>

        <button className="link" onClick={() => setF(EMPTY)}>{t('common.reset')}</button>
      </div>

      {error && <p className="error">{t('common.error')}</p>}
      {!result && !error && <p className="muted">{t('common.loading')}</p>}

      {result && (
        <>
          <div className="result-bar">
            <strong>{t('search.results', { count: result.total })}</strong>
            {stats && (
              <span className="avg-pill">
                {t('search.average')}: {formatPrice(stats.avg_price, lang)} {t('common.dh')} {unitLabel(stats.unit)}
              </span>
            )}
          </div>

          {result.rows.length === 0 ? (
            <p className="empty">{t('search.noResults')}</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t('search.colItem')}</th>
                    <th>{t('search.colPrice')}</th>
                    <th>{t('search.colPlace')}</th>
                    <th>{t('search.colRating')}</th>
                    <th>{t('search.colNote')}</th>
                    <th>{t('search.colDate')}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r) => (
                    <tr key={r.id}>
                      <td data-label={t('search.colItem')}>{itemName(r.item, lang)}</td>
                      <td data-label={t('search.colPrice')} className="num">
                        {formatPrice(r.price, lang)} <small>{t('common.dh')} {unitLabel(r.unit)}</small>
                      </td>
                      <td data-label={t('search.colPlace')}>
                        <div>{r.market_name} <span className="muted small">({t(`marketTypes.${r.market_type}`)})</span></div>
                        <div className="muted small">{r.neighborhood}, {cityName(r.city, lang)} · {regionName(r.region, lang)}</div>
                      </td>
                      <td data-label={t('search.colRating')}><RatingBadge value={r.rating} /></td>
                      <td data-label={t('search.colNote')} className="note">{r.comment}</td>
                      <td data-label={t('search.colDate')} className="muted small">{formatDate(r.created_at, lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={result.total}
            onChange={(p) => { setPageState({ key: filterKey, page: p }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          />
        </>
      )}
    </section>
  );
}
