const OVERPASS_ENDPOINTS = [
	'https://overpass-api.de/api/interpreter',
	'https://overpass.kumi.systems/api/interpreter'
];
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_RETRIES = 2;
const RETRY_DELAY = 1500; // ms

/** @type {Map<string, { feature: GeoJSON.Feature | null, timestamp: number }>} */
const cache = new Map();

/** @type {Map<string, Promise<GeoJSON.Feature | null>>} */
const inflight = new Map();

/**
 * Check whether a result for the given OSM ID is in the in-memory cache.
 * @param {string | number} osmId
 * @returns {boolean}
 */
export function isOsmCached(osmId) {
	const entry = cache.get(String(osmId));
	return !!entry && Date.now() - entry.timestamp < CACHE_TTL;
}

/**
 * Fetch polygon geometry for an OSM way/relation ID from the Overpass API.
 * Results are cached in memory for 30 days.
 *
 * @param {string | number} osmId
 * @returns {Promise<GeoJSON.Feature | null>}
 */
export function fetchOsmPolygon(osmId) {
	const key = String(osmId);
	const cached = cache.get(key);
	if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
		return Promise.resolve(cached.feature);
	}

	// Deduplicate concurrent requests for the same ID
	const existing = inflight.get(key);
	if (existing) return existing;

	const promise = _fetchOsmPolygon(key, osmId);
	inflight.set(key, promise);
	promise.finally(() => inflight.delete(key));
	return promise;
}

/**
 * @param {string} key
 * @param {string | number} osmId
 * @returns {Promise<GeoJSON.Feature | null>}
 */
async function _fetchOsmPolygon(key, osmId) {
	const query = `[out:json];(way(${osmId});relation(${osmId}););out geom;`;
	const body = `data=${encodeURIComponent(query)}`;

	let elements = null;
	let gotResponse = false;

	for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
		// Rotate through endpoints on retries
		const endpoint = OVERPASS_ENDPOINTS[attempt % OVERPASS_ENDPOINTS.length];

		if (attempt > 0) {
			await new Promise((r) => setTimeout(r, RETRY_DELAY * attempt));
		}

		let res;
		try {
			res = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body
			});
		} catch {
			continue;
		}

		if (res.status === 429 || res.status === 503 || res.status === 504) {
			continue;
		}
		if (!res.ok) return null;

		const data = await res.json();
		elements = data.elements;
		gotResponse = true;
		break;
	}

	// All retries exhausted (network/rate-limit) — don't cache transient failures
	if (!gotResponse) return null;

	if (!elements?.length) {
		cache.set(key, { feature: null, timestamp: Date.now() });
		return null;
	}

	const element = elements[0];
	let feature = null;

	if (element.type === 'way') {
		feature = wayToFeature(element);
	} else if (element.type === 'relation') {
		feature = relationToFeature(element);
	}

	cache.set(key, { feature, timestamp: Date.now() });
	return feature;
}

/**
 * @param {any} way
 * @returns {GeoJSON.Feature | null}
 */
function wayToFeature(way) {
	const geom = way.geometry;
	if (!geom?.length) return null;

	const ring = geom.map((/** @type {{ lon: number, lat: number }} */ n) => [n.lon, n.lat]);
	closeRing(ring);

	return {
		type: 'Feature',
		properties: { osm_type: 'way', osm_id: way.id },
		geometry: { type: 'Polygon', coordinates: [ring] }
	};
}

/**
 * @param {any} relation
 * @returns {GeoJSON.Feature | null}
 */
function relationToFeature(relation) {
	const members = relation.members;
	if (!members?.length) return null;

	/** @type {number[][][]} */
	const outerSegments = [];
	/** @type {number[][][]} */
	const innerSegments = [];

	for (const member of members) {
		if (member.type !== 'way' || !member.geometry?.length) continue;

		const coords = member.geometry.map(
			(/** @type {{ lon: number, lat: number }} */ n) => [n.lon, n.lat]
		);

		if (member.role === 'inner') {
			innerSegments.push(coords);
		} else {
			outerSegments.push(coords);
		}
	}

	const outers = assembleRings(outerSegments);
	if (!outers.length) return null;

	const inners = assembleRings(innerSegments);

	if (outers.length === 1) {
		return {
			type: 'Feature',
			properties: { osm_type: 'relation', osm_id: relation.id },
			geometry: { type: 'Polygon', coordinates: [outers[0], ...inners] }
		};
	}

	const polygons = outers.map((outer, i) => (i === 0 ? [outer, ...inners] : [outer]));
	return {
		type: 'Feature',
		properties: { osm_type: 'relation', osm_id: relation.id },
		geometry: { type: 'MultiPolygon', coordinates: polygons }
	};
}

/**
 * Assemble way segments into closed rings by joining endpoints.
 * OSM relations often split boundaries across multiple ways that share
 * nodes at their endpoints. This joins them end-to-end and closes each ring.
 *
 * @param {number[][][]} segments - Array of coordinate arrays
 * @returns {number[][][]} - Array of closed rings
 */
function assembleRings(segments) {
	if (!segments.length) return [];

	/** @type {number[][][]} */
	const rings = [];
	const remaining = segments.map((s) => [...s]);

	while (remaining.length) {
		const current = remaining.shift();
		if (!current) break;

		let merged = true;
		while (merged) {
			merged = false;
			// Check if ring is already closed
			const first = current[0];
			const last = current[current.length - 1];
			if (first[0] === last[0] && first[1] === last[1]) break;

			for (let i = 0; i < remaining.length; i++) {
				const seg = remaining[i];
				const segFirst = seg[0];
				const segLast = seg[seg.length - 1];

				if (last[0] === segFirst[0] && last[1] === segFirst[1]) {
					// current end → seg start: append seg (skip shared node)
					current.push(...seg.slice(1));
					remaining.splice(i, 1);
					merged = true;
					break;
				}
				if (last[0] === segLast[0] && last[1] === segLast[1]) {
					// current end → seg end: append reversed seg (skip shared node)
					current.push(...seg.slice(0, -1).reverse());
					remaining.splice(i, 1);
					merged = true;
					break;
				}
				if (first[0] === segLast[0] && first[1] === segLast[1]) {
					// seg end → current start: prepend seg (skip shared node)
					current.unshift(...seg.slice(0, -1));
					remaining.splice(i, 1);
					merged = true;
					break;
				}
				if (first[0] === segFirst[0] && first[1] === segFirst[1]) {
					// seg start → current start: prepend reversed seg (skip shared node)
					current.unshift(...seg.slice(1).reverse());
					remaining.splice(i, 1);
					merged = true;
					break;
				}
			}
		}

		closeRing(current);
		rings.push(current);
	}

	return rings;
}

/** @param {number[][]} ring */
function closeRing(ring) {
	if (ring.length < 2) return;
	const first = ring[0];
	const last = ring[ring.length - 1];
	if (first[0] !== last[0] || first[1] !== last[1]) {
		ring.push([...first]);
	}
}
