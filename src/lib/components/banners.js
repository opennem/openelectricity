/**
 * Pure helpers for the global banner system. The Svelte component
 * (`GlobalBanner.svelte`) pairs each entry's meta with a snippet for the
 * inner markup; these helpers only operate on the meta fields so they stay
 * trivially unit-testable with a fake Storage and an injected `now`.
 *
 * Dismissals are persisted per banner key as `banner:dismissed:<key>` →
 * timestamp. The legacy single-banner key `bannerDismissedAt` is swept on
 * every mount so it doesn't sit forever in users' localStorage.
 *
 * @typedef {Object} BannerMeta
 * @property {string} key
 * @property {boolean} enabled
 * @property {number} [expiryMs] - How long a dismissal lasts before the banner re-shows. Defaults to `DEFAULT_DISMISSAL_MS`. Set to `Infinity` for a permanent dismissal.
 */

export const DEFAULT_DISMISSAL_MS = 30 * 24 * 60 * 60 * 1000;
export const LEGACY_DISMISSAL_KEY = 'bannerDismissedAt';
export const DISMISSAL_KEY_PREFIX = 'banner:dismissed:';

/**
 * @param {string} bannerKey
 * @returns {string}
 */
export function dismissalKey(bannerKey) {
	return DISMISSAL_KEY_PREFIX + bannerKey;
}

/**
 * @param {BannerMeta} banner
 * @param {number | null} dismissedAt
 * @param {number} now
 * @returns {boolean}
 */
export function isDismissed(banner, dismissedAt, now) {
	if (dismissedAt === null || !Number.isFinite(dismissedAt)) return false;
	const expiry = banner.expiryMs ?? DEFAULT_DISMISSAL_MS;
	return now - dismissedAt < expiry;
}

/**
 * @param {Pick<Storage, 'getItem'>} storage
 * @param {string} key
 * @returns {number | null}
 */
function readDismissedAt(storage, key) {
	const raw = storage.getItem(dismissalKey(key));
	if (raw === null) return null;
	const n = Number(raw);
	return Number.isFinite(n) ? n : null;
}

/**
 * @template {BannerMeta} T
 * @param {T[]} banners
 * @param {Pick<Storage, 'getItem'>} storage
 * @param {number} now
 * @returns {T | null}
 */
export function getActiveBanner(banners, storage, now) {
	for (const banner of banners) {
		if (!banner.enabled) continue;
		if (isDismissed(banner, readDismissedAt(storage, banner.key), now)) continue;
		return banner;
	}
	return null;
}

/**
 * Remove the legacy `bannerDismissedAt` key, plus any namespaced dismissal
 * key whose banner is no longer configured or has been disabled.
 *
 * @param {BannerMeta[]} banners
 * @param {Storage} storage
 */
export function cleanupObsoleteDismissals(banners, storage) {
	storage.removeItem(LEGACY_DISMISSAL_KEY);

	const liveKeys = new Set(banners.filter((b) => b.enabled).map((b) => dismissalKey(b.key)));

	/** @type {string[]} */
	const toRemove = [];
	for (let i = 0; i < storage.length; i++) {
		const k = storage.key(i);
		if (k && k.startsWith(DISMISSAL_KEY_PREFIX) && !liveKeys.has(k)) {
			toRemove.push(k);
		}
	}
	for (const k of toRemove) storage.removeItem(k);
}
