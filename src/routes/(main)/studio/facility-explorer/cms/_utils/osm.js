const OVERPASS_API = 'https://overpass-api.de/api/interpreter';
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

/** @type {Map<string, { feature: GeoJSON.Feature | null, timestamp: number }>} */
const cache = new Map();

/**
 * Fetch polygon geometry for an OSM way/relation ID from the Overpass API.
 * Results are cached in memory for 30 days.
 *
 * @param {string | number} osmId
 * @returns {Promise<GeoJSON.Feature | null>}
 */
export async function fetchOsmPolygon(osmId) {
	const key = String(osmId);
	const cached = cache.get(key);
	if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
		return cached.feature;
	}

	const query = `[out:json];(way(${osmId});relation(${osmId}););out geom;`;

	let res;
	try {
		res = await fetch(OVERPASS_API, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: `data=${encodeURIComponent(query)}`
		});
	} catch {
		return null;
	}

	if (!res.ok) return null;

	const data = await res.json();
	const elements = data.elements;

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
	const outers = [];
	/** @type {number[][][]} */
	const inners = [];

	for (const member of members) {
		if (member.type !== 'way' || !member.geometry?.length) continue;

		const ring = member.geometry.map(
			(/** @type {{ lon: number, lat: number }} */ n) => [n.lon, n.lat]
		);
		closeRing(ring);

		if (member.role === 'inner') {
			inners.push(ring);
		} else {
			outers.push(ring);
		}
	}

	if (!outers.length) return null;

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

/** @param {number[][]} ring */
function closeRing(ring) {
	if (ring.length < 2) return;
	const first = ring[0];
	const last = ring[ring.length - 1];
	if (first[0] !== last[0] || first[1] !== last[1]) {
		ring.push([...first]);
	}
}
