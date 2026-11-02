import { NavLink, Route, Routes } from 'react-router-dom';
import { isDue } from './lib/srs';
import { HomePage } from './pages/Home';
import { LessonPage } from './pages/Lesson';
import { LessonsPage } from './pages/Lessons';
import { PracticePage } from './pages/Practice';
import { SettingsPage } from './pages/Settings';
import { useProgress } from './state/ProgressContext';

export function App() {
  const { state } = useProgress();
  const now = Date.now();
  const due = Object.values(state.srs).filter((c) => isDue(c, now)).length;

  return (
    <div className="app">
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
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/lessons" element={<LessonsPage />} />
          <Route path="/lessons/:lessonId" element={<LessonPage />} />
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>
    </div>
  );
}
