import { useEffect } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { isDue } from './lib/srs';
import { AboutPage } from './pages/About';
import { AccountPage } from './pages/Account';
import { DeckEditorPage } from './pages/DeckEditor';
import { FlashcardsPage } from './pages/Flashcards';
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
          <NavLink to="/flashcards">Flashcards</NavLink>
          <NavLink to="/settings">Settings</NavLink>
          {sync.enabled && (
            <NavLink to="/account" title={sync.email ?? 'Log in'} className="nav__account">
              {/* On narrow screens only the icon shows; the label stays for screen readers. */}
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="nav__label">{sync.email ? 'Account' : 'Log in'}</span>
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
            <Route path="/flashcards" element={<FlashcardsPage />} />
            <Route path="/flashcards/decks/new" element={<DeckEditorPage />} />
            <Route path="/flashcards/decks/:deckId" element={<DeckEditorPage />} />
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
