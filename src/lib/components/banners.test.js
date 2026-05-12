import { describe, it, expect } from 'vitest';
import {
	DEFAULT_DISMISSAL_MS,
	LEGACY_DISMISSAL_KEY,
	cleanupObsoleteDismissals,
	dismissalKey,
	getActiveBanner,
	isDismissed
} from './banners.js';

/**
 * Map-backed Storage stand-in. Implements just enough of the Storage interface
 * (`getItem`, `setItem`, `removeItem`, `length`, `key`) for the helpers.
 *
 * @param {Record<string, string>} [initial]
 */
function createFakeStorage(initial = {}) {
	/** @type {Map<string, string>} */
	const map = new Map(Object.entries(initial));
	return {
		getItem: (/** @type {string} */ k) => (map.has(k) ? /** @type {string} */ (map.get(k)) : null),
		setItem: (/** @type {string} */ k, /** @type {string} */ v) => map.set(k, v),
		removeItem: (/** @type {string} */ k) => {
			map.delete(k);
		},
		get length() {
			return map.size;
		},
		key: (/** @type {number} */ i) => Array.from(map.keys())[i] ?? null,
		clear: () => map.clear(),
		// expose underlying map for assertions
		_snapshot: () => Object.fromEntries(map)
	};
}

const NOW = 1_700_000_000_000;
const ONE_DAY = 24 * 60 * 60 * 1000;

describe('isDismissed', () => {
	const banner = { key: 'foo', enabled: true };

	it('returns false when nothing has been dismissed', () => {
		expect(isDismissed(banner, null, NOW)).toBe(false);
	});

	it('returns false for non-finite values (garbage in storage)', () => {
		expect(isDismissed(banner, NaN, NOW)).toBe(false);
		expect(isDismissed(banner, Infinity, NOW)).toBe(false);
	});

	it('returns true when dismissed inside the default 30-day window', () => {
		expect(isDismissed(banner, NOW - 5 * ONE_DAY, NOW)).toBe(true);
	});

	it('returns false when dismissed outside the default 30-day window', () => {
		expect(isDismissed(banner, NOW - 31 * ONE_DAY, NOW)).toBe(false);
	});

	it('honours a per-banner expiryMs override', () => {
		const shortLived = { key: 'foo', enabled: true, expiryMs: 60 * 1000 };
		expect(isDismissed(shortLived, NOW - 30 * 1000, NOW)).toBe(true);
		expect(isDismissed(shortLived, NOW - 2 * 60 * 1000, NOW)).toBe(false);
	});

	it('treats Infinity expiry as permanent dismissal', () => {
		const permanent = { key: 'foo', enabled: true, expiryMs: Infinity };
		expect(isDismissed(permanent, NOW - 365 * ONE_DAY, NOW)).toBe(true);
	});
});

describe('getActiveBanner', () => {
	it('returns null when there are no banners', () => {
		const storage = createFakeStorage();
		expect(getActiveBanner([], storage, NOW)).toBeNull();
	});

	it('returns null when no banners are enabled', () => {
		const storage = createFakeStorage();
		const banners = [
			{ key: 'a', enabled: false },
			{ key: 'b', enabled: false }
		];
		expect(getActiveBanner(banners, storage, NOW)).toBeNull();
	});

	it('skips disabled banners and picks the next enabled one', () => {
		const storage = createFakeStorage();
		const banners = [
			{ key: 'a', enabled: false },
			{ key: 'b', enabled: true },
			{ key: 'c', enabled: true }
		];
		expect(getActiveBanner(banners, storage, NOW)?.key).toBe('b');
	});

	it('skips banners that are currently dismissed and not yet expired', () => {
		const storage = createFakeStorage({
			[dismissalKey('a')]: String(NOW - ONE_DAY)
		});
		const banners = [
			{ key: 'a', enabled: true },
			{ key: 'b', enabled: true }
		];
		expect(getActiveBanner(banners, storage, NOW)?.key).toBe('b');
	});

	it('returns a banner whose dismissal has expired', () => {
		const storage = createFakeStorage({
			[dismissalKey('a')]: String(NOW - 60 * ONE_DAY)
		});
		const banners = [{ key: 'a', enabled: true }];
		expect(getActiveBanner(banners, storage, NOW)?.key).toBe('a');
	});

	it('returns the first eligible banner in declaration order', () => {
		const storage = createFakeStorage();
		const banners = [
			{ key: 'a', enabled: true },
			{ key: 'b', enabled: true }
		];
		expect(getActiveBanner(banners, storage, NOW)?.key).toBe('a');
	});

	it('tolerates garbage timestamps in storage', () => {
		const storage = createFakeStorage({
			[dismissalKey('a')]: 'not-a-number'
		});
		const banners = [{ key: 'a', enabled: true }];
		expect(getActiveBanner(banners, storage, NOW)?.key).toBe('a');
	});
});

describe('cleanupObsoleteDismissals', () => {
	it('removes the legacy bannerDismissedAt key', () => {
		const storage = createFakeStorage({
			[LEGACY_DISMISSAL_KEY]: String(NOW - ONE_DAY)
		});
		cleanupObsoleteDismissals([], storage);
		expect(storage.getItem(LEGACY_DISMISSAL_KEY)).toBeNull();
	});

	it('removes namespaced keys whose banner is no longer configured', () => {
		const storage = createFakeStorage({
			[dismissalKey('old')]: String(NOW - ONE_DAY),
			[dismissalKey('current')]: String(NOW - ONE_DAY)
		});
		cleanupObsoleteDismissals([{ key: 'current', enabled: true }], storage);
		expect(storage.getItem(dismissalKey('old'))).toBeNull();
		expect(storage.getItem(dismissalKey('current'))).not.toBeNull();
	});

	it('removes namespaced keys for banners that have been disabled', () => {
		const storage = createFakeStorage({
			[dismissalKey('off')]: String(NOW - ONE_DAY)
		});
		cleanupObsoleteDismissals([{ key: 'off', enabled: false }], storage);
		expect(storage.getItem(dismissalKey('off'))).toBeNull();
	});

	it('leaves unrelated localStorage keys alone', () => {
		const storage = createFakeStorage({
			'theme:active': 'dark',
			[LEGACY_DISMISSAL_KEY]: String(NOW),
			[dismissalKey('keep')]: String(NOW)
		});
		cleanupObsoleteDismissals([{ key: 'keep', enabled: true }], storage);
		expect(storage._snapshot()).toEqual({
			'theme:active': 'dark',
			[dismissalKey('keep')]: String(NOW)
		});
	});

	it('uses the default dismissal window when expiryMs is omitted', () => {
		// Sanity check: DEFAULT_DISMISSAL_MS is 30 days
		expect(DEFAULT_DISMISSAL_MS).toBe(30 * ONE_DAY);
	});
});
