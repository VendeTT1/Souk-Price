import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import LangSwitcher from './components/LangSwitcher';
import Dashboard from './components/Dashboard';
import Search from './components/Search';
import AddPriceForm from './components/AddPriceForm';
import Admin from './components/Admin';
import { store } from './lib/store';
import { Analytics } from '@vercel/analytics/react';

const TABS = ['dashboard', 'search', 'add'];

export default function App() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('dashboard');
  // bump after a successful submit so the other tabs refetch
  const [version, setVersion] = useState(0);
  // the admin dashboard lives at /#/admin and is not linked from the menu
  const [isAdminRoute, setIsAdminRoute] = useState(window.location.hash === '#/admin');
  useEffect(() => {
    const onHash = () => setIsAdminRoute(window.location.hash === '#/admin');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (isAdminRoute) {
    return (
      <div className="app">
        <header className="header">
          <div className="brand"><h1>{t('app.title')} · admin</h1></div>
          <a href="#/" className="link-btn">← Back to the site</a>
        </header>
        <main><Admin /></main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <h1>{t('app.title')}</h1>
          <p>{t('app.tagline')}</p>
        </div>
        <LangSwitcher />
      </header>

      <nav className="tabs" role="tablist">
        {TABS.map((id) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            className={`tab ${tab === id ? 'active' : ''} ${id === 'add' ? 'primary' : ''}`}
            onClick={() => setTab(id)}
          >
            {t(`nav.${id}`)}
          </button>
        ))}
      </nav>

      {store.name === 'local' && <div className="banner">{t('dashboard.demo')}</div>}

      <main>
        {tab === 'dashboard' && <Dashboard version={version} onPickItem={() => setTab('search')} />}
        {tab === 'search' && <Search version={version} />}
        {tab === 'add' && <AddPriceForm onAdded={() => setVersion((v) => v + 1)} />}
      </main>

      <footer className="footer">{t('footer')}</footer>
      <Analytics />
    </div>
  );
}
