/**
 * Client-side API module for Stratify chart CRUD.
 * All requests include the Clerk JWT for admin verification.
 */

import { getClerkState } from '$lib/auth/clerk.svelte.js';

/**
 * Get the current Clerk auth token.
 * @returns {Promise<string | null>}
 */
async function getToken() {
	const clerkState = getClerkState();
	const token = await clerkState.instance?.session?.getToken();
	return token ?? null;
}

/**
 * Make an authenticated fetch request.
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<any>}
 */
async function authFetch(url, options = {}) {
	const token = await getToken();
	if (!token) throw new Error('Not authenticated');

	const res = await fetch(url, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`,
			...options.headers
		}
	});

	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(body.error || `Request failed (${res.status})`);
	}

	return res.json();
}

/**
 * Full normalised chart document (see normaliseChart in $lib/stratify/chart-data.js)
 * plus list metadata appended by the API.
 * @typedef {Record<string, any> & {
 *   _id: string,
 *   title: string,
 *   chartType: string,
 *   description: string,
 *   csvText: string,
 *   status: string,
 *   userEmail?: string,
 *   publishedAt?: string | null,
 *   _createdAt: string,
 *   _updatedAt: string
 * }} ChartDoc
 */

/**
 * @typedef {Object} ChartListSection
 * @property {ChartDoc[]} items
 * @property {number} total
 * @property {number} page
 * @property {number} totalPages
 */

/**
 * @typedef {Object} ChartsListResponse
 * @property {ChartListSection} [my]
 * @property {ChartListSection} [community]
 * @property {boolean} isSuperAdmin
 */

/**
 * List charts — own charts + community charts, each section paginated
 * independently.
 * @param {{
 *   scope?: 'all' | 'my' | 'community',
 *   myPage?: number,
 *   communityPage?: number,
 *   pageSize?: number,
 *   q?: string,
 *   status?: string
 * }} [options]
 * @returns {Promise<ChartsListResponse>}
 */
export async function listCharts(options = {}) {
	const params = new URLSearchParams();
	if (options.scope && options.scope !== 'all') params.set('scope', options.scope);
	if (options.myPage && options.myPage > 1) params.set('myPage', String(options.myPage));
	if (options.communityPage && options.communityPage > 1) {
		params.set('communityPage', String(options.communityPage));
	}
	if (options.pageSize) params.set('pageSize', String(options.pageSize));
	if (options.q?.trim()) params.set('q', options.q.trim());
	if (options.status) params.set('status', options.status);
	const qs = params.toString();
	return authFetch(`/api/stratify/charts${qs ? `?${qs}` : ''}`);
}

/**
 * Get a single chart by ID.
 * @param {string} id
 * @returns {Promise<any>}
 */
export async function getChart(id) {
	const data = await authFetch(`/api/stratify/charts/${id}`);
	return data.chart;
}

/**
 * Create a new chart.
 * @param {import('../_state/StratifyPlotProject.svelte.js').StratifyPlotSnapshot} snapshot
 * @returns {Promise<{ _id: string }>}
 */
export async function createChart(snapshot) {
	const data = await authFetch('/api/stratify/charts', {
		method: 'POST',
		body: JSON.stringify(snapshot)
	});
	return data.chart;
}

/**
 * Update an existing chart.
 * @param {string} id
 * @param {Partial<import('../_state/StratifyPlotProject.svelte.js').StratifyPlotSnapshot> & Record<string, any>} fields
 * @returns {Promise<{ _id: string }>}
 */
export async function updateChart(id, fields) {
	const data = await authFetch(`/api/stratify/charts/${id}`, {
		method: 'PATCH',
		body: JSON.stringify(fields)
	});
	return data.chart;
}

/**
 * Delete a chart.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteChart(id) {
	await authFetch(`/api/stratify/charts/${id}`, { method: 'DELETE' });
}

/**
 * Fork a chart into the current user's account.
 * @param {string} id
 * @returns {Promise<{ _id: string }>}
 */
export async function forkChart(id) {
	const data = await authFetch(`/api/stratify/charts/${id}/fork`, { method: 'POST' });
	return data.chart;
}
