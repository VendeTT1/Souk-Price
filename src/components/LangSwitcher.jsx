import { useTranslation } from 'react-i18next';
import { LANGS, setLanguage } from '../i18n';

export default function LangSwitcher() {
  const { i18n } = useTranslation();
  return (
    <div className="lang" role="group" aria-label="Language">
      {LANGS.map((l) => (
        <button
          key={l.code}
          className={i18n.language === l.code ? 'active' : ''}
          onClick={() => setLanguage(l.code)}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
