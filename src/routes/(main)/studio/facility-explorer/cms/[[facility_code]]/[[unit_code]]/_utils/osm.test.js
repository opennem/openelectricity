import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================
// Test Helpers
// ============================================

/** A simple square geometry (open ring — not closed) */
const SQUARE_GEOM = [
	{ lon: 150.0, lat: -33.0 },
	{ lon: 150.1, lat: -33.0 },
	{ lon: 150.1, lat: -33.1 },
	{ lon: 150.0, lat: -33.1 }
];

/** A smaller square for inner rings */
const INNER_SQUARE_GEOM = [
	{ lon: 150.03, lat: -33.03 },
	{ lon: 150.07, lat: -33.03 },
	{ lon: 150.07, lat: -33.07 },
	{ lon: 150.03, lat: -33.07 }
];

/** A second outer ring for MultiPolygon tests */
const SECOND_OUTER_GEOM = [
	{ lon: 151.0, lat: -34.0 },
	{ lon: 151.1, lat: -34.0 },
	{ lon: 151.1, lat: -34.1 },
	{ lon: 151.0, lat: -34.1 }
];

/**
 * Build an Overpass API response containing a single way element.
 * @param {number} id
 * @param {Array<{lon: number, lat: number}>} [geometry]
 */
function buildWayResponse(id, geometry) {
	return { elements: [{ type: 'way', id, geometry }] };
}

/**
 * Build an Overpass API response containing a single relation element.
 * @param {number} id
 * @param {Array<{type: string, role?: string, geometry?: Array<{lon: number, lat: number}>}>} [members]
 */
function buildRelationResponse(id, members) {
	return { elements: [{ type: 'relation', id, members }] };
}

/**
 * Stub global fetch to resolve with a successful JSON response.
 * @param {any} data
 * @returns {import('vitest').Mock}
 */
function stubFetchSuccess(data) {
	const mock = vi.fn().mockResolvedValue({
		ok: true,
		json: () => Promise.resolve(data)
	});
	vi.stubGlobal('fetch', mock);
	return mock;
}

/**
 * Stub global fetch to resolve with a non-ok HTTP response.
 * @param {number} [status=500]
 * @returns {import('vitest').Mock}
 */
function stubFetchHttpError(status = 500) {
	const mock = vi.fn().mockResolvedValue({ ok: false, status });
	vi.stubGlobal('fetch', mock);
	return mock;
}

/**
 * Stub global fetch to reject (simulating network failure).
 * @returns {import('vitest').Mock}
 */
function stubFetchNetworkError() {
	const mock = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
	vi.stubGlobal('fetch', mock);
	return mock;
}

// ============================================
// Tests
// ============================================

