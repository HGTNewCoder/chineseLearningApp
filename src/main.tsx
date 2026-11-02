import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { initMonitoring } from './lib/monitoring';
import { ProgressProvider } from './state/ProgressContext';
import { SyncProvider } from './sync/SyncProvider';
import './styles/global.css';

initMonitoring();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ProgressProvider>
        <SyncProvider>
          <App />
        </SyncProvider>
      </ProgressProvider>
    </BrowserRouter>
  </StrictMode>,
);

// Offline support and "install app" (production only, so dev reloads stay fresh).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
