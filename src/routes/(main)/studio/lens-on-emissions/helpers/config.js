/**
 * Sector configuration for emissions chart
 * Maps between CSV column names and internal keys
 */

/**
 * Internal sector keys used throughout the application
 * @type {string[]}
 */
export const SECTOR_KEYS = [
	'agriculture',
	'electricity',
	'fugitives',
	'industrial_processes',
	'stationary_energy',
	'transport',
	'waste',
	'lulucf'
];

/**
 * Order of sectors in the stacked chart (bottom to top)
 * @type {string[]}
 */
export const SECTOR_ORDER = [
	'agriculture',
	'electricity',
	'fugitives',
	'industrial_processes',
	'stationary_energy',
	'transport',
	'waste',
	'lulucf'
];

/**
 * Mapping from quarterly CSV column names to internal keys
 * @type {Record<string, string>}
 */
export const QUARTERLY_CSV_MAP = {
	Electricity: 'electricity',
	Stationary: 'stationary_energy',
	Transport: 'transport',
	Fugitives: 'fugitives',
	Industrial: 'industrial_processes',
	Agriculture: 'agriculture',
	Waste: 'waste',
	'Land sector': 'lulucf'
};

/**
 * Mapping from projections CSV sector names to internal keys
 * @type {Record<string, string>}
 */
export const PROJECTIONS_CSV_MAP = {
	Electricity: 'electricity',
	'Stationary energy': 'stationary_energy',
	Transport: 'transport',
	Fugitives: 'fugitives',
	'Industrial processes': 'industrial_processes',
	Agriculture: 'agriculture',
	Waste: 'waste',
	LULUCF: 'lulucf'
};

/**
 * Display labels for each sector
 * @type {Record<string, string>}
 */
export const SECTOR_LABELS = {
	electricity: 'Electricity',
	stationary_energy: 'Other stationary',
	transport: 'Transport',
	fugitives: 'Fugitives',
	industrial_processes: 'Industrial processes',
	agriculture: 'Agriculture',
	waste: 'Waste',
	lulucf: 'Land management'
};

/**
 * Colors for each sector (matching the screenshot design)
 * @type {Record<string, string>}
 */
export const SECTOR_COLORS = {
	agriculture: '#78350F', // Dark brown
	electricity: '#3B82F6', // Blue
	fugitives: '#F97316', // Orange
	industrial_processes: '#F7C4A3', // Light peach
	stationary_energy: '#FBBF24', // Yellow/amber
	transport: '#9CA3AF', // Gray
	waste: '#1E3A8A', // Dark navy blue
	lulucf: '#4A772F' // Green
};

/**
 * Net total line color
 * @type {string}
 */
export const NET_TOTAL_COLOR = '#C74523';

/**
 * Time range constants
 */
export const TIME_RANGES = {
	HISTORY_START_FY: 1990,
	HISTORY_END_FY: 2004,
	CURRENT_START_FY: 2005,
	CURRENT_END_FY: 2026, // Includes up to Sep-25 (Q3 FY2026) for quarter view
	PROJECTION_START_FY: 2026,
	PROJECTION_END_FY: 2040
};

/**
 * Chart configuration
 */
export const CHART_CONFIG = {
	unit: 'MtCO\u2082e/year',
	prefix: 'M',
	baseUnit: 'tCO\u2082e'
};
