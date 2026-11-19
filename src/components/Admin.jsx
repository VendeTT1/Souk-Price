import { useCallback, useEffect, useMemo, useState } from 'react';
import { CATEGORIES, ITEMS, getItem } from '../data/catalog';
import { getCity, getProvince, getRegion } from '../data/locations';
import { slug } from '../data/location-build';
import { cityOptions } from '../lib/placeOptions';
import { loadExtras } from '../lib/extras';
import * as api from '../lib/adminApi';
import SearchSelect from './SearchSelect';

// The admin page is in English only: it is for the site owner, not for visitors.
const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const itemOptions = () => ITEMS.map((it) => ({
  value: it.id, label: it.names.en, keywords: `${it.names.fr} ${it.names.ar} ${it.id}`, group: it.category, groupLabel: it.category,
})).sort((a, b) => CATEGORIES.indexOf(a.group) - CATEGORIES.indexOf(b.group) || a.label.localeCompare(b.label));

const errorText = (e) => {
  const m = String(e?.message ?? e);
  if (m.includes('not_admin')) return 'This account is not an admin.';
  if (m.includes('not_found')) return 'This submission was already handled. Refresh the list.';
  if (m.includes('duplicate key')) return 'That id is already used by another city or product. Pick another id or match the existing one.';
  return m;
};

function NameFields({ value, onChange, idLabel }) {
  const id = value.id ?? slug(value.en);
  return (
    <div className="admin-names">
      <label className="field"><span className="label">English</span>
        <input value={value.en} maxLength={80} onChange={(e) => onChange({ ...value, en: e.target.value })} /></label>
      <label className="field"><span className="label">Français</span>
        <input value={value.fr} maxLength={80} onChange={(e) => onChange({ ...value, fr: e.target.value })} /></label>
      <label className="field"><span className="label">العربية</span>
        <input dir="rtl" value={value.ar} maxLength={80} onChange={(e) => onChange({ ...value, ar: e.target.value })} /></label>
      <label className="field"><span className="label">{idLabel} (never changes later)</span>
        <input value={id} maxLength={60} onChange={(e) => onChange({ ...value, id: e.target.value.toLowerCase() })} /></label>
    </div>
  );
}

function Resolve({ title, typed, mode, setMode, match, setMatch, options, children }) {
  return (
    <div className="admin-resolve">
      <div className="admin-resolve-head">
        <span className="badge-new">Needs checking</span> {title}: <strong>“{typed}”</strong>
      </div>
      <div className="admin-modes" role="radiogroup">
        <button type="button" role="radio" aria-checked={mode === 'new'} className={`chip ${mode === 'new' ? 'on' : ''}`} onClick={() => setMode('new')}>It is new: create it</button>
        <button type="button" role="radio" aria-checked={mode === 'existing'} className={`chip ${mode === 'existing' ? 'on' : ''}`} onClick={() => setMode('existing')}>It is a typo of an existing one</button>
      </div>
      {mode === 'new' ? children : (
        <SearchSelect id={`m-${title}-${typed}`} value={match} onChange={setMatch} options={options} placeholder="Search the existing list…" />
      )}
    </div>
  );
}

