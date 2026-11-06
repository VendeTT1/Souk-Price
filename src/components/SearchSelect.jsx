import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { rankOptions } from '../lib/search';

/**
 * Searchable single-select (ARIA combobox). Works with touch, keyboard and RTL.
 *
 * options: [{ value, label, keywords?, group?, groupLabel? }]
 *   - keywords: extra text that is searchable but not displayed (other languages, ids...)
 *   - group/groupLabel: options with the same group are listed under a heading when nothing is typed
 * value: the selected option value ('' = nothing)
 */
export default function SearchSelect({
  id, value, onChange, options, placeholder, disabled = false, clearable = false, invalid = false,
}) {
  const { t } = useTranslation();
  const autoId = useId();
  const baseId = id || autoId;
  const listId = `${baseId}-list`;

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(null); // null = the user is not typing: show the selected label
  const [active, setActive] = useState(0);

  const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);

  // Rows to render: group headings (only without a query) + options.
  const { rows, selectable } = useMemo(() => {
    const typed = query !== null && query.trim() !== '';
    const list = rankOptions(options, typed ? query : '');
    const out = [];
    const sel = [];
    let lastGroup;
    list.forEach((opt) => {
      if (!typed && opt.group && opt.group !== lastGroup) {
        out.push({ type: 'group', key: `g-${opt.group}`, label: opt.groupLabel ?? opt.group });
      }
      lastGroup = opt.group;
      sel.push(out.length);
      out.push({ type: 'option', key: `o-${opt.value}`, opt });
    });
    return { rows: out, selectable: sel };
  }, [options, query]);

  // keep the highlighted row valid and visible
  useEffect(() => { setActive(0); }, [query, open]);
  useEffect(() => {
    if (!open) return;
    const row = selectable[active];
    const el = row === undefined ? null : listRef.current?.children[row];
    el?.scrollIntoView?.({ block: 'nearest' });
  }, [active, open, selectable]);

  // opening: start on the selected option so the list is already positioned on it
  useEffect(() => {
    if (open && query === null && selected) {
      const idx = selectable.findIndex((r) => rows[r].opt.value === selected.value);
      if (idx >= 0) setActive(idx);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = () => { setOpen(false); setQuery(null); };

  const choose = (opt) => {
    onChange(opt ? opt.value : '');
    close();
  };

  const onKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      if (!selectable.length) return;
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((a) => (a + step + selectable.length) % selectable.length);
    } else if (e.key === 'Home' && open) {
      e.preventDefault(); setActive(0);
    } else if (e.key === 'End' && open) {
      e.preventDefault(); setActive(Math.max(0, selectable.length - 1));
    } else if (e.key === 'Enter') {
      if (open) {
        e.preventDefault();
        const row = rows[selectable[active]];
        if (row) choose(row.opt);
      }
    } else if (e.key === 'Escape') {
      if (open) { e.preventDefault(); close(); }
    } else if (e.key === 'Tab') {
      close();
    }
  };

  const shown = open && query !== null ? query : (selected?.label ?? '');
  const activeRow = open ? rows[selectable[active]] : undefined;

  return (
    <div className={`picker ${invalid ? 'invalid' : ''}`}>
      <input
        ref={inputRef}
        id={baseId}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeRow ? `${baseId}-opt-${activeRow.opt.value}` : undefined}
        aria-invalid={invalid || undefined}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="search"
        disabled={disabled}
        placeholder={placeholder}
        value={shown}
        onFocus={(e) => { setOpen(true); e.target.select(); }}
        onClick={() => setOpen(true)}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onBlur={close}
        onKeyDown={onKeyDown}
      />
      {clearable && value && !disabled && (
        <button
          type="button"
          className="picker-clear"
          aria-label={t('common.clear')}
          // mousedown would blur the input first and close the list before the click lands
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { onChange(''); close(); inputRef.current?.focus(); }}
        >
          ×
        </button>
      )}
      {open && !disabled && (
        <ul
          id={listId}
          ref={listRef}
          className="picker-list"
          role="listbox"
          onMouseDown={(e) => e.preventDefault()} // keep focus in the input while tapping an option
        >
          {rows.length === 0 && <li className="picker-empty" role="presentation">{t('common.noMatch')}</li>}
          {rows.map((row, r) => (row.type === 'group' ? (
            <li key={row.key} className="picker-group" role="presentation">{row.label}</li>
          ) : (
            <li
              key={row.key}
              id={`${baseId}-opt-${row.opt.value}`}
              role="option"
              aria-selected={row.opt.value === value}
              className={`picker-opt ${selectable[active] === r ? 'active' : ''} ${row.opt.value === value ? 'selected' : ''}`}
              onMouseMove={() => setActive(selectable.indexOf(r))}
              onClick={() => choose(row.opt)}
            >
              <span>{row.opt.label}</span>
              {query !== null && query.trim() !== '' && row.opt.groupLabel && (
                <small className="muted">{row.opt.groupLabel}</small>
              )}
            </li>
          )))}
        </ul>
      )}
    </div>
  );
}
