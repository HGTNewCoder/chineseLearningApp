import { useEffect } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { isDue } from './lib/srs';
import { AboutPage } from './pages/About';
import { AccountPage } from './pages/Account';
import { HomePage } from './pages/Home';
import { LessonPage } from './pages/Lesson';
import { LessonsPage } from './pages/Lessons';
import { PracticePage } from './pages/Practice';
import { SettingsPage } from './pages/Settings';
import { useProgress } from './state/ProgressContext';
import { useSync } from './sync/SyncProvider';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function App() {
  const { state } = useProgress();
  const sync = useSync();
  const now = Date.now();
  const due = Object.values(state.srs).filter((c) => isDue(c, now)).length;

  return (
    <div className="app">
      <ScrollToTop />
      <header className="topbar">
        <NavLink to="/" className="brand" end>
          <span lang="zh-Hans" aria-hidden="true">
            字
          </span>{' '}
          Hanzi Trainer
        </NavLink>
        <nav className="nav">
          <NavLink to="/lessons">Lessons</NavLink>
          <NavLink to="/practice">
            Practice{due > 0 && <span className="badge">{due}</span>}
          </NavLink>
          <NavLink to="/settings">Settings</NavLink>
          {sync.enabled && (
            <NavLink to="/account" title={sync.email ?? 'Sign in'}>
              {sync.email ? 'Account' : 'Sign in'}
            </NavLink>
          )}
        </nav>
      </header>
      <main>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/lessons" element={<LessonsPage />} />
            <Route path="/lessons/:lessonId" element={<LessonPage />} />
            <Route path="/practice" element={<PracticePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="*" element={<HomePage />} />
          </Routes>
        </ErrorBoundary>
      </main>
      <footer className="footer">
        <Link to="/about">About &amp; credits</Link>
      </footer>
    </div>
  );
}
