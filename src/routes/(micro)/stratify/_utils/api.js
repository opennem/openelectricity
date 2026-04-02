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
 * @typedef {Object} ChartSummary
 * @property {string} _id
 * @property {string} title
 * @property {string} chartType
 * @property {string} status
 * @property {string} description
 * @property {string} [userEmail]
 * @property {string} _createdAt
 * @property {string} _updatedAt
 */

/**
 * @typedef {Object} ChartsListResponse
 * @property {ChartSummary[]} myCharts
 * @property {ChartSummary[]} communityCharts
 * @property {boolean} isSuperAdmin
 */

/**
 * List charts — returns own charts + community charts.
 * @param {{ status?: string }} [filters]
 * @returns {Promise<ChartsListResponse>}
 */
export async function listCharts(filters = {}) {
	const params = new URLSearchParams();
	if (filters.status) params.set('status', filters.status);
	const qs = params.toString();
	const url = `/api/stratify/charts${qs ? `?${qs}` : ''}`;
	const data = await authFetch(url);
	return {
		myCharts: data.myCharts,
		communityCharts: data.communityCharts,
		isSuperAdmin: data.isSuperAdmin
	};
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
