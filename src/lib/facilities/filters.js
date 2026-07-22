import optionsReducer from '$lib/utils/options-reducer';
import { statusColours } from '$lib/theme/openelectricity';
import { STATUS_LABELS as LOAD_STATUS_LABELS } from '$lib/facilities/data-centres.js';
import { getLeafValues } from '$lib/facilities/filter-options.js';

export { statusColours };

export const statusOptions = [
	{
		label: 'Committed',
		value: 'committed',
		colour: statusColours.committed
	},
	{
		label: 'Commissioning',
		value: 'commissioning',
		colour: statusColours.commissioning
	},
	{
		label: 'Operating',
		value: 'operating',
		colour: statusColours.operating
	},
	{
		label: 'Retired',
		value: 'retired',
		colour: statusColours.retired
	}
];

export const ALL_STATUSES = statusOptions.map((opt) => opt.value);
export const DEFAULT_STATUSES = ['operating', 'commissioning'];

// Data centre (load) statuses — a development pipeline distinct from the OE
// facility lifecycle, so the Status filter carries a separate Loads section.
// Built from the canonical bucket labels so filter UI and detail surfaces
// can't drift.
export const loadStatusOptions = Object.entries(LOAD_STATUS_LABELS).map(([value, label]) => ({
	value,
	label,
	colour: statusColours[value]
}));

export const ALL_LOAD_STATUSES = loadStatusOptions.map((opt) => opt.value);
export const DEFAULT_LOAD_STATUSES = ['operating', 'construction'];

// Play mode (the map's year animation) always animates the full grid history,
// ignoring the user's status filter. Committed units have no commencement_date
// yet, so playback reveals them at their expected_operation_date instead —
// extending the timeline into the future (see play-filter.js).
export const PLAY_STATUSES = ['operating', 'commissioning', 'retired', 'committed'];

export const regions = [
	// { longValue: 'au.nem', value: 'nem', label: 'NEM', longLabel: 'National Electricity Market' },
	// { value: undefined, label: '', divider: true },
	{ longValue: 'au.nem.nsw1', value: 'nsw1', label: 'NSW', longLabel: 'New South Wales' },
	{ longValue: 'au.nem.qld1', value: 'qld1', label: 'QLD', longLabel: 'Queensland' },
	{ longValue: 'au.nem.sa1', value: 'sa1', label: 'SA', longLabel: 'South Australia' },
	{ longValue: 'au.nem.tas1', value: 'tas1', label: 'TAS', longLabel: 'Tasmania' },
	{ longValue: 'au.nem.vic1', value: 'vic1', label: 'VIC', longLabel: 'Victoria' },
	{ value: undefined, label: '', divider: true },
	{ longValue: 'au.wem', value: 'wem', label: 'WA', longLabel: 'Western Australia' },
	{ value: undefined, label: '', divider: true },
	// Not OE network regions — data centres (loads) can sit in the ACT or NT,
	// outside the NEM/WEM regions the generator facilities carry.
	{ longValue: 'au.act', value: 'act', label: 'ACT', longLabel: 'Australian Capital Territory' },
	{ longValue: 'au.nt', value: 'nt', label: 'NT', longLabel: 'Northern Territory' }
];

export const networkRegionsOnly = ['nsw1', 'qld1', 'sa1', 'tas1', 'vic1'];

export const regionOptions = [
	{
		value: 'nem',
		label: 'NEM',
		children: [
			{
				value: 'nsw1',
				label: 'New South Wales'
			},
			{
				value: 'qld1',
				label: 'Queensland'
			},
			{
				value: 'sa1',
				label: 'South Australia'
			},
			{
				value: 'tas1',
				label: 'Tasmania'
			},
			{
				value: 'vic1',
				label: 'Victoria'
			}
		]
	},
	{
		value: 'wem',
		label: 'Western Australia'
	},
	// Outside the NEM/WEM — only data centres (loads) carry these regions.
	{
		value: 'act',
		label: 'Australian Capital Territory'
	},
	{
		value: 'nt',
		label: 'Northern Territory'
	}
];

