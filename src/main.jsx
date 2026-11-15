import React from 'react';
import { createRoot } from 'react-dom/client';
import './i18n';
import App from './App';
import './styles.css';
import { loadExtras } from './lib/extras';

// Add the admin-approved cities/products to the built-in lists first (but never wait more than 3 s).
Promise.race([loadExtras(), new Promise((resolve) => { setTimeout(resolve, 3000); })]).then(() => {
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