describe('fetchOsmPolygon', () => {
	/** @type {typeof import('./osm.js').fetchOsmPolygon} */
	let fetchOsmPolygon;

	beforeEach(async () => {
		vi.resetModules();
		const mod = await import('./osm.js');
		fetchOsmPolygon = mod.fetchOsmPolygon;
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	// ------------------------------------------
	// Way elements
	// ------------------------------------------

	describe('way elements', () => {
		it('returns a Polygon Feature for a way with open ring', async () => {
			stubFetchSuccess(buildWayResponse(12345, SQUARE_GEOM));

			const result = await fetchOsmPolygon(12345);

			expect(result).not.toBeNull();
			expect(result.type).toBe('Feature');
			expect(result.properties).toEqual({ osm_type: 'way', osm_id: 12345 });
			expect(result.geometry.type).toBe('Polygon');

			const ring = result.geometry.coordinates[0];
			expect(ring).toHaveLength(5); // 4 nodes + closeRing added closing point
			expect(ring[0]).toEqual(ring[ring.length - 1]);
		});

		it('does not double-close an already-closed ring', async () => {
			const closedGeom = [
				...SQUARE_GEOM,
				{ lon: SQUARE_GEOM[0].lon, lat: SQUARE_GEOM[0].lat }
			];
			stubFetchSuccess(buildWayResponse(100, closedGeom));

			const result = await fetchOsmPolygon(100);

			const ring = result.geometry.coordinates[0];
			expect(ring).toHaveLength(5); // 5 input nodes, no extra added
		});

		it('returns null for a way with empty geometry', async () => {
			stubFetchSuccess(buildWayResponse(200, []));

			const result = await fetchOsmPolygon(200);
			expect(result).toBeNull();
		});

		it('returns null for a way with missing geometry', async () => {
			stubFetchSuccess({ elements: [{ type: 'way', id: 300 }] });

			const result = await fetchOsmPolygon(300);
			expect(result).toBeNull();
		});

		it('maps {lon, lat} to [lon, lat] GeoJSON order', async () => {
			stubFetchSuccess(buildWayResponse(400, SQUARE_GEOM));

			const result = await fetchOsmPolygon(400);

			const ring = result.geometry.coordinates[0];
			expect(ring[0]).toEqual([150.0, -33.0]); // [lon, lat]
			expect(ring[1]).toEqual([150.1, -33.0]);
		});
	});

	// ------------------------------------------
	// Relation elements — single outer
	// ------------------------------------------

	describe('relation elements — single outer', () => {
		it('returns a Polygon Feature for relation with one outer member', async () => {
			const members = [{ type: 'way', role: 'outer', geometry: SQUARE_GEOM }];
			stubFetchSuccess(buildRelationResponse(5000, members));

			const result = await fetchOsmPolygon(5000);

			expect(result.type).toBe('Feature');
			expect(result.properties).toEqual({ osm_type: 'relation', osm_id: 5000 });
			expect(result.geometry.type).toBe('Polygon');
			expect(result.geometry.coordinates).toHaveLength(1); // outer ring only
		});

		it('includes inner rings in a Polygon with outer + inner members', async () => {
			const members = [
				{ type: 'way', role: 'outer', geometry: SQUARE_GEOM },
				{ type: 'way', role: 'inner', geometry: INNER_SQUARE_GEOM }
			];
			stubFetchSuccess(buildRelationResponse(5001, members));

			const result = await fetchOsmPolygon(5001);

			expect(result.geometry.type).toBe('Polygon');
			expect(result.geometry.coordinates).toHaveLength(2); // outer + inner
		});

		it('handles multiple inner rings with single outer', async () => {
			const secondInner = [
				{ lon: 150.04, lat: -33.04 },
				{ lon: 150.06, lat: -33.04 },
				{ lon: 150.06, lat: -33.06 },
				{ lon: 150.04, lat: -33.06 }
			];
			const members = [
				{ type: 'way', role: 'outer', geometry: SQUARE_GEOM },
				{ type: 'way', role: 'inner', geometry: INNER_SQUARE_GEOM },
				{ type: 'way', role: 'inner', geometry: secondInner }
			];
			stubFetchSuccess(buildRelationResponse(5002, members));

			const result = await fetchOsmPolygon(5002);

			expect(result.geometry.type).toBe('Polygon');
			expect(result.geometry.coordinates).toHaveLength(3); // outer + 2 inners
		});
	});

	// ------------------------------------------
	// Relation elements — multiple outers
	// ------------------------------------------

	describe('relation elements — multiple outers', () => {
		it('returns a MultiPolygon Feature for relation with multiple outer members', async () => {
			const members = [
				{ type: 'way', role: 'outer', geometry: SQUARE_GEOM },
				{ type: 'way', role: 'outer', geometry: SECOND_OUTER_GEOM }
			];
			stubFetchSuccess(buildRelationResponse(6000, members));

			const result = await fetchOsmPolygon(6000);

			expect(result.geometry.type).toBe('MultiPolygon');
			expect(result.geometry.coordinates).toHaveLength(2);
		});

		it('assigns inner rings only to the first polygon in MultiPolygon', async () => {
			const members = [
				{ type: 'way', role: 'outer', geometry: SQUARE_GEOM },
				{ type: 'way', role: 'inner', geometry: INNER_SQUARE_GEOM },
				{ type: 'way', role: 'outer', geometry: SECOND_OUTER_GEOM }
			];
			stubFetchSuccess(buildRelationResponse(6001, members));

			const result = await fetchOsmPolygon(6001);

			expect(result.geometry.type).toBe('MultiPolygon');
			// First polygon has outer + inner
			expect(result.geometry.coordinates[0]).toHaveLength(2);
			// Second polygon has outer only
			expect(result.geometry.coordinates[1]).toHaveLength(1);
		});
	});

	// ------------------------------------------
	// Relation elements — ring assembly
	// ------------------------------------------

	describe('relation elements — ring assembly', () => {
		it('assembles outer boundary from two way segments', async () => {
			// Square split into two halves sharing a midpoint
			const segA = [
				{ lon: 150.0, lat: -33.0 },
				{ lon: 150.1, lat: -33.0 },
				{ lon: 150.1, lat: -33.1 }
			];
			const segB = [
				{ lon: 150.1, lat: -33.1 },
				{ lon: 150.0, lat: -33.1 },
				{ lon: 150.0, lat: -33.0 }
			];
			const members = [
				{ type: 'way', role: 'outer', geometry: segA },
				{ type: 'way', role: 'outer', geometry: segB }
			];
			stubFetchSuccess(buildRelationResponse(11000, members));

			const result = await fetchOsmPolygon(11000);

			expect(result).not.toBeNull();
			expect(result.geometry.type).toBe('Polygon');
			// Should be one assembled ring, not MultiPolygon with two
			expect(result.geometry.coordinates).toHaveLength(1);
			const ring = result.geometry.coordinates[0];
			// 3 from segA + 2 from segB (skip shared node) + closing = 6
			expect(ring[0]).toEqual(ring[ring.length - 1]); // closed
			expect(ring.length).toBe(5); // 4 unique points + closing
		});

		it('assembles outer boundary from three way segments', async () => {
			// Triangle split into three segments
			const segA = [
				{ lon: 150.0, lat: -33.0 },
				{ lon: 150.1, lat: -33.0 }
			];
			const segB = [
				{ lon: 150.1, lat: -33.0 },
				{ lon: 150.05, lat: -33.1 }
			];
			const segC = [
				{ lon: 150.05, lat: -33.1 },
				{ lon: 150.0, lat: -33.0 }
			];
			const members = [
				{ type: 'way', role: 'outer', geometry: segA },
				{ type: 'way', role: 'outer', geometry: segB },
				{ type: 'way', role: 'outer', geometry: segC }
			];
			stubFetchSuccess(buildRelationResponse(11001, members));

			const result = await fetchOsmPolygon(11001);

			expect(result).not.toBeNull();
			expect(result.geometry.type).toBe('Polygon');
			expect(result.geometry.coordinates).toHaveLength(1);
			const ring = result.geometry.coordinates[0];
			expect(ring[0]).toEqual(ring[ring.length - 1]);
		});

		it('assembles segments provided in reverse order', async () => {
			// Two segments where second connects in reverse
			const segA = [
				{ lon: 150.0, lat: -33.0 },
				{ lon: 150.1, lat: -33.0 }
			];
			const segB = [
				{ lon: 150.0, lat: -33.0 },
				{ lon: 150.0, lat: -33.1 },
				{ lon: 150.1, lat: -33.1 },
				{ lon: 150.1, lat: -33.0 }
			];
			const members = [
				{ type: 'way', role: 'outer', geometry: segA },
				{ type: 'way', role: 'outer', geometry: segB }
			];
			stubFetchSuccess(buildRelationResponse(11002, members));

			const result = await fetchOsmPolygon(11002);

			expect(result).not.toBeNull();
			expect(result.geometry.type).toBe('Polygon');
			expect(result.geometry.coordinates).toHaveLength(1);
		});

		it('assembles inner boundary from multiple segments', async () => {
			// Complete outer, split inner
			const innerSegA = [
				{ lon: 150.03, lat: -33.03 },
				{ lon: 150.07, lat: -33.03 }
			];
			const innerSegB = [
				{ lon: 150.07, lat: -33.03 },
				{ lon: 150.07, lat: -33.07 },
				{ lon: 150.03, lat: -33.07 },
				{ lon: 150.03, lat: -33.03 }
			];
			const members = [
				{ type: 'way', role: 'outer', geometry: SQUARE_GEOM },
				{ type: 'way', role: 'inner', geometry: innerSegA },
				{ type: 'way', role: 'inner', geometry: innerSegB }
			];
			stubFetchSuccess(buildRelationResponse(11003, members));

			const result = await fetchOsmPolygon(11003);

			expect(result).not.toBeNull();
			expect(result.geometry.type).toBe('Polygon');
			// outer + one assembled inner
			expect(result.geometry.coordinates).toHaveLength(2);
		});

		it('handles mix of complete and segmented outers', async () => {
			// First outer is a complete single way, second outer is split in two
			const splitA = [
				{ lon: 151.0, lat: -34.0 },
				{ lon: 151.1, lat: -34.0 }
			];
			const splitB = [
				{ lon: 151.1, lat: -34.0 },
				{ lon: 151.1, lat: -34.1 },
				{ lon: 151.0, lat: -34.1 },
				{ lon: 151.0, lat: -34.0 }
			];
			const members = [
				{ type: 'way', role: 'outer', geometry: SQUARE_GEOM },
				{ type: 'way', role: 'outer', geometry: splitA },
				{ type: 'way', role: 'outer', geometry: splitB }
			];
			stubFetchSuccess(buildRelationResponse(11004, members));

			const result = await fetchOsmPolygon(11004);

			expect(result).not.toBeNull();
			expect(result.geometry.type).toBe('MultiPolygon');
			expect(result.geometry.coordinates).toHaveLength(2);
		});
	});

	// ------------------------------------------
	// Relation elements — edge cases
	// ------------------------------------------

	describe('relation elements — edge cases', () => {
		it('returns null for relation with empty members array', async () => {
			stubFetchSuccess(buildRelationResponse(7000, []));

			const result = await fetchOsmPolygon(7000);
			expect(result).toBeNull();
		});

		it('returns null for relation with missing members property', async () => {
			stubFetchSuccess({ elements: [{ type: 'relation', id: 7001 }] });

			const result = await fetchOsmPolygon(7001);
			expect(result).toBeNull();
		});

		it('skips non-way members', async () => {
			const members = [
				{ type: 'node', role: 'outer', geometry: SQUARE_GEOM },
				{ type: 'way', role: 'outer', geometry: SECOND_OUTER_GEOM }
			];
			stubFetchSuccess(buildRelationResponse(7002, members));

			const result = await fetchOsmPolygon(7002);

			expect(result.geometry.type).toBe('Polygon');
			// Only the way member should be included
			expect(result.geometry.coordinates).toHaveLength(1);
		});

		it('skips members with empty geometry', async () => {
			const members = [
				{ type: 'way', role: 'outer', geometry: [] },
				{ type: 'way', role: 'outer', geometry: SQUARE_GEOM }
			];
			stubFetchSuccess(buildRelationResponse(7003, members));

			const result = await fetchOsmPolygon(7003);

			expect(result.geometry.type).toBe('Polygon');
			expect(result.geometry.coordinates).toHaveLength(1);
		});

		it('returns null when all members are filtered out', async () => {
			const members = [
				{ type: 'node', role: 'outer', geometry: SQUARE_GEOM },
				{ type: 'way', role: 'outer', geometry: [] }
			];
			stubFetchSuccess(buildRelationResponse(7004, members));

			const result = await fetchOsmPolygon(7004);
			expect(result).toBeNull();
		});
	});

	// ------------------------------------------
	// Empty and error responses
	// ------------------------------------------

	describe('empty and error responses', () => {
		it('returns null for response with empty elements array', async () => {
			stubFetchSuccess({ elements: [] });

			const result = await fetchOsmPolygon(8000);
			expect(result).toBeNull();
		});

		it('returns null for response with missing elements property', async () => {
			stubFetchSuccess({});

			const result = await fetchOsmPolygon(8001);
			expect(result).toBeNull();
		});

		it('returns null for unknown element type', async () => {
			stubFetchSuccess({ elements: [{ type: 'node', id: 8002 }] });

			const result = await fetchOsmPolygon(8002);
			expect(result).toBeNull();
		});

		it('returns null on network error', async () => {
			stubFetchNetworkError();

			const result = await fetchOsmPolygon(9000);
			expect(result).toBeNull();
		}, 10000);

		it('returns null on non-ok HTTP response', async () => {
			stubFetchHttpError(500);

			const result = await fetchOsmPolygon(9001);
			expect(result).toBeNull();
		});
	});

	// ------------------------------------------
	// Fetch request format
	// ------------------------------------------

	describe('fetch request format', () => {
		it('sends POST to the Overpass API with correct headers', async () => {
			const mock = stubFetchSuccess(buildWayResponse(1, SQUARE_GEOM));

			await fetchOsmPolygon(1);

			expect(mock).toHaveBeenCalledOnce();
			const [url, opts] = mock.mock.calls[0];
			expect(url).toBe('https://overpass-api.de/api/interpreter');
			expect(opts.method).toBe('POST');
			expect(opts.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
		});

		it('sends correctly encoded Overpass QL query containing the osmId', async () => {
			const mock = stubFetchSuccess(buildWayResponse(42, SQUARE_GEOM));

			await fetchOsmPolygon(42);

			const body = mock.mock.calls[0][1].body;
			const decoded = decodeURIComponent(body.replace('data=', ''));
			expect(decoded).toContain('way(42)');
			expect(decoded).toContain('relation(42)');
		});
	});

	// ------------------------------------------
	// Caching behaviour
	// ------------------------------------------

	describe('caching behaviour', () => {
		it('returns cached result on second call without re-fetching', async () => {
			const mock = stubFetchSuccess(buildWayResponse(10000, SQUARE_GEOM));

			const first = await fetchOsmPolygon(10000);
			const second = await fetchOsmPolygon(10000);

			expect(first).toEqual(second);
			expect(mock).toHaveBeenCalledOnce();
		});

		it('caches null for empty responses', async () => {
			const mock = stubFetchSuccess({ elements: [] });

			const first = await fetchOsmPolygon(10001);
			const second = await fetchOsmPolygon(10001);

			expect(first).toBeNull();
			expect(second).toBeNull();
			expect(mock).toHaveBeenCalledOnce();
		});

		it('treats string and number osmId as same cache key', async () => {
			const mock = stubFetchSuccess(buildWayResponse(10002, SQUARE_GEOM));

			const first = await fetchOsmPolygon(10002);
			const second = await fetchOsmPolygon('10002');

			expect(first).toEqual(second);
			expect(mock).toHaveBeenCalledOnce();
		});

		it('re-fetches after cache TTL expires', async () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

			const mock = vi.fn();
			vi.stubGlobal('fetch', mock);

			// First call returns Feature A
			mock.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(buildWayResponse(10003, SQUARE_GEOM))
			});

			const first = await fetchOsmPolygon(10003);
			expect(first).not.toBeNull();

			// Advance past 30-day TTL
			vi.advanceTimersByTime(31 * 24 * 60 * 60 * 1000);

			// Second call returns different response
			mock.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(buildWayResponse(10003, SECOND_OUTER_GEOM))
			});

			const second = await fetchOsmPolygon(10003);
			expect(second).not.toBeNull();
			expect(mock).toHaveBeenCalledTimes(2);

			// Verify the second result has different coordinates
			expect(second.geometry.coordinates[0][0]).toEqual([151.0, -34.0]);
		});

		it('does not cache network errors (retry succeeds)', async () => {
			const mock = vi.fn();
			vi.stubGlobal('fetch', mock);

			// First call: all retry attempts fail with network error
			mock
				.mockRejectedValueOnce(new TypeError('fetch failed'))
				.mockRejectedValueOnce(new TypeError('fetch failed'))
				.mockRejectedValueOnce(new TypeError('fetch failed'));
			const first = await fetchOsmPolygon(10004);
			expect(first).toBeNull();

			// Second call: success
			mock.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(buildWayResponse(10004, SQUARE_GEOM))
			});
			const second = await fetchOsmPolygon(10004);
			expect(second).not.toBeNull();
			expect(mock).toHaveBeenCalledTimes(4); // 3 failed retries + 1 success
		}, 10000);

		it('does not cache HTTP errors (retry succeeds)', async () => {
			const mock = vi.fn();
			vi.stubGlobal('fetch', mock);

			// First call: HTTP 500
			mock.mockResolvedValueOnce({ ok: false, status: 500 });
			const first = await fetchOsmPolygon(10005);
			expect(first).toBeNull();

			// Second call: success
			mock.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(buildWayResponse(10005, SQUARE_GEOM))
			});
			const second = await fetchOsmPolygon(10005);
			expect(second).not.toBeNull();
			expect(mock).toHaveBeenCalledTimes(2);
		});
	});
});