function PendingCard({ row, version, onDone }) {
  const p = row.payload;
  const custom = p.custom ?? {};
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const [unit, setUnit] = useState(p.unit);
  const [neighborhood, setNeighborhood] = useState(custom.neighborhood ?? p.neighborhood ?? '');

  const [cityMode, setCityMode] = useState('new');
  const [cityMatch, setCityMatch] = useState('');
  const [cityNew, setCityNew] = useState({ en: custom.city ?? '', fr: '', ar: '', id: null });
  const [itemMode, setItemMode] = useState('new');
  const [itemMatch, setItemMatch] = useState('');
  const [itemNew, setItemNew] = useState({ en: custom.item ?? '', fr: '', ar: '', id: null });
  const [category, setCategory] = useState(p.category);

  // `version` changes after the lists were refreshed (a previous approval may have created a city/product)
  const cityOpts = useMemo(() => cityOptions('', 'en'), [version]); // eslint-disable-line react-hooks/exhaustive-deps
  const itemOpts = useMemo(() => itemOptions(), [version]); // eslint-disable-line react-hooks/exhaustive-deps

  const province = getProvince(p.province);
  const place = p.city ? getCity(p.city)?.names.en ?? p.city : `${custom.city} (new)`;

  const approve = async () => {
    setErr('');
    const args = { p_id: row.id, p_action: 'approve', p_note: note.trim() || null, p_neighborhood: neighborhood.trim(), p_unit: unit };

    if (custom.city) {
      if (cityMode === 'existing') {
        const c = getCity(cityMatch);
        if (!c) return setErr('Choose the existing city.');
        args.p_city = c.id; args.p_region = c.region;
      } else {
        const id = cityNew.id ?? slug(cityNew.en);
        if (!cityNew.en.trim()) return setErr('The city needs an English name.');
        if (!ID_RE.test(id)) return setErr('City id: lowercase letters, digits and dashes only.');
        if (getCity(id)) return setErr(`City id "${id}" already exists: match it instead, or choose another id.`);
        if (!province) return setErr('This submission has no valid province.');
        args.p_new_city = { id, region: province.region, province: province.id, name_en: cityNew.en.trim(), name_fr: cityNew.fr.trim(), name_ar: cityNew.ar.trim() };
      }
    }
    if (custom.item) {
      if (itemMode === 'existing') {
        const it = getItem(itemMatch);
        if (!it) return setErr('Choose the existing product.');
        args.p_item = it.id; args.p_category = it.category;
      } else {
        const id = itemNew.id ?? slug(itemNew.en);
        if (!itemNew.en.trim()) return setErr('The product needs an English name.');
        if (!ID_RE.test(id)) return setErr('Product id: lowercase letters, digits and dashes only.');
        if (getItem(id)) return setErr(`Product id "${id}" already exists: match it instead, or choose another id.`);
        args.p_new_item = { id, category, unit, name_en: itemNew.en.trim(), name_fr: itemNew.fr.trim(), name_ar: itemNew.ar.trim() };
      }
    }
    if (!neighborhood.trim()) return setErr('The neighborhood is empty.');

    setBusy('approve');
    try {
      await api.review(args);
      onDone(row.id, Boolean(args.p_new_city || args.p_new_item));
    } catch (e) { setErr(errorText(e)); setBusy(''); }
  };

  const reject = async () => {
    setErr(''); setBusy('reject');
    try {
      await api.review({ p_id: row.id, p_action: 'reject', p_note: note.trim() || null });
      onDone(row.id, false);
    } catch (e) { setErr(errorText(e)); setBusy(''); }
  };

  return (
    <article className="admin-card">
      <header className="admin-card-head">
        <strong>{custom.item ?? getItem(p.item)?.names.en ?? p.item}</strong>
        <span className="admin-price">{p.price} MAD / {p.unit === 'kg' ? 'kg' : 'unit'}</span>
        <time className="muted small">{new Date(row.created_at).toLocaleString()}</time>
      </header>
      <dl className="admin-kv">
        <dt>Place</dt><dd>{place} · {province?.names.en ?? p.province} · {getRegion(p.region)?.names.en ?? p.region}</dd>
        <dt>Neighborhood</dt><dd>{p.neighborhood}</dd>
        <dt>Market</dt><dd>{p.market_name} ({p.market_type})</dd>
        <dt>Category</dt><dd>{p.category}</dd>
        <dt>Rating</dt><dd>{['', 'bad', 'neutral', 'good'][p.rating] ?? p.rating}</dd>
        {p.comment && (<><dt>Comment</dt><dd>{p.comment}</dd></>)}
      </dl>

      {custom.city && (
        <Resolve title="City" typed={custom.city} mode={cityMode} setMode={setCityMode} match={cityMatch} setMatch={setCityMatch} options={cityOpts}>
          <NameFields value={cityNew} onChange={setCityNew} idLabel="Id" />
          <p className="hint">It will be added under {province?.names.en ?? '?'}. Empty French/Arabic names fall back to the English one.</p>
        </Resolve>
      )}
      {custom.item && (
        <Resolve title="Product" typed={custom.item} mode={itemMode} setMode={setItemMode} match={itemMatch} setMatch={setItemMatch} options={itemOpts}>
          <NameFields value={itemNew} onChange={setItemNew} idLabel="Id" />
          <label className="field"><span className="label">Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select></label>
        </Resolve>
      )}

      <div className="admin-edit">
        <label className="field"><span className="label">Neighborhood{custom.neighborhood ? ' (new: fix any typo)' : ''}</span>
          <input value={neighborhood} maxLength={80} onChange={(e) => setNeighborhood(e.target.value)} /></label>
        <label className="field"><span className="label">Unit</span>
          <select value={unit} onChange={(e) => setUnit(e.target.value)}>
            <option value="kg">per kg</option><option value="unit">per unit</option>
          </select></label>
        <label className="field"><span className="label">Note (optional)</span>
          <input value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} /></label>
      </div>

      {err && <p className="error" role="alert">{err}</p>}
      <div className="admin-actions">
        <button type="button" className="btn" disabled={!!busy} onClick={approve}>{busy === 'approve' ? 'Saving…' : 'Approve'}</button>
        <button type="button" className="btn danger" disabled={!!busy} onClick={reject}>{busy === 'reject' ? 'Saving…' : 'Reject'}</button>
      </div>
    </article>
  );
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    const { error } = await api.signIn(email.trim(), password);
    if (error) setErr('Wrong email or password.');
    setBusy(false);
  };
  return (
    <form className="form" onSubmit={submit}>
      <h2>Admin sign-in</h2>
      <label className="field"><span className="label">Email</span>
        <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
      <label className="field"><span className="label">Password</span>
        <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
      {err && <p className="error" role="alert">{err}</p>}
      <button className="btn" type="submit" disabled={busy}>{busy ? '…' : 'Sign in'}</button>
    </form>
  );
}

