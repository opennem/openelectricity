/**
 * Stratify Plot Project State
 *
 * Centralised reactive state for the new Stratify builder (Plot-based).
 * Contains all authoring state — no ChartStore/Stratum dependency.
 */

import { parseCSV } from '$lib/stratify/csv-parser.js';
import { assignPresetColours, getPreset } from '../_config/chart-styles.js';

/**
 * @typedef {'stacked-area' | 'area' | 'line' | 'bar-stacked' | 'grouped-bar'} ChartType
 */

/**
 * @typedef {Object} StratifyPlotSnapshot
 * @property {number} version
 * @property {string} csvText
 * @property {string} title
 * @property {string} description
 * @property {string} dataSource
 * @property {string} notes
 * @property {ChartType} chartType
 * @property {'auto' | 'time-series' | 'category'} [displayMode]
 * @property {string} stylePreset
 * @property {string[]} hiddenSeries
 * @property {Record<string, string>} userSeriesColours
 * @property {Record<string, string>} userSeriesLabels
 */

export default class StratifyPlotProject {
	// --- Data ---
	/** @type {string} */
	csvText = $state('');

	// --- Metadata ---
	/** @type {string} */
	title = $state('');

	/** @type {string} */
	description = $state('');

	/** @type {string} */
	dataSource = $state('');

	/** @type {string} */
	notes = $state('');

	// --- Chart config ---
	/** @type {'auto' | 'time-series' | 'category'} */
	displayMode = $state('auto');

	/** @type {ChartType} */
	chartType = $state('stacked-area');

	/** @type {string} */
	stylePreset = $state('oe');

	// --- Series customisation ---
	/** @type {string[]} */
	hiddenSeries = $state([]);

	/** @type {Record<string, string>} */
	userSeriesColours = $state({});

	/** @type {Record<string, string>} */
	userSeriesLabels = $state({});

	// --- Publish settings ---
	/** @type {'draft' | 'published'} */
	status = $state('draft');

	/** @type {boolean} */
	showBranding = $state(true);

	// --- Session tracking (not serialised) ---
	/** @type {string | null} */
	currentChartId = $state(null);

	// --- Derived from CSV ---
	parsedData = $derived(parseCSV(this.csvText, {}, this.displayMode));

	hasData = $derived(this.parsedData.data.length > 0);

	isCategory = $derived(this.parsedData.mode === 'category');

	/** Merged colours: user overrides > preset palette > parsed defaults */
	seriesColours = $derived.by(() => {
		const parsed = this.parsedData;
		if (parsed.seriesNames.length === 0) return this.userSeriesColours;

		const presetColours = assignPresetColours(parsed.seriesNames, this.stylePreset);

		/** @type {Record<string, string>} */
		const merged = {};
		for (const name of parsed.seriesNames) {
			merged[name] = this.userSeriesColours[name] || presetColours[name] || parsed.seriesColours[name];
		}
		return merged;
	});

	/** Merged labels: user overrides take precedence over parsed defaults */
	seriesLabels = $derived.by(() => {
		const parsed = this.parsedData;
		if (parsed.seriesNames.length === 0) return this.userSeriesLabels;

		/** @type {Record<string, string>} */
		const merged = {};
		for (const name of parsed.seriesNames) {
			merged[name] = this.userSeriesLabels[name] || parsed.seriesLabels[name];
		}
		return merged;
	});

	/** The active style preset config */
	activePreset = $derived(getPreset(this.stylePreset));

	/** Visible series names (excluding hidden) */
	visibleSeriesNames = $derived(
		this.parsedData.seriesNames.filter((name) => !this.hiddenSeries.includes(name))
	);

	/** Visible data rows with hidden series stripped */
	visibleData = $derived.by(() => {
		if (!this.hasData) return [];
		const hidden = new Set(this.hiddenSeries);
		if (hidden.size === 0) return this.parsedData.data;

		return this.parsedData.data.map((row) => {
			/** @type {Record<string, any>} */
			const filtered = {};
			for (const [key, value] of Object.entries(row)) {
				if (!hidden.has(key)) filtered[key] = value;
			}
			return filtered;
		});
	});

	constructor() {
		// Auto-switch chart type when data mode changes
		$effect(() => {
			if (this.isCategory) {
				if (this.chartType !== 'grouped-bar' && this.chartType !== 'bar-stacked') {
					this.chartType = 'grouped-bar';
				}
			}
		});
	}

	/** Reset the project to a blank state. */
	reset() {
		this.csvText = '';
		this.title = '';
		this.description = '';
		this.dataSource = '';
		this.notes = '';
		this.displayMode = 'auto';
		this.chartType = 'stacked-area';
		this.stylePreset = 'oe';
		this.hiddenSeries = [];
		this.userSeriesColours = {};
		this.userSeriesLabels = {};
		this.status = 'draft';
		this.showBranding = true;
		this.currentChartId = null;
	}

	/**
	 * Load an example dataset into the project.
	 * @param {{ csvData: string, title: string, description: string, dataSource: string, notes: string, chartType: string }} example
	 */
	loadExample(example) {
		this.csvText = example.csvData;
		this.title = example.title;
		this.description = example.description;
		this.dataSource = example.dataSource;
		this.notes = example.notes;
		this.chartType = /** @type {ChartType} */ (example.chartType);
		this.displayMode = 'auto';
		this.stylePreset = 'oe';
		this.userSeriesColours = {};
		this.userSeriesLabels = {};
		this.hiddenSeries = [];
		this.currentChartId = null;
	}

	/**
	 * Serialise the project to a plain object for persistence.
	 * @returns {StratifyPlotSnapshot}
	 */
	toJSON() {
		return {
			version: 1,
			csvText: this.csvText,
			title: this.title,
			description: this.description,
			dataSource: this.dataSource,
			notes: this.notes,
			chartType: this.chartType,
			displayMode: this.displayMode,
			stylePreset: this.stylePreset,
			hiddenSeries: this.hiddenSeries,
			userSeriesColours: this.userSeriesColours,
			userSeriesLabels: this.userSeriesLabels
		};
	}

	/**
	 * Populate this project from a snapshot (or Sanity chart document).
	 * @param {StratifyPlotSnapshot & Record<string, any>} snapshot
	 */
	loadFromSnapshot(snapshot) {
		this.csvText = snapshot.csvText ?? '';
		this.title = snapshot.title ?? '';
		this.description = snapshot.description ?? '';
		this.dataSource = snapshot.dataSource ?? '';
		this.notes = snapshot.notes ?? '';
		this.chartType = /** @type {ChartType} */ (snapshot.chartType ?? 'stacked-area');
		this.displayMode = snapshot.displayMode ?? 'auto';
		this.stylePreset = snapshot.stylePreset ?? 'oe';
		this.hiddenSeries = snapshot.hiddenSeries ?? [];
		this.userSeriesColours = snapshot.userSeriesColours ?? {};
		this.userSeriesLabels = snapshot.userSeriesLabels ?? {};
		this.status = snapshot.status ?? 'draft';
		this.showBranding = snapshot.showBranding ?? true;
	}
}
