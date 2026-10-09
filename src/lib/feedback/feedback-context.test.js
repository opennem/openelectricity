import { describe, expect, it } from 'vitest';
import {
	applyFeedbackContext,
	buildFeedbackContext,
	feedbackEnvironment,
	resolveFeedbackDsn,
	floatingFeedbackMode
} from './feedback-context.js';

const DSN = 'https://public@o0.ingest.sentry.io/0';

describe('resolveFeedbackDsn', () => {
	it('needs both the DSN and the explicit switch', () => {
		expect(resolveFeedbackDsn({ PUBLIC_SENTRY_DSN: DSN, PUBLIC_FEEDBACK_ENABLED: 'true' })).toBe(
			DSN
		);
		expect(resolveFeedbackDsn({ PUBLIC_SENTRY_DSN: DSN })).toBeNull();
		expect(resolveFeedbackDsn({ PUBLIC_SENTRY_DSN: DSN, PUBLIC_FEEDBACK_ENABLED: 'false' })).toBe(
			null
		);
		expect(resolveFeedbackDsn({ PUBLIC_FEEDBACK_ENABLED: 'true' })).toBeNull();
	});

	it('treats a blank DSN as unset', () => {
		expect(resolveFeedbackDsn({ PUBLIC_SENTRY_DSN: '  ', PUBLIC_FEEDBACK_ENABLED: 'true' })).toBe(
			null
		);
	});
});

describe('feedbackEnvironment', () => {
	it.each([
		['localhost', 'development'],
		['openelectricity.localhost', 'development'],
		['dev.openelectricity.org.au', 'staging'],
		['abc123.opennem-app.pages.dev', 'preview'],
		['opennem-app.pages.dev', 'production'],
		['openelectricity.org.au', 'production']
	])('%s reports as %s', (hostname, environment) => {
		expect(feedbackEnvironment(hostname)).toBe(environment);
	});
});

describe('floatingFeedbackMode', () => {
	it.each(['/', '/about', '/analysis/some-article', '/records', '/facilities-explained'])(
		'labels the button on content page %s',
		(pathname) => expect(floatingFeedbackMode(pathname, false)).toBe('labelled')
	);

	it.each(['/tracker', '/tracker/timeline', '/tracker/compare'])(
		'shows a compact button on %s, windowed or fullscreen',
		(pathname) => {
			expect(floatingFeedbackMode(pathname, false)).toBe('compact');
			expect(floatingFeedbackMode(pathname, true)).toBe('compact');
		}
	);

	it.each(['/facilities', '/facility/ABC1', '/scenarios', '/studio'])(
		'leaves app page %s to its menu',
		(pathname) => {
			expect(floatingFeedbackMode(pathname, false)).toBeNull();
			expect(floatingFeedbackMode(pathname, true)).toBeNull();
		}
	);

	it('leaves other fullscreen views to their menu', () => {
		expect(floatingFeedbackMode('/about', true)).toBeNull();
	});
});

describe('buildFeedbackContext', () => {
	it('keeps allow-listed filters and drops everything else', () => {
		const context = buildFeedbackContext(
			'https://openelectricity.org.au/tracker?region=sa1&view=timeline&q=my+suburb&utm_source=x#top'
		);
		expect(context.path).toBe('/tracker');
		expect(context.filters).toEqual({ region: 'sa1', view: 'timeline' });
		expect(context.url).toBe('https://openelectricity.org.au/tracker?view=timeline&region=sa1');
	});

	it('joins repeated parameters', () => {
		const context = buildFeedbackContext(
			'https://openelectricity.org.au/facilities?statuses=operating&statuses=committed'
		);
		expect(context.filters).toEqual({ statuses: 'operating,committed' });
		expect(context.url).toBe(
			'https://openelectricity.org.au/facilities?statuses=operating&statuses=committed'
		);
	});

	it('gives a bare URL when nothing is allow-listed', () => {
		const context = buildFeedbackContext('https://openelectricity.org.au/about?token=secret');
		expect(context).toEqual({
			url: 'https://openelectricity.org.au/about',
			path: '/about',
			filters: {}
		});
	});
});

describe('applyFeedbackContext', () => {
	const context = buildFeedbackContext('https://openelectricity.org.au/tracker?region=nsw1');

	it('replaces the recorded URL and adds page context and tag', () => {
		/** @type {{ contexts: Record<string, any>, tags: Record<string, string> }} */
		const event = {
			contexts: {
				feedback: { message: 'Hi', url: 'https://openelectricity.org.au/tracker?q=private' }
			},
			tags: { existing: 'yes' }
		};
		applyFeedbackContext(event, context);
		expect(event.contexts.feedback).toEqual({
			message: 'Hi',
			url: 'https://openelectricity.org.au/tracker?region=nsw1'
		});
		expect(event.contexts.page).toEqual({ path: '/tracker', filters: { region: 'nsw1' } });
		expect(event.tags).toEqual({ existing: 'yes', page: '/tracker' });
	});

	it('leaves the event alone without a context', () => {
		const event = { contexts: { feedback: { url: 'x' } } };
		applyFeedbackContext(event, null);
		expect(event).toEqual({ contexts: { feedback: { url: 'x' } } });
	});
});
