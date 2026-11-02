import { Component, type ReactNode } from 'react';
import { reportError } from '../lib/monitoring';

interface State {
  failed: boolean;
}

/** Shows a recovery screen instead of a blank page when rendering crashes. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    reportError(error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section className="page empty-state">
        <h1>Something went wrong</h1>
        <p className="muted">Your progress is saved. Reloading usually fixes this.</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          Reload
        </button>
      </section>
    );
  }
}
