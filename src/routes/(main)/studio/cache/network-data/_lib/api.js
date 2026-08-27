/**
 * Client-side API module for the admin network-cache endpoints. All requests
 * include the Clerk JWT for admin verification. Errors keep the HTTP status
 * and parsed body so callers can present refresh failures (which carry the
 * preserved-entry metadata in their 502 body).
 */

import { getClerkState } from '$lib/auth/clerk.svelte.js';

export class ApiError extends Error {
	/**
	 * @param {string} message
	 * @param {number} status
	 * @param {any} body
	 */
	constructor(message, status, body) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.body = body;
	}
}

/**
 * @returns {Promise<string | null>}
 */
async function getToken() {
	const clerkState = getClerkState();
	const token = await clerkState.instance?.session?.getToken();
	return token ?? null;
}

/**
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<any>}
 */
async function authFetch(url, options = {}) {
	const token = await getToken();
	if (!token) throw new ApiError('Not authenticated', 401, null);

	const res = await fetch(url, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`,
			...options.headers
		}
	});

	const body = await res.json().catch(() => null);
	if (!res.ok) {
		throw new ApiError(body?.error || `Request failed (${res.status})`, res.status, body);
	}
	return body;
}

/**
 * List registry entries. `queryString` comes from the dashboard model's
 * `listQueryString(filters)`.
 *
 * @param {string} queryString
 * @returns {Promise<any>}
 */
export function listCacheEntries(queryString) {
	return authFetch(`/api/admin/network-cache${queryString ? `?${queryString}` : ''}`);
}

/**
 * Read one entry from the current data centre's Cache API (never populates).
 *
 * @param {string} key - Full synthetic cache key
 * @returns {Promise<any>}
 */
export function getCacheEntry(key) {
	return authFetch(`/api/admin/network-cache/entry?key=${encodeURIComponent(key)}`);
}

/**
 * Fetch fresh upstream data and replace the current data centre's entry.
 *
 * @param {string} key - Full synthetic cache key
 * @returns {Promise<any>}
 */
export function refreshCacheEntry(key) {
	return authFetch('/api/admin/network-cache/refresh', {
		method: 'POST',
		body: JSON.stringify({ key })
	});
}
