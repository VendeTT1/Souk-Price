import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import fr from './locales/fr.json';
import ar from './locales/ar.json';

export const LANGS = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
];

function initialLang() {
  try {
    const saved = localStorage.getItem('lang');
    if (saved && LANGS.some((l) => l.code === saved)) return saved;
  } catch { /* ignore */ }
  const nav = (navigator.language || 'fr').slice(0, 2);
  return LANGS.some((l) => l.code === nav) ? nav : 'fr';
}

export function applyDirection(lang) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, fr: { translation: fr }, ar: { translation: ar } },
  lng: initialLang(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

applyDirection(i18n.language);

export function setLanguage(lang) {
  i18n.changeLanguage(lang);
  applyDirection(lang);
  try { localStorage.setItem('lang', lang); } catch { /* ignore */ }
}

export default i18n;
