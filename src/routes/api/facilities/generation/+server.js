import { OpenElectricityClient, NoDataFound } from 'openelectricity';
import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';

const client = new OpenElectricityClient({
	apiKey: PUBLIC_OE_API_KEY,
	baseUrl: PUBLIC_OE_API_URL
});

// `mode=live` is the latest 5-min power reading (MW). Restricted to NEM
// because WEM publishes with a 12+ h lag, which makes "live" misleading.
// `mode=daily` is the most recent fully-published daily energy total (MWh)
// for both NEM and WEM — the right metric when you want to compare facility
// output meaningfully across renewables and baseload.
const MODE_CONFIG = /** @type {const} */ ({
	live: {
		networks: ['NEM'],
		metric: 'power',
		interval: '5m',
		lookbackMs: 30 * 60 * 1000
	},
	daily: {
		networks: ['NEM', 'WEM'],
		metric: 'energy',
		interval: '1d',
		// 48 h covers the most recent fully-published day for both networks.
		lookbackMs: 48 * 60 * 60 * 1000
	}
});

// OE API caps `facility_code` at fewer than 30 entries per request — chunk
// just below that limit so the parallel fan-out has minimum round trips.
const CHUNK_SIZE = 25;

const FACILITIES_TTL_MS = 30 * 60 * 1000;
/** @type {{ expires: number, byNetwork: Record<string, string[]>, unitToFacility: Map<string, string> } | null} */
let facilitiesCache = null;

async function loadFacilities() {
	if (facilitiesCache && facilitiesCache.expires > Date.now()) return facilitiesCache;

	const { response } = await client.getFacilities({
		status_id: /** @type {any} */ (['operating', 'committed'])
	});

	/** @type {Record<string, string[]>} */
	const byNetwork = { NEM: [], WEM: [] };
	const unitToFacility = new Map();

	for (const f of response.data ?? []) {
		const code = f.code;
		const network = f.network_id;
		if (!code || !network) continue;
		if (!(network in byNetwork)) continue;
		byNetwork[network].push(code);
		for (const unit of f.units ?? []) {
			if (unit.code) unitToFacility.set(unit.code, code);
		}
	}

	facilitiesCache = {
		expires: Date.now() + FACILITIES_TTL_MS,
		byNetwork,
		unitToFacility
	};
	return facilitiesCache;
}

/**
 * @param {string[]} arr
 * @param {number} size
 */
function chunk(arr, size) {
	/** @type {string[][]} */
	const out = [];
	for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
	return out;
}

/**
 * @param {'NEM' | 'WEM'} network
 * @param {string[]} codes
 * @param {string} dateStart
 * @param {'power' | 'energy'} metric
 * @param {'5m' | '1d'} interval
 */
async function fetchChunk(network, codes, dateStart, metric, interval) {
	if (!codes.length) return [];
	try {
		const r = await client.getFacilityData(
			network,
			codes,
			/** @type {any} */ ([metric]),
			{ interval: /** @type {any} */ (interval), dateStart }
		);
		return r.response.data ?? [];
	} catch (err) {
		if (err instanceof NoDataFound) return [];
		console.error(`generation chunk failed (${network}, ${codes.length} codes):`, err);
		return [];
	}
}

export async function GET({ url, setHeaders }) {
	const modeParam = url.searchParams.get('mode');
	const mode = /** @type {'live' | 'daily'} */ (
		modeParam === 'live' ? 'live' : 'daily'
	);
	const config = MODE_CONFIG[mode];

	try {
		const { byNetwork, unitToFacility } = await loadFacilities();
		const dateStart = new Date(Date.now() - config.lookbackMs).toISOString().slice(0, 19);

		const tasks = [];
		for (const network of config.networks) {
			const codes = byNetwork[network] ?? [];
			for (const codeChunk of chunk(codes, CHUNK_SIZE)) {
				tasks.push(
					fetchChunk(
						/** @type {'NEM' | 'WEM'} */ (network),
						codeChunk,
						dateStart,
						config.metric,
						config.interval
					)
				);
			}
		}

		const seriesGroups = await Promise.all(tasks);

		/** @type {Record<string, number>} */
		const values = {};

		for (const seriesArr of seriesGroups) {
			for (const ts of seriesArr) {
				for (const result of ts.results ?? []) {
					const rawUnitCode = result.columns?.unit_code;
					const unitCode = typeof rawUnitCode === 'string' ? rawUnitCode : '';
					const facilityCode = unitCode ? unitToFacility.get(unitCode) : null;
					if (!facilityCode) continue;

					// Latest non-null reading for this unit. For `live`/5m this is
					// the most recent power reading (MW). For `daily`/1d it's the
					// most recently completed daily energy total (MWh).
					let latestTime = '';
					let latestValue = /** @type {number | null} */ (null);
					for (const [timestamp, value] of result.data ?? []) {
						if (value == null) continue;
						const t = String(timestamp);
						if (t > latestTime) {
							latestTime = t;
							latestValue = value;
						}
					}
					if (latestValue == null) continue;

					values[facilityCode] = (values[facilityCode] ?? 0) + latestValue;
				}
			}
		}

		setHeaders({
			'Cache-Control': 'public, max-age=300'
		});

		return Response.json({ mode, unit: config.metric === 'energy' ? 'MWh' : 'MW', values });
	} catch (err) {
		console.error('Error fetching batched generation data:', err);
		return Response.json(
			{ error: /** @type {any} */ (err).message },
			{ status: 500 }
		);
	}
}
