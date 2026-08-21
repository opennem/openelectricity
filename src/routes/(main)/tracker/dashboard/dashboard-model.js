/**
 * Pure composition helpers for the dashboard Tracker. Reactive ownership stays
 * with the page and canvas; this module only validates and transforms values.
 */

export const MAX_PANELS = 12;

export const PANEL_TYPES = [
	'metrics',
	'generation',
	'price',
	'emissions',
	'demand',
	'curtailment',
	'flows',
	'map'
];

export const PANEL_CATALOGUE = [
	{
		type: 'metrics',
		label: 'System metrics',
		description: 'Whole-system indicators for the visible range.'
	},
	{
		type: 'generation',
		label: 'Generation mix',
		description: 'Fuel technology chart and breakdown.'
	},
	{ type: 'price', label: 'Price', description: 'Regional spot price over time.' },
	{ type: 'emissions', label: 'Emissions', description: 'Emissions volume or intensity.' },
	{ type: 'demand', label: 'Demand', description: 'Grid demand over time.' },
	{ type: 'curtailment', label: 'Curtailment', description: 'Wind and utility solar curtailment.' },
	{
		type: 'flows',
		label: 'Interconnector flows',
		description: 'NEM corridor imports and exports.'
	},
	{ type: 'map', label: 'Live map', description: 'Live prices, flows and transmission context.' }
];

export const SINGLETON_PANEL_TYPES = new Set(['metrics', 'map']);
export const WIDTHS = ['half', 'full'];
export const HEIGHTS = ['compact', 'standard', 'tall'];

/** @type {Record<string, ['half'|'full', 'compact'|'standard'|'tall']>} */
const DEFAULT_PANEL_SIZE = {
	metrics: ['full', 'compact'],
	generation: ['full', 'tall'],
	price: ['half', 'standard'],
	emissions: ['half', 'standard'],
	demand: ['half', 'standard'],
	curtailment: ['half', 'standard'],
	flows: ['full', 'standard'],
	map: ['full', 'tall']
};

/** @type {Record<string, {name: string, panels: Array<[string, string]>}>} */
const BUILTIN_DEFINITIONS = {
	analysis: {
		name: 'Analysis',
		panels: [
			['analysis-metrics', 'metrics'],
			['analysis-generation', 'generation'],
			['analysis-price', 'price'],
			['analysis-emissions', 'emissions']
		]
	},
	'live-grid': {
		name: 'Live grid',
		panels: [
			['live-map', 'map'],
			['live-metrics', 'metrics'],
			['live-demand', 'demand'],
			['live-price', 'price'],
			['live-flows', 'flows']
		]
	},
	transition: {
		name: 'Transition',
		panels: [
			['transition-metrics', 'metrics'],
			['transition-generation', 'generation'],
			['transition-emissions', 'emissions'],
			['transition-curtailment', 'curtailment']
		]
	}
};

