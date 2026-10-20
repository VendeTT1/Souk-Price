import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import LangSwitcher from './components/LangSwitcher';
import Dashboard from './components/Dashboard';
import Search from './components/Search';
import AddPriceForm from './components/AddPriceForm';
import { store } from './lib/store';

const TABS = ['dashboard', 'search', 'add'];

export default function App() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('dashboard');
  // bump after a successful submit so the other tabs refetch
  const [version, setVersion] = useState(0);

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
    </div>
  );
}
