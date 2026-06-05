import * as Sentry from "@sentry/nextjs";

// Only initializes when NEXT_PUBLIC_SENTRY_DSN is set — safe to deploy without it.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    // Replay captures 10% of sessions, 100% when an error occurs
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    integrations: [Sentry.replayIntegration()],
  });
}
