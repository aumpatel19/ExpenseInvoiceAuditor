import * as Sentry from "@sentry/nextjs";

// Only initializes when NEXT_PUBLIC_SENTRY_DSN is set — safe to deploy without it.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}
