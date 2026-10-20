const LOCALES = { en: 'en-US', fr: 'fr-MA', ar: 'ar-MA' };

export function formatPrice(value, lang) {
  // Latin digits everywhere so prices are easy to compare across languages
  return new Intl.NumberFormat(LOCALES[lang] === 'ar-MA' ? 'fr-MA' : LOCALES[lang], {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export function formatDate(iso, lang) {
  return new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-MA-u-nu-latn' : LOCALES[lang], {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}
