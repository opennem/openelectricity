import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	isRenewablesEnvelopeFresh,
	FRESH_MS_CURRENT,
	FRESH_MS_LAGGING
} from './renewables-cache.server.js';

/**
 * @param {string} last
 * @returns {any} envelope whose payload ends at `last`
 */
const envelopeEndingAt = (last) => ({
	data: { marketStats: [{ id: 'x', history: { last, data: [1, 2, 3] } }] },
	error: null
});

describe('isRenewablesEnvelopeFresh', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		// Mid-July AEST — last complete month is June 2026
		vi.setSystemTime(new Date('2026-07-15T02:00:00Z'));
	});
	afterEach(() => vi.useRealTimers());

	const now = () => Date.now();
	const currentEnvelope = () => envelopeEndingAt('2026-06-01T00:00:00+10:00');
	const laggingEnvelope = () => envelopeEndingAt('2026-05-01T00:00:00+10:00');

	it('trusts a payload containing the last complete month for the long window', () => {
		expect(isRenewablesEnvelopeFresh(currentEnvelope(), now())).toBe(true);
		expect(isRenewablesEnvelopeFresh(currentEnvelope(), now() - FRESH_MS_CURRENT + 1000)).toBe(
			true
		);
		expect(isRenewablesEnvelopeFresh(currentEnvelope(), now() - FRESH_MS_CURRENT)).toBe(false);
	});

	it('gives a payload missing the newest month only the short window', () => {
		expect(isRenewablesEnvelopeFresh(laggingEnvelope(), now())).toBe(true);
		expect(isRenewablesEnvelopeFresh(laggingEnvelope(), now() - FRESH_MS_LAGGING + 1000)).toBe(
			true
		);
		expect(isRenewablesEnvelopeFresh(laggingEnvelope(), now() - FRESH_MS_LAGGING)).toBe(false);
	});

	it('re-evaluates freshness when the month rolls over, without a new store', () => {
		const storedAt = now();
		expect(isRenewablesEnvelopeFresh(currentEnvelope(), storedAt)).toBe(true);

		// 1 Aug AEST: July is now the last complete month, so the same cached
		// June-ending payload immediately drops to the short lagging window.
		vi.setSystemTime(new Date('2026-07-31T15:00:00Z'));
		expect(isRenewablesEnvelopeFresh(currentEnvelope(), storedAt)).toBe(false);
	});

	it('treats a payload ending beyond the last complete month as current', () => {
		expect(
			isRenewablesEnvelopeFresh(
				envelopeEndingAt('2026-07-01T00:00:00+10:00'),
				now() - FRESH_MS_LAGGING
			)
		).toBe(true);
	});

	it('treats empty or missing payloads as lagging', () => {
		expect(isRenewablesEnvelopeFresh({ data: { marketStats: [] }, error: null }, now())).toBe(true);
		expect(
			isRenewablesEnvelopeFresh(
				{ data: { marketStats: [] }, error: null },
				now() - FRESH_MS_LAGGING
			)
		).toBe(false);
		expect(isRenewablesEnvelopeFresh(null, now() - FRESH_MS_LAGGING)).toBe(false);
	});

	it('treats an unknown storedAt (0) as maximally stale', () => {
		expect(isRenewablesEnvelopeFresh(currentEnvelope(), 0)).toBe(false);
	});
});
