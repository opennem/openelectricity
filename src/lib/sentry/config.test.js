import { describe, expect, it } from 'vitest';
import { replaySessionSampleRate, resolveSentryDsn, sentryEnvironment } from './config.js';

const DSN = 'https://public@o0.ingest.sentry.io/0';

describe('resolveSentryDsn', () => {
	it('turns Sentry on with a DSN alone', () => {
		expect(resolveSentryDsn({ PUBLIC_SENTRY_DSN: DSN })).toBe(DSN);
	});

	it('treats a missing or blank DSN as off', () => {
		expect(resolveSentryDsn({})).toBeNull();
		expect(resolveSentryDsn({ PUBLIC_SENTRY_DSN: '  ' })).toBeNull();
	});
});

describe('sentryEnvironment', () => {
	it.each([
		['localhost', 'development'],
		['openelectricity.localhost', 'development'],
		['dev.openelectricity.org.au', 'staging'],
		['abc123.opennem-app.pages.dev', 'preview'],
		['opennem-app.pages.dev', 'production'],
		['openelectricity.org.au', 'production']
	])('%s reports as %s', (hostname, environment) => {
		expect(sentryEnvironment(hostname)).toBe(environment);
	});
});

describe('replaySessionSampleRate', () => {
	it('records every development session and 1% elsewhere', () => {
		expect(replaySessionSampleRate('development')).toBe(1);
		expect(replaySessionSampleRate('production')).toBe(0.01);
		expect(replaySessionSampleRate('preview')).toBe(0.01);
	});
});
