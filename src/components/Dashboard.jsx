import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { store, MIN_ENTRIES } from '../lib/store';
import { CATEGORIES, itemName } from '../data/catalog';
import { formatPrice } from '../lib/format';
import { AvgRating } from './Rating';

export default function Dashboard({ version }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(false);
  const [cat, setCat] = useState('');

  useEffect(() => {
    let alive = true;
    setRows(null);
    setError(false);
    store.getSummary(MIN_ENTRIES)
      .then((r) => alive && setRows(r))
      .catch(() => alive && setError(true));
    return () => { alive = false; };
  }, [version]);

  const shown = rows ? rows.filter((r) => !cat || r.category === cat) : [];
  const unitLabel = (u) => (u === 'kg' ? t('common.perKg') : t('common.perUnit'));

  return (
    <section>
      <h2>{t('dashboard.title')}</h2>
      <p className="muted">{t('dashboard.subtitle')}</p>

      <div className="chips">
        <button className={`chip ${cat === '' ? 'active' : ''}`} onClick={() => setCat('')}>{t('common.all')}</button>
        {CATEGORIES.map((c) => (
          <button key={c} className={`chip ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>
            {t(`categories.${c}`)}
          </button>
        ))}
      </div>

      {error && <p className="error">{t('common.error')}</p>}
      {!rows && !error && <p className="muted">{t('common.loading')}</p>}
      {rows && shown.length === 0 && <p className="empty">{t('dashboard.empty', { min: MIN_ENTRIES })}</p>}

      <div className="cards">
        {shown.map((r) => (
          <article className="card" key={`${r.item}-${r.unit}`}>
            <div className="card-head">
              <span className="tag">{t(`categories.${r.category}`)}</span>
              <h3>{itemName(r.item, lang)}</h3>
            </div>
            <div className="big-price">
              {formatPrice(r.median_price ?? r.avg_price, lang)} <small>{t('common.dh')} {unitLabel(r.unit)}</small>
            </div>
            <div className="range muted">
              {t('dashboard.min')} {formatPrice(r.min_price, lang)} · {t('dashboard.max')} {formatPrice(r.max_price, lang)}
            </div>
            <div className="card-foot">
              <AvgRating value={r.avg_rating} />
              <span className="muted small">{t('dashboard.based', { count: r.entries, cities: r.cities })}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
