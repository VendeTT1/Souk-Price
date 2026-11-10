import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { store } from '../lib/store';
import { CATEGORIES, ITEMS, itemsByCategory, getItem } from '../data/catalog';
import { REGIONS, getCity, getProvince, MARKET_TYPES, SUPERMARKET_CHAINS } from '../data/locations';
import { cityOptions, provinceOptions } from '../lib/placeOptions';
import { fold } from '../lib/search';
import { RATING_EMOJI } from './Rating';
import SearchSelect from './SearchSelect';
import { formatPrice } from '../lib/format';

// A neighborhood that is not in the suggestion list of a city that HAS a list is held for review
// (set to false to let every typed neighborhood through, as before).
const HOLD_UNKNOWN_NEIGHBORHOODS = true;

const INITIAL = {
  region: '', city: '', neighborhood: '', marketType: '', marketName: '',
  category: '', item: '', price: '', unit: 'kg', rating: 0, comment: '', website: '', // website = honeypot
  // "not in the list" mode: the typed name is sent for review instead of being saved straight away
  cityOther: false, province: '', cityText: '',
  itemOther: false, itemText: '',
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
  const [status, setStatus] = useState('idle'); // idle | saving | done | error | rate_limit | duplicate
  const [heldDone, setHeldDone] = useState(false); // the last submission went to review
  const [typical, setTypical] = useState(null);  // { median_price, entries } of the chosen item

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const neighborhoods = getCity(f.city)?.neighborhoods ?? [];
  const cityOpts = useMemo(() => cityOptions(f.region, lang), [f.region, lang]);
  const provinceOpts = useMemo(() => provinceOptions(f.region, lang), [f.region, lang]);

  // Which typed values still have to be checked before they can enter the database?
  const typedNeighborhood = f.neighborhood.trim();
  const neighborhoodIsNew = HOLD_UNKNOWN_NEIGHBORHOODS && !f.cityOther && neighborhoods.length > 0 && !!typedNeighborhood
    && !neighborhoods.some((n) => fold(n) === fold(typedNeighborhood));
  const held = f.cityOther || f.itemOther || neighborhoodIsNew;

  // picking a city also fills the region
  const pickCity = (id) => {
    const c = getCity(id);
    setF((p) => ({ ...p, city: id, region: c ? c.region : p.region, neighborhood: '' }));
  };
  const pickProvince = (id) => {
    const pr = getProvince(id);
    setF((p) => ({ ...p, province: id, region: pr ? pr.region : p.region }));
  };
  const itemOptions = useMemo(
    () => (f.category ? itemsByCategory(f.category) : ITEMS)
      .map((it) => ({
        value: it.id,
        label: it.names[lang],
        keywords: `${it.names.en} ${it.names.fr} ${it.names.ar} ${it.id}`,
        group: it.category,
        groupLabel: t(`categories.${it.category}`),
      }))
      .sort((x, y) => CATEGORIES.indexOf(x.group) - CATEGORIES.indexOf(y.group)
        || x.label.localeCompare(y.label, lang)),
    [f.category, lang, t],
  );

  // picking a product also fills in its category and its usual unit
  const pickItem = (id) => {
    const it = getItem(id);
    setF((p) => ({ ...p, item: id, category: it ? it.category : p.category, unit: it?.unit ?? p.unit }));
  };

  // typical price of the chosen item, used for a gentle "are you sure?" hint
  useEffect(() => {
    let alive = true;
    setTypical(null);
    if (f.item) {
      store.getTypical(f.item, f.unit)
        .then((r) => alive && setTypical(r))
        .catch(() => {});
    }
    return () => { alive = false; };
  }, [f.item, f.unit]);

  const priceNum = Number(f.price);
  const looksOff = typical && typical.entries >= 5 && priceNum > 0
    && (priceNum > typical.median_price * 5 || priceNum < typical.median_price / 5);

  // price: digits and a single decimal separator only (accepts "," and converts it to ".")
  const onPrice = (e) => {
    let v = e.target.value.replace(',', '.').replace(/[^0-9.]/g, '');
    const [int, ...rest] = v.split('.');
    v = rest.length ? `${int}.${rest.join('').slice(0, 2)}` : int;
    set('price', v.slice(0, 8));
  };

  const validate = () => {
    const e = {};
    const required = ['region', 'neighborhood', 'marketType', 'marketName', 'category'];
    if (f.cityOther) required.push('province', 'cityText'); else required.push('city');
    if (f.itemOther) required.push('itemText'); else required.push('item');
    required.forEach((k) => {
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
      const entry = {
        region: f.region,
        city: f.cityOther ? null : f.city,
        neighborhood: f.neighborhood.trim(),
        market_type: f.marketType,
        market_name: f.marketName.trim(),
        category: f.category,
        item: f.itemOther ? null : f.item,
        price: Number(f.price),
        unit: f.unit,
        rating: f.rating,
        comment: f.comment.trim() || null,
      };
      if (held) {
        // The whole form waits in a review queue; it is turned into a normal price once the new names are checked.
        const custom = {};
        if (f.cityOther) custom.city = f.cityText.trim();
        if (f.itemOther) custom.item = f.itemText.trim();
        if (neighborhoodIsNew) custom.neighborhood = typedNeighborhood;
        await store.addPending({
          form_version: 1, lang, ...entry, province: f.cityOther ? f.province : (getCity(f.city)?.province ?? null), custom,
        });
      } else {
        await store.addPrice(entry);
      }
      setHeldDone(held);
      setStatus('done');
      onAdded?.();
    } catch (err) {
      // the database trigger answers with a short code in the message
      const msg = String(err?.message ?? '');
      if (msg.includes('rate_limit')) setStatus('rate_limit');
      else if (msg.includes('duplicate')) setStatus('duplicate');
      else setStatus('error');
    }
  };

  const reset = () => { setF(INITIAL); setErrors({}); setStatus('idle'); setHeldDone(false); };

  if (status === 'done') {
    return (
      <section className="thanks">
        <div className="big-emoji">🎉</div>
        <h2>{heldDone ? t('form.thanksHeld') : t('form.thanks')}</h2>
        {heldDone && <p className="muted">{t('form.thanksHeldText')}</p>}
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
          <select
            value={f.region}
            onChange={(e) => setF((p) => {
              const keepCity = p.city && getCity(p.city)?.region === e.target.value;
              const keepProv = p.province && getProvince(p.province)?.region === e.target.value;
              return { ...p, region: e.target.value, city: keepCity ? p.city : '', province: keepProv ? p.province : '', neighborhood: keepCity ? p.neighborhood : '' };
            })}
          >
            <option value="">{t('common.select')}</option>
            {REGIONS.map((r) => <option key={r.id} value={r.id}>{r.names[lang]}</option>)}
          </select>
        </Field>

        {!f.cityOther ? (
          <div className={`field ${errors.city ? 'has-error' : ''}`}>
            <label className="label" htmlFor="f-city">{t('form.city')}</label>
            <SearchSelect
              id="f-city" value={f.city} onChange={pickCity} options={cityOpts}
              placeholder={t('common.typeToSearch')} invalid={!!errors.city}
            />
            {errors.city && <span className="err">{errors.city}</span>}
            <button type="button" className="link-btn" onClick={() => setF((p) => ({ ...p, cityOther: true, city: '', neighborhood: '' }))}>
              {t('form.cityMissing')}
            </button>
          </div>
        ) : (
          <div className="suggest-box">
            <div className={`field ${errors.province ? 'has-error' : ''}`}>
              <label className="label" htmlFor="f-province">{t('form.province')}</label>
              <SearchSelect
                id="f-province" value={f.province} onChange={pickProvince} options={provinceOpts}
                placeholder={t('common.typeToSearch')} invalid={!!errors.province}
              />
              {errors.province && <span className="err">{errors.province}</span>}
            </div>
            <Field id="cityText" error={errors.cityText} label={t('form.cityName')} hint={t('form.reviewHint')}>
              <input value={f.cityText} maxLength={80} onChange={(e) => set('cityText', e.target.value)} />
            </Field>
            <button type="button" className="link-btn" onClick={() => setF((p) => ({ ...p, cityOther: false, province: '', cityText: '' }))}>
              {t('form.backToList')}
            </button>
          </div>
        )}

        <Field id="neighborhood" error={errors.neighborhood} label={t('form.neighborhood')} hint={neighborhoodIsNew ? undefined : t('form.neighborhoodHint')}>
          <input
            list="neighborhoods" value={f.neighborhood} maxLength={80} disabled={!f.city && !f.cityOther}
            onChange={(e) => set('neighborhood', e.target.value)}
          />
          <datalist id="neighborhoods">{neighborhoods.map((n) => <option key={n} value={n} />)}</datalist>
          {neighborhoodIsNew && !errors.neighborhood && <span className="hint review">{t('form.reviewHint')}</span>}
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
        {!f.itemOther ? (
          <div className={`field ${errors.item ? 'has-error' : ''}`}>
            <label className="label" htmlFor="f-item">{t('form.item')}</label>
            <SearchSelect
              id="f-item"
              value={f.item}
              onChange={pickItem}
              options={itemOptions}
              placeholder={t('common.typeToSearch')}
              invalid={!!errors.item}
            />
            {errors.item && <span className="err">{errors.item}</span>}
            <button type="button" className="link-btn" onClick={() => setF((p) => ({ ...p, itemOther: true, item: '' }))}>
              {t('form.itemMissing')}
            </button>
          </div>
        ) : (
          <div className="suggest-box">
            <Field id="itemText" error={errors.itemText} label={t('form.itemName')} hint={t('form.itemNameHint')}>
              <input value={f.itemText} maxLength={60} onChange={(e) => set('itemText', e.target.value)} />
            </Field>
            <p className="hint review">{t('form.reviewHint')}</p>
            <button type="button" className="link-btn" onClick={() => setF((p) => ({ ...p, itemOther: false, itemText: '' }))}>
              {t('form.backToList')}
            </button>
          </div>
        )}
        <div className="row">
          <Field id="price" error={errors.price} label={t('form.price')}>
            <input inputMode="decimal" autoComplete="off" placeholder="0.00" value={f.price} onChange={onPrice} />
            {looksOff && (
              <span className="warn" role="status">
                {t('form.looksOff', {
                  typical: formatPrice(typical.median_price, lang),
                  unit: f.unit === 'kg' ? t('common.perKg') : t('common.perUnit'),
                })}
              </span>
            )}
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
      {status === 'rate_limit' && <p className="error">{t('form.errRateLimit')}</p>}
      {status === 'duplicate' && <p className="error">{t('form.errDuplicate')}</p>}
      <button className="btn" type="submit" disabled={status === 'saving'}>
        {status === 'saving' ? t('common.loading') : t('form.submit')}
      </button>
    </form>
  );
}
