// Optional production monitoring, switched on by environment variables:
//   VITE_SENTRY_DSN        error reporting (Sentry)
//   VITE_PLAUSIBLE_DOMAIN  privacy-friendly page analytics (Plausible, no cookies)

type Sentry = typeof import('@sentry/react');

let sentry: Sentry | null = null;

export async function initMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (dsn) {
    sentry = await import('@sentry/react');
    sentry.init({ dsn, environment: import.meta.env.MODE });
  }

  const domain = import.meta.env.VITE_PLAUSIBLE_DOMAIN;
  if (domain) {
    const script = document.createElement('script');
    script.defer = true;
    script.dataset.domain = domain;
    script.src = 'https://plausible.io/js/script.js';
    document.head.appendChild(script);
  }
}

export function reportError(error: unknown) {
  if (sentry) sentry.captureException(error);
  else console.error(error);
}
