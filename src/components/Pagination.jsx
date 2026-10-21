import { useTranslation } from 'react-i18next';

// Compact page list: 1 … 4 5 6 … 20
function pageList(page, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((n) => set.add(n));
  if (page >= total - 2) [total - 1, total - 2, total - 3].forEach((n) => set.add(n));
  const nums = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out = [];
  nums.forEach((n, i) => {
    if (i && n - nums[i - 1] > 1) out.push('gap-' + n);
    out.push(n);
  });
  return out;
}

export default function Pagination({ page, pageSize, total, onChange }) {
  const { t } = useTranslation();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <nav className="pager" aria-label="Pagination">
      <span className="pager-info muted small">
        {t('common.range', { from, to, total })}
      </span>
      <div className="pager-buttons">
        <button disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label={t('common.prev')}>
          <span className="arrow">‹</span>
        </button>
        {pageList(page, pages).map((p) =>
          typeof p === 'string' ? (
            <span key={p} className="gap">…</span>
          ) : (
            <button
              key={p}
              className={p === page ? 'active' : ''}
              aria-current={p === page ? 'page' : undefined}
              onClick={() => onChange(p)}
            >
              {p}
            </button>
          ),
        )}
        <button disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label={t('common.next')}>
          <span className="arrow">›</span>
        </button>
      </div>
    </nav>
  );
}