export default function Admin() {
  const [session, setSession] = useState(undefined); // undefined = still checking
  const [isAdmin, setIsAdmin] = useState(null);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!api.adminAvailable) return undefined;
    api.getSession().then(setSession);
    const sub = api.onAuthChange(setSession);
    return () => sub.unsubscribe();
  }, []);

  const refresh = useCallback(async () => {
    setError('');
    try {
      const ok = await api.amIAdmin();
      setIsAdmin(ok);
      setRows(ok ? await api.listPending() : []);
    } catch (e) { setError(errorText(e)); }
  }, []);

  useEffect(() => {
    if (session) refresh(); else { setIsAdmin(null); setRows(null); }
  }, [session, refresh]);

  const done = async (id, created) => {
    setRows((r) => r.filter((x) => x.id !== id));
    if (created) { await loadExtras(); setVersion((v) => v + 1); } // later cards can now match the new city/product
  };

  if (!api.adminAvailable) return <p className="banner">The admin dashboard needs the Supabase backend (demo mode has none).</p>;
  if (session === undefined) return <p className="muted">Loading…</p>;
  if (!session) return <Login />;

  return (
    <section className="admin">
      <div className="admin-bar">
        <h2>Pending submissions {rows ? `(${rows.length})` : ''}</h2>
        <div>
          <button type="button" className="btn ghost" onClick={refresh}>Refresh</button>{' '}
          <button type="button" className="btn ghost" onClick={() => api.signOut()}>Sign out</button>
        </div>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {isAdmin === false && (
        <p className="error" role="alert">
          You are signed in as {session.user.email}, but this account is not an admin yet. See the README (“Admin dashboard”).
        </p>
      )}
      {isAdmin && rows?.length === 0 && <p className="muted">Nothing to review. 🎉</p>}
      {isAdmin && rows?.map((r) => <PendingCard key={r.id} row={r} version={version} onDone={done} />)}
    </section>
  );
}