/** @type {{value: string, label: string, colour: string, children?: {value: string, label: string, colour: string}[]}[]} */
export const fuelTechOptions = [
	{
		value: 'solar_utility',
		label: 'Solar',
		colour: '#FED500'
	},
	{
		value: 'wind',
		label: 'Wind',
		colour: '#2C7629'
	},
	{
		value: 'hydro',
		label: 'Hydro',
		colour: '#5EA0C0'
	},
	{
		value: 'battery',
		label: 'Battery',
		colour: '#3245c9',
		children: [
			{ value: 'battery', label: 'Battery (Bidirectional)', colour: '#3245c9' },
			{ value: 'battery_charging', label: 'Battery (Charging)', colour: '#3245c9' },
			{ value: 'battery_discharging', label: 'Battery (Discharging)', colour: '#3245c9' }
		]
	},
	{
		value: 'gas',
		label: 'Gas',
		colour: '#E87809',
		children: [
			{ value: 'gas_recip', label: 'Gas (Reciprocating)', colour: '#F9DCBC' },
			{ value: 'gas_ocgt', label: 'Gas (OCGT)', colour: '#FFCD96' },
			{ value: 'gas_ccgt', label: 'Gas (CCGT)', colour: '#FDB462' },
			{ value: 'gas_steam', label: 'Gas (Steam)', colour: '#F48E1B' },
			{ value: 'gas_wcmg', label: 'Gas (Waste Coal Mine)', colour: '#B46813' }
		]
	},
	{
		value: 'distillate',
		label: 'Distillate',
		colour: '#E15C34'
	},
	{
		value: 'bioenergy',
		label: 'Bioenergy',
		colour: '#1D7A7A',
		children: [
			{ value: 'bioenergy_biomass', label: 'Bioenergy (Biomass)', colour: '#1D7A7A' },
			{ value: 'bioenergy_biogas', label: 'Bioenergy (Biogas)', colour: '#4CB9B9' }
		]
	},
	{
		value: 'coal',
		label: 'Coal',
		colour: '#25170C',
		children: [
			{ value: 'coal_black', label: 'Coal (Black)', colour: '#121212' },
			{ value: 'coal_brown', label: 'Coal (Brown)', colour: '#744A26' }
		]
	}
];

/**
 * Flatten the hierarchical fuel tech options to a simple list for label lookup
 * @returns {{value: string, label: string}[]}
 */
function getFlatFuelTechOptions() {
	/** @type {{value: string, label: string}[]} */
	const flat = [];
	for (const opt of fuelTechOptions) {
		flat.push({ value: opt.value, label: opt.label });
		if (opt.children) {
			for (const child of opt.children) {
				flat.push({ value: child.value, label: child.label });
			}
		}
	}
	return flat;
}

export const fuelTechLabel = optionsReducer(getFlatFuelTechOptions());

// The Type filter: one tree covering dispatch type AND technology.
// Generators nests the full fuel-tech hierarchy (so Gas ▸ CCGT stays
// individually selectable); Loads nests data centres, with room for the
// dataset's other large loads (smelters, refineries, water) as future
// siblings. Selection is literal — what's ticked is what shows (unticking
// everything empties the map and views), unlike the empty-means-all
// convention elsewhere.
export const typeOptions = [
	{ label: 'Generators', value: 'generators', children: fuelTechOptions },
	{
		label: 'Loads',
		value: 'loads',
		children: [{ label: 'Data Centres', value: 'data_centres' }]
	}
];

/** All selectable region values — the Region filter's "everything shown" default. */
export const ALL_REGIONS = getLeafValues(regionOptions);

/** All selectable fuel-tech leaf values (sub-technologies included). */
export const FUEL_TECH_VALUES = getLeafValues(fuelTechOptions);
/** Every value in the fuel-tech tree (groups + leaves) — for row rendering. */
export const FUEL_TECH_OPTION_VALUES = new Set([
	...fuelTechOptions.map((opt) => opt.value),
	...FUEL_TECH_VALUES
]);

// Selectable leaves only — group values ('generators', 'loads', 'gas'…) are
// never stored in a selection.
export const ALL_TYPES = getLeafValues(typeOptions);
// Default: all generator technologies on, loads off (no fuel-tech filter).
export const DEFAULT_TYPES = [...FUEL_TECH_VALUES];

/** Region value → short label (NSW, QLD, …), e.g. for compact selection summaries */
export const regionShortLabels = optionsReducer(regions.filter((r) => r.value));

/**
 * The facilities views in display order — drives both the desktop switcher
 * and the mobile sheet's view toggle.
 */
export const VIEW_OPTIONS = [
	{ label: 'Timeline', value: 'timeline' },
	{ label: 'List', value: 'list' },
	{ label: 'Grid', value: 'grid' }
];

/**
 * Normalise the `view` URL param. 'card' is the legacy name for the grid view
 * and 'map' was retired when the map became always visible; both are kept so
 * shared URLs still work.
 * @param {string | null} raw
 * @returns {string | null}
 */
export function normaliseViewParam(raw) {
	if (raw === 'card') return 'grid';
	if (raw === 'map') return 'list';
	return raw;
}

/**
 * Get the display label for a region
 * @param {string} network_id
 * @param {string} network_region
 * @returns {string}
 */
export function getRegionLabel(network_id, network_region) {
	if (network_region) {
		return regions.find((r) => r.value === network_region.toLowerCase())?.label || network_region;
	}
	return network_id?.toUpperCase() || '';
}

/**
 * Get the full region name (e.g. "New South Wales") for a given network/region.
 * Falls back to the short label, then the raw network_region, then network_id.
 * @param {string} network_id
 * @param {string} network_region
 * @returns {string}
 */
export function getRegionLongLabel(network_id, network_region) {
	if (network_region) {
		const match = regions.find((r) => r.value === network_region.toLowerCase());
		return match?.longLabel || match?.label || network_region;
	}
	return network_id?.toUpperCase() || '';
}
