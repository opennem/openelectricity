/**
 * Builders for the tracker's unit tests — one place for the shapes several
 * suites need, so a change to a snapshot or provider surface is made once.
 * A rune module so provider stand-ins are reactive under the `runes` project.
 */

import { vi } from 'vitest';

/**
 * Stub `fetch` with an OE-shaped responder for `/api/network/data` and record
 * every request, so provider lifecycles can be driven end to end without a
 * network. The responder receives the request's search params and returns
 * the `response` body (default: no data), or a `Response` for failures.
 * @param {(params: URLSearchParams) => any} [responder]
 */
export function stubNetworkFetch(responder = () => ({ data: [] })) {
	/** @type {string[]} */
	const urls = [];
	/** One-shot parse of a recorded request, not reactive URL state.
	 * @param {string} href */
	const queryOf = (href) => {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- transient parse
		return new URL(href, 'http://test').searchParams;
	};
	const fetchMock = vi.fn(async (/** @type {string | URL} */ url) => {
		const href = String(url);
		urls.push(href);
		const body = responder(queryOf(href));
		if (body instanceof Response) return body;
		return new Response(JSON.stringify({ response: body }), {
			status: 200,
			headers: { 'content-type': 'application/json' }
		});
	});
	vi.stubGlobal('fetch', fetchMock);
	return {
		urls,
		fetchMock,
		/** Query parameters of the nth request. @param {number} index */
		params: (index) => queryOf(urls[index]),
		/** The `metric` parameter of every request so far, in order. */
		get metrics() {
			return urls.map((href) => queryOf(href).get('metric'));
		}
	};
}

/**
 * A failing HTTP response the shared fetch helper reports as
 * "Data request failed (<status>): <message>".
 * @param {number} status @param {string} message
 */
export function failedResponse(status, message) {
	return new Response(JSON.stringify({ error: message }), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

/**
 * One power reading per fuel tech at `stamp` (network-local, no offset),
 * shaped like the OE network data endpoint.
 * @param {string} stamp @param {Record<string, number>} readings
 */
export function powerResponse(stamp, readings) {
	return {
		data: [
			{
				metric: 'power',
				results: Object.entries(readings).map(([fueltech, value]) => ({
					columns: { fueltech },
					data: [[stamp, value]]
				}))
			}
		]
	};
}

/**
 * A generation-style chart snapshot with sensible defaults.
 * @param {Partial<import('./types.js').GenerationSnapshot>} [overrides]
 * @returns {import('./types.js').GenerationSnapshot}
 */
export function makeSnapshot(overrides = {}) {
	return {
		queryKey: 'test',
		data: [],
		nativeData: [],
		start: 0,
		end: 0,
		seriesNames: [],
		seriesLabels: {},
		seriesColours: {},
		...overrides
	};
}

/**
 * A headless provider stand-in: rows are returned as given, status is settable.
 * Reactive, so deriveds under test recompute when a test flips its state.
 * @param {{ rows?: any[], pending?: boolean, error?: string | null }} [state]
 */
export function makeProvider(state = {}) {
	const provider = $state({
		rows: state.rows ?? [],
		isPending: state.pending ?? false,
		error: state.error ?? null,
		reconciled: 0,
		/** @param {number} start @param {number} end */
		getVisibleRows(start, end) {
			return provider.rows.filter((row) => row.time >= start && row.time <= end);
		},
		/** @param {number} start @param {number} end */
		getDisplayRows(start, end) {
			return provider.getVisibleRows(start, end);
		},
		setViewport() {},
		invalidateTail() {},
		reconcileFetches() {
			provider.reconciled += 1;
		}
	});
	return provider;
}

/**
 * The tracker's provider set, every member a settable stand-in.
 * @param {Partial<Record<'marketData' | 'mvData' | 'emissionsData' | 'demandData' | 'curtailmentData' | 'shareData', ReturnType<typeof makeProvider>>>} [members]
 */
export function makeProviders(members = {}) {
	const set = {
		marketData: members.marketData ?? makeProvider(),
		mvData: members.mvData ?? makeProvider(),
		emissionsData: members.emissionsData ?? makeProvider(),
		demandData: members.demandData ?? makeProvider(),
		curtailmentData: members.curtailmentData ?? makeProvider(),
		shareData: members.shareData ?? makeProvider()
	};
	const all = Object.values(set);
	return {
		...set,
		all,
		get pending() {
			return all.some((provider) => provider.isPending);
		},
		get error() {
			return all.find((provider) => provider.error)?.error ?? null;
		},
		retry() {
			for (const provider of all) provider.reconcileFetches();
		},
		get renewablesSource() {
			return set.shareData;
		},
		/** @param {number} start @param {number} end */
		renewableShareRows(start, end) {
			return set.shareData.getDisplayRows(start, end);
		}
	};
}
