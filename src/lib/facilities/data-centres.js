/**
 * Data centres (large loads) map layer data.
 *
 * Transforms `static/data/data-centres-au.json` into a GeoJSON FeatureCollection
 * for the /facilities map. Data centres are loads, not OE facilities — they sit
 * outside the facilities/units pipeline and render as their own overlay layer.
 */

import { fuelTechColourMap } from '$lib/theme/openelectricity';
import { formatCapacity } from '$lib/utils/formatters';

/** @typedef {'operating' | 'construction' | 'announced' | 'retired'} DataCentreStatusBucket */

/** @type {Record<DataCentreStatusBucket, string>} */
export const STATUS_LABELS = {
	operating: 'Operating',
	construction: 'Construction',
	announced: 'Announced',
	retired: 'Retired'
};

/**
 * Single source of truth for the data-centre marker identity, shared by the
 * map layer and its legend so the two can't drift.
 */
export const DC_MARKER = {
	fill: fuelTechColourMap.data_centre,
	// Lighter fill over satellite imagery, mirroring the golf-layer treatment.
	satelliteFill: '#E9DBFF',
	stroke: '#5A2EBB',
	/** Status → fill opacity (announced sites read as faint hollow rings). */
	statusOpacity: /** @type {Record<DataCentreStatusBucket, number>} */ ({
		operating: 0.9,
		construction: 0.55,
		announced: 0.2,
		retired: 0.15
	})
};

/**
 * Normalise the source sheet's free-text status into buckets.
 * Unknown/junk values ('?', '***', null…) fall through to 'announced' — the
 * dimmest rendering, so we never overstate a site as operating.
 * @param {string | null | undefined} status
 * @returns {DataCentreStatusBucket}
 */
export function normaliseStatus(status) {
	const s = (status || '').toLowerCase();
	if (s.includes('retired')) return 'retired';
	// Order matters: 'Commenced/Construction' should read as under construction.
	if (s.includes('construction')) return 'construction';
	if (s.includes('commenced')) return 'operating';
	return 'announced';
}

/**
 * Best-available MW figure for a record. `operational_total_load_mw` is always
 * null in the source, so the chain is IT load → max IT → max total.
 * @param {any} record
 * @returns {{ mw: number | null, mwField: string | null, sourceLabel: string | null }}
 */
export function bestMw(record) {
	/** @type {[string, string][]} */
	const chain = [
		['operational_it_load_mw', 'IT load'],
		['max_it_load_mw', 'max IT load'],
		['max_total_load_mw', 'max total load']
	];
	for (const [field, label] of chain) {
		const value = record[field];
		if (typeof value === 'number') return { mw: value, mwField: field, sourceLabel: label };
	}
	return { mw: null, mwField: null, sourceLabel: null };
}

/** Largest MW figure in the dataset — anchors the 0..1 size scale. */
const MAX_MW = 1200;

/**
 * The source sheet sometimes puts free-text notes in URL fields (`website`,
 * `planning_url`, `btm_power`) — only accept values that are actually URLs.
 * @param {string | null | undefined} value
 * @returns {string | null}
 */
export function asUrl(value) {
	return typeof value === 'string' && value.startsWith('http') ? value : null;
}

/**
 * Whether a field's value carried an uncertainty marker in the source sheet
 * (rendered with a '~' prefix across the map popup and detail pane).
 * @param {any} record
 * @param {string | null} field
 * @returns {boolean}
 */
export function isEstimated(record, field) {
	return !!field && (record.estimated_fields ?? []).includes(field);
}

/**
 * Build the map FeatureCollection from the raw data-centres JSON.
 * Only `data_centres` are included — `other_loads` have no coordinates.
 * Records without coordinates are dropped (176 of 294 at time of writing).
 * @param {{ data_centres: any[] }} json
 * @returns {GeoJSON.FeatureCollection}
 */
export function toGeoJSON(json) {
	const features = json.data_centres
		.filter((record) => record.latitude != null && record.longitude != null)
		.map((record) => {
			const { mw, mwField, sourceLabel } = bestMw(record);
			const statusBucket = normaliseStatus(record.status);
			const approx = isEstimated(record, mwField) ? '~' : '';
			return /** @type {GeoJSON.Feature} */ ({
				type: 'Feature',
				geometry: {
					type: 'Point',
					coordinates: [record.longitude, record.latitude]
				},
				properties: {
					id: `dc-${record.id}`,
					name: record.name ?? null,
					company: record.company ?? null,
					city: record.city ?? null,
					state: record.state ?? null,
					status_bucket: statusBucket,
					status_label: STATUS_LABELS[statusBucket],
					status_raw: record.status ?? null,
					mw,
					mw_label: mw !== null ? `${approx}${formatCapacity(mw)} MW (${sourceLabel})` : null,
					has_mw: mw !== null,
					// sqrt keeps the 1.5–1200 MW spread legible (median 70 MW ≈ 0.24).
					size: mw !== null ? Math.min(1, Math.sqrt(mw) / Math.sqrt(MAX_MW)) : 0,
					link: asUrl(record.website) ?? asUrl(record.planning_url)
				}
			});
		});

	return { type: 'FeatureCollection', features };
}

