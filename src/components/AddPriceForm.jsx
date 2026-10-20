import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { store } from '../lib/store';
import { CATEGORIES, itemsByCategory, getItem } from '../data/catalog';
import { REGIONS, citiesOfRegion, getCity, MARKET_TYPES, SUPERMARKET_CHAINS } from '../data/locations';
import { RATING_EMOJI } from './Rating';

const INITIAL = {
  region: '', city: '', neighborhood: '', marketType: '', marketName: '',
  category: '', item: '', price: '', unit: 'kg', rating: 0, comment: '', website: '', // website = honeypot
};

function Field({ id, label, hint, error, children }) {
  return (
    <label className={`field ${error ? 'has-error' : ''}`}>
      <span className="label">{label}</span>
      {children}
      {hint && !error && <span className="hint">{hint}</span>}
      {error && <span className="err">{error}</span>}
    </label>
  );
}

export default function AddPriceForm({ onAdded }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [f, setF] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | saving | done | error

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const cities = f.region ? citiesOfRegion(f.region) : [];
  const neighborhoods = getCity(f.city)?.neighborhoods ?? [];
  const items = useMemo(
    () => (f.category ? itemsByCategory(f.category).sort((a, b) => a.names[lang].localeCompare(b.names[lang], lang)) : []),
    [f.category, lang],
  );

  // price: digits and a single decimal separator only (accepts "," and converts it to ".")
  const onPrice = (e) => {
    let v = e.target.value.replace(',', '.').replace(/[^0-9.]/g, '');
    const [int, ...rest] = v.split('.');
    v = rest.length ? `${int}.${rest.join('').slice(0, 2)}` : int;
    set('price', v.slice(0, 8));
  };

  const validate = () => {
    const e = {};
    ['region', 'city', 'neighborhood', 'marketType', 'marketName', 'category', 'item'].forEach((k) => {
      if (!String(f[k]).trim()) e[k] = t('form.errRequired');
    });
    const p = Number(f.price);
    if (!f.price || !(p > 0)) e.price = t('form.errPrice');
    else if (p >= 10000) e.price = t('form.errMax');
    if (!f.rating) e.rating = t('form.errRequired');
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (f.website) return; // bot
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setStatus('saving');
    try {
      await store.addPrice({
        region: f.region,
        city: f.city,
        neighborhood: f.neighborhood.trim(),
        market_type: f.marketType,
        market_name: f.marketName.trim(),
        category: f.category,
        item: f.item,
        price: Number(f.price),
        unit: f.unit,
        rating: f.rating,
        comment: f.comment.trim() || null,
      });
      setStatus('done');
      onAdded?.();
    } catch {
      setStatus('error');
    }
  };

  const reset = () => { setF(INITIAL); setErrors({}); setStatus('idle'); };

  if (status === 'done') {
    return (
      <section className="thanks">
        <div className="big-emoji">🎉</div>
        <h2>{t('form.thanks')}</h2>
        <button className="btn" onClick={reset}>{t('form.another')}</button>
      </section>
    );
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      <h2>{t('form.title')}</h2>

      <fieldset>
        <legend>{t('form.location')}</legend>
        <Field id="region" error={errors.region} label={t('form.region')}>
          <select value={f.region} onChange={(e) => setF((p) => ({ ...p, region: e.target.value, city: '', neighborhood: '' }))}>
            <option value="">{t('common.select')}</option>
            {REGIONS.map((r) => <option key={r.id} value={r.id}>{r.names[lang]}</option>)}
          </select>
        </Field>
        <Field id="city" error={errors.city} label={t('form.city')}>
          <select value={f.city} disabled={!f.region} onChange={(e) => setF((p) => ({ ...p, city: e.target.value, neighborhood: '' }))}>
            <option value="">{t('common.select')}</option>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.names[lang]}</option>)}
          </select>
        </Field>
        <Field id="neighborhood" error={errors.neighborhood} label={t('form.neighborhood')} hint={t('form.neighborhoodHint')}>
          <input
            list="neighborhoods" value={f.neighborhood} maxLength={80} disabled={!f.city}
            onChange={(e) => set('neighborhood', e.target.value)}
          />
          <datalist id="neighborhoods">{neighborhoods.map((n) => <option key={n} value={n} />)}</datalist>
        </Field>
        <Field id="marketType" error={errors.marketType} label={t('form.marketType')}>
          <select value={f.marketType} onChange={(e) => setF((p) => ({ ...p, marketType: e.target.value, marketName: '' }))}>
            <option value="">{t('common.select')}</option>
            {MARKET_TYPES.map((m) => <option key={m} value={m}>{t(`marketTypes.${m}`)}</option>)}
          </select>
        </Field>
        <Field id="marketName" error={errors.marketName} label={t('form.marketName')} hint={t('form.marketNameHint')}>
          <input
            list="chains" value={f.marketName} maxLength={80} disabled={!f.marketType}
            onChange={(e) => set('marketName', e.target.value)}
          />
          <datalist id="chains">
            {f.marketType === 'supermarket' && SUPERMARKET_CHAINS.map((n) => <option key={n} value={n} />)}
          </datalist>
        </Field>
      </fieldset>

      <fieldset>
        <legend>{t('form.product')}</legend>
        <Field id="category" error={errors.category} label={t('form.category')}>
          <select
            value={f.category}
            onChange={(e) => setF((p) => ({ ...p, category: e.target.value, item: '' }))}
          >
            <option value="">{t('common.select')}</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{t(`categories.${c}`)}</option>)}
          </select>
        </Field>
        <Field id="item" error={errors.item} label={t('form.item')}>
          <select
            value={f.item} disabled={!f.category}
            onChange={(e) => setF((p) => ({ ...p, item: e.target.value, unit: getItem(e.target.value)?.unit ?? 'kg' }))}
          >
            <option value="">{t('common.select')}</option>
            {items.map((i) => <option key={i.id} value={i.id}>{i.names[lang]}</option>)}
          </select>
        </Field>
        <div className="row">
          <Field id="price" error={errors.price} label={t('form.price')}>
            <input inputMode="decimal" autoComplete="off" placeholder="0.00" value={f.price} onChange={onPrice} />
          </Field>
          <Field id="unit" error={errors.unit} label={t('form.unit')}>
            <select value={f.unit} onChange={(e) => set('unit', e.target.value)}>
              <option value="kg">{t('form.kg')}</option>
              <option value="unit">{t('form.unitPiece')}</option>
            </select>
          </Field>
        </div>
      </fieldset>

      <fieldset>
        <legend>{t('form.feedback')}</legend>
        <div className={`field ${errors.rating ? 'has-error' : ''}`}>
          <span className="label">{t('rating.label')}</span>
          <div className="rating-pick" role="radiogroup">
            {[1, 2, 3].map((n) => (
              <button
                type="button" key={n} role="radio" aria-checked={f.rating === n}
                className={`rate r${n} ${f.rating === n ? 'active' : ''}`}
                onClick={() => set('rating', n)}
              >
                <span className="emoji">{RATING_EMOJI[n]}</span>
                {t(`rating.${n}`)}
              </button>
            ))}
          </div>
          {errors.rating && <span className="err">{errors.rating}</span>}
        </div>
        <Field id="comment" error={errors.comment} label={t('form.comment')} hint={t('form.commentHint')}>
          <textarea rows={3} maxLength={500} value={f.comment} onChange={(e) => set('comment', e.target.value)} />
        </Field>
      </fieldset>

      {/* honeypot: hidden from humans, bots tend to fill it */}
      <input
        className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true"
        name="website" value={f.website} onChange={(e) => set('website', e.target.value)}
      />

      {status === 'error' && <p className="error">{t('common.error')}</p>}
      <button className="btn" type="submit" disabled={status === 'saving'}>
        {status === 'saving' ? t('common.loading') : t('form.submit')}
      </button>
    </form>
  );
}
