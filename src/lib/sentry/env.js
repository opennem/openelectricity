import { PUBLIC_FEEDBACK_ENABLED, PUBLIC_SENTRY_DEV, PUBLIC_SENTRY_DSN } from '$app/env/public';

/**
 * The Sentry and feedback switches, as the record `config.js` and
 * `feedback-context.js` take. Declared in `src/env.js`.
 * @type {Record<string, string | undefined>}
 */
export const sentryEnv = { PUBLIC_SENTRY_DSN, PUBLIC_SENTRY_DEV, PUBLIC_FEEDBACK_ENABLED };