/**
 * Parse the source sheet's date strings. Observed shapes: 'YYYY' (most) and
 * 'YYYY-MM-DD'; anything else (e.g. a stray '10.0') is treated as unknown.
 * Returns an OE-style naive datetime plus the specificity the Timeline view
 * uses for end-of-period snapping and label formatting.
 * @param {string | null | undefined} value
 * @returns {{ date: string, specificity: 'year' | null } | null}
 */
function parseRecordDate(value) {
	if (typeof value !== 'string') return null;
	if (/^\d{4}$/.test(value)) return { date: `${value}-01-01T00:00:00`, specificity: 'year' };
	if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return { date: `${value}T00:00:00`, specificity: null };
	return null;
}

/**
 * Source-sheet state → facilities region. ACT and NT are kept as their own
 * regions (matching the Region filter's act/nt options) rather than folded
 * into an OE network region — the ACT sits inside the NEM electrically, but
 * the source data locates data centres by territory, and the NT is outside
 * the NEM/WEM entirely (network_id null; only used for the WEM time offset).
 * 'SYD' is a one-off data-entry variant of NSW in the source sheet.
 * @type {Record<string, { network_id: string | null, network_region: string }>}
 */
const STATE_NETWORKS = {
	NSW: { network_id: 'NEM', network_region: 'NSW1' },
	SYD: { network_id: 'NEM', network_region: 'NSW1' },
	ACT: { network_id: 'NEM', network_region: 'ACT' },
	VIC: { network_id: 'NEM', network_region: 'VIC1' },
	QLD: { network_id: 'NEM', network_region: 'QLD1' },
	SA: { network_id: 'NEM', network_region: 'SA1' },
	TAS: { network_id: 'NEM', network_region: 'TAS1' },
	WA: { network_id: 'WEM', network_region: 'WEM' },
	NT: { network_id: null, network_region: 'NT' }
};

/**
 * Adapt data-centre records into facility-shaped objects so they flow through
 * the /facilities filter pipeline and list/grid/timeline views unchanged.
 * Each load carries one synthesised 'data_centre' unit (capacity = best MW)
 * plus the full source record under `dataCentre` for the detail pane.
 * `isLoad: true` marks the branch points that must differ (map layer, detail
 * panel, mobile navigation).
 *
 * The unit's status_id is the DC-native bucket ('operating' | 'construction' |
 * 'announced' | 'retired') — NOT an OE facility status. The load lifecycle is
 * a development pipeline OE has no equivalent for, so loads get their own
 * Status filter section rather than masquerading as committed/commissioning.
 * statusColours carries entries for these ids so status dots render correctly.
 * @param {{ data_centres: any[] }} json
 * @returns {any[]}
 */
export function toLoadFacilities(json) {
	return json.data_centres.map((record) => {
		const { mw } = bestMw(record);
		const bucket = normaliseStatus(record.status);
		const code = `dc-${record.id}`;
		const network = record.state ? STATE_NETWORKS[record.state] : undefined;

		/** @type {any} */
		const unit = {
			code: `${code}-U1`,
			code_display: 'DC',
			fueltech_id: 'data_centre',
			dispatch_type: 'LOAD',
			status_id: bucket,
			capacity_maximum: mw ?? 0,
			capacity_registered: null,
			capacity_storage: null,
			max_generation: null,
			isCommissioning: false
		};
		// All loads sit on the timeline by commencement date (getDateField falls
		// through to commencement_date for the DC-native statuses). Construction
		// records fall back to their construction start when no commencement
		// date is recorded.
		const parsed =
			parseRecordDate(record.commencement_date) ?? parseRecordDate(record.construction_date);
		if (parsed) {
			unit.commencement_date = parsed.date;
			if (parsed.specificity) unit.commencement_date_specificity = parsed.specificity;
		}

		return {
			code,
			name: record.name || record.company || 'Unnamed data centre',
			isLoad: true,
			network_id: network ? network.network_id : null,
			network_region: network?.network_region ?? null,
			location:
				record.latitude != null && record.longitude != null
					? { lat: record.latitude, lng: record.longitude }
					: null,
			units: [unit],
			dataCentre: record
		};
	});
}

/** @type {Promise<any> | null} */
let cachedJson = null;

/** Fetch the raw data-centres JSON, once per session. */
function loadDataCentresJson() {
	cachedJson ??= fetch('/data/data-centres-au.json').then((r) => {
		if (!r.ok) throw new Error(`Failed to load data centres: ${r.status}`);
		return r.json();
	});
	return cachedJson;
}

/** @type {Promise<any[]> | null} */
let cachedFacilities = null;

/**
 * Fetch + adapt to pseudo-facility objects, once per session.
 * @returns {Promise<any[]>}
 */
export function loadDataCentreFacilities() {
	cachedFacilities ??= loadDataCentresJson().then(toLoadFacilities);
	return cachedFacilities;
}
