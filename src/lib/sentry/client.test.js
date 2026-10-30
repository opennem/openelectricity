import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('$app/environment', () => ({ browser: true, dev: false, version: '1.0.0' }));
vi.mock('$env/dynamic/public', () => ({
	env: { PUBLIC_SENTRY_DSN: 'https://public@o0.ingest.sentry.io/0' }
}));
const sdk = vi.hoisted(() => ({
	init: vi.fn(),
	captureException: vi.fn(),
	replayIntegration: vi.fn()
}));
vi.mock('./sdk.js', () => sdk);

const { captureError, loadSentry } = await import('./client.js');

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('captureError', () => {
	it('skips null and undefined errors, queued or live', async () => {
		vi.stubGlobal('window', { location: { hostname: 'openelectricity.org.au' } });
		const early = new Error('early');
		captureError(null);
		captureError(early);
		await loadSentry();
		const late = new Error('late');
		captureError(undefined);
		captureError(late);
		await loadSentry();

		expect(sdk.captureException.mock.calls).toEqual([[early], [late]]);
	});
});