/** @param {unknown} value @returns {value is Record<string, any>} */
function isRecord(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** @param {unknown} value */
function cleanSettings(value) {
	if (!isRecord(value)) return {};
	// Settings are deliberately JSON-only. A round trip also strips prototypes
	// and unsupported values.
	try {
		const parsed = JSON.parse(JSON.stringify(value));
		return isRecord(parsed) ? parsed : {};
	} catch {
		return {};
	}
}

/**
 * @param {string} instanceId
 * @param {string} type
 * @returns {import('./types.js').DashboardPanelV1 | null}
 */
export function createPanel(instanceId, type) {
	if (!instanceId || !PANEL_TYPES.includes(type)) return null;
	const [width, height] = DEFAULT_PANEL_SIZE[type];
	return { instanceId, type: /** @type {any} */ (type), width, height, settings: {} };
}

/** @param {unknown} value */
export function validatePanel(value) {
	if (!isRecord(value)) return null;
	const instanceId = typeof value.instanceId === 'string' ? value.instanceId.slice(0, 100) : '';
	const type = typeof value.type === 'string' && PANEL_TYPES.includes(value.type) ? value.type : '';
	if (!instanceId || !type) return null;
	const defaults = DEFAULT_PANEL_SIZE[type];
	const width = WIDTHS.includes(value.width) ? value.width : defaults[0];
	const height = HEIGHTS.includes(value.height) ? value.height : defaults[1];
	return {
		instanceId,
		type,
		// The two spatial overview panels always occupy the full canvas width.
		width: type === 'metrics' || type === 'map' ? 'full' : width,
		height,
		settings: cleanSettings(value.settings)
	};
}

/**
 * Invalid entries, repeated instance IDs and extra singleton panels are
 * dropped. The result is always bounded to the dashboard limit.
 * @param {unknown} value
 */
export function validatePanels(value) {
	if (!Array.isArray(value)) return [];
	const ids = new Set();
	const singletons = new Set();
	const panels = [];
	for (const candidate of value) {
		const panel = validatePanel(candidate);
		if (!panel || ids.has(panel.instanceId)) continue;
		if (SINGLETON_PANEL_TYPES.has(panel.type) && singletons.has(panel.type)) continue;
		ids.add(panel.instanceId);
		if (SINGLETON_PANEL_TYPES.has(panel.type)) singletons.add(panel.type);
		panels.push(panel);
		if (panels.length === MAX_PANELS) break;
	}
	return panels;
}

/** @param {string} id */
export function builtinLayout(id = 'analysis') {
	const key = Object.hasOwn(BUILTIN_DEFINITIONS, id) ? id : 'analysis';
	const definition = BUILTIN_DEFINITIONS[key];
	return {
		id: key,
		name: definition.name,
		panels: definition.panels.map(([instanceId, type]) => createPanel(instanceId, type))
	};
}

export function builtinLayouts() {
	return Object.keys(BUILTIN_DEFINITIONS).map((id) => builtinLayout(id));
}

/** @param {Array<any>} panels @param {any} panel */
export function addPanel(panels, panel) {
	const current = validatePanels(panels);
	const next = validatePanel(panel);
	if (!next || current.length >= MAX_PANELS) return current;
	if (current.some((item) => item.instanceId === next.instanceId)) return current;
	if (SINGLETON_PANEL_TYPES.has(next.type) && current.some((item) => item.type === next.type)) {
		return current;
	}
	return [...current, next];
}

/** @param {Array<any>} panels @param {string} instanceId @param {string} duplicateId */
export function duplicatePanel(panels, instanceId, duplicateId) {
	const current = validatePanels(panels);
	const source = current.find((panel) => panel.instanceId === instanceId);
	if (!source || SINGLETON_PANEL_TYPES.has(source.type) || current.length >= MAX_PANELS)
		return current;
	return addPanel(current, {
		...source,
		instanceId: duplicateId,
		settings: cleanSettings(source.settings)
	});
}

/** @param {Array<any>} panels @param {string} instanceId */
export function removePanel(panels, instanceId) {
	return validatePanels(panels).filter((panel) => panel.instanceId !== instanceId);
}

/** @param {Array<any>} panels @param {string} instanceId @param {-1 | 1} direction */
export function movePanel(panels, instanceId, direction) {
	const next = validatePanels(panels);
	const from = next.findIndex((panel) => panel.instanceId === instanceId);
	const to = from + direction;
	if (from < 0 || to < 0 || to >= next.length) return next;
	[next[from], next[to]] = [next[to], next[from]];
	return next;
}

/** @param {Array<any>} panels @param {string} instanceId @param {{ width?: string, height?: string }} size */
export function resizePanel(panels, instanceId, size) {
	return validatePanels(panels).map((panel) =>
		panel.instanceId === instanceId ? (validatePanel({ ...panel, ...size }) ?? panel) : panel
	);
}

/** @param {Array<any>} panels @param {string} instanceId @param {Record<string, unknown>} settings */
export function updatePanelSettings(panels, instanceId, settings) {
	return validatePanels(panels).map((panel) =>
		panel.instanceId === instanceId ? { ...panel, settings: cleanSettings(settings) } : panel
	);
}

/**
 * @param {unknown} value
 * @returns {{kind:'preset', days:number, intervalId:string} | {kind:'custom', startMs:number, endMs:number, intervalId:string}}
 */
export function normaliseRange(value) {
	if (isRecord(value) && value.kind === 'custom') {
		const startMs = Number(value.startMs);
		const endMs = Number(value.endMs);
		if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs) {
			return { kind: 'custom', startMs, endMs, intervalId: String(value.intervalId || '30m') };
		}
	}
	if (isRecord(value) && value.kind === 'preset' && Number.isFinite(Number(value.days))) {
		return {
			kind: 'preset',
			days: Number(value.days),
			intervalId: String(value.intervalId || '30m')
		};
	}
	return { kind: 'preset', days: 7, intervalId: '30m' };
}
