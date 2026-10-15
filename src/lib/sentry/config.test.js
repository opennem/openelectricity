import { describe, expect, it } from 'vitest';
import {
	IGNORED_ERRORS,
	replaySessionSampleRate,
	reportsErrors,
	resolveSentryDsn
} from './config.js';

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

describe('replaySessionSampleRate', () => {
	it('records every development session and 1% elsewhere', () => {
		expect(replaySessionSampleRate('development')).toBe(1);
		expect(replaySessionSampleRate('production')).toBe(0.01);
		expect(replaySessionSampleRate('preview')).toBe(0.01);
	});
});

describe('IGNORED_ERRORS', () => {
	/** @param {string} message */
	const ignored = (message) => IGNORED_ERRORS.some((pattern) => pattern.test(message));

	it('drops old-build, navigation and connection noise seen in production', () => {
		for (const message of [
			'TypeError: Failed to fetch dynamically imported module: https://openelectricity.org.au/_app/immutable/nodes/1.DEuIuSnq.js',
			'Error: Unable to preload CSS for https://openelectricity.org.au/_app/immutable/assets/Footer.xbaq3Lvl.css',
			"SyntaxError: Importing module './BJNHJbZY.js' is not found.",
			'TypeError: Importing a module script failed.',
			'Error: navigation aborted',
			'InvalidStateError: Transition was aborted because of invalid state. Document hidden',
			'InvalidStateError: View transition was skipped because document visibility state is hidden.',
			'TypeError: Failed to fetch',
			'Failed to fetch (openelectricity.org.au)',
			'TypeError: Load failed',
			'TypeError: NetworkError when attempting to fetch resource.',
			'Non-Error promise rejection captured with value: Object Not Found Matching Id:2, MethodName:update, ParamCount:4'
		]) {
			expect(ignored(message), message).toBe(true);
		}
	});

	it('keeps real faults', () => {
		for (const message of [
			'ReferenceError: structuredClone is not defined',
			"TypeError: Cannot read properties of undefined (reading '0')",
			'TypeError: Failed to fetch records: 500',
			'Error: navigation aborted while saving'
		]) {
			expect(ignored(message), message).toBe(false);
		}
	});
});

describe('reportsErrors', () => {
	const env = { PUBLIC_SENTRY_DSN: 'https://key@example.ingest.sentry.io/1' };

	it('reports wherever Sentry is on, except local development', () => {
		expect(reportsErrors(env, false)).toBe(true);
		expect(reportsErrors(env, true)).toBe(false);
		expect(reportsErrors({}, false)).toBe(false);
	});

	it('reports in development when asked to', () => {
		expect(reportsErrors({ ...env, PUBLIC_SENTRY_DEV: 'true' }, true)).toBe(true);
		expect(reportsErrors({ PUBLIC_SENTRY_DEV: 'true' }, true)).toBe(false);
	});
});
