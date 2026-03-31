/**
 * Stratify Project State
 *
 * Centralised reactive state for the Stratify chart builder.
 * Contains all authoring state and composes a ChartStore for rendering.
 */

import ChartStore from '$lib/components/charts/v2/ChartStore.svelte.js';
import { parseCSV } from './csv-parser.js';

/**
 * @typedef {Object} StratifyProjectSnapshot
 * @property {number} version
 * @property {string} csvText
 * @property {string} title
 * @property {string} description
 * @property {string} dataSource
 * @property {string} notes
 * @property {string} chartType
 * @property {'auto' | 'time-series' | 'category'} [displayMode]
 * @property {string[]} hiddenSeries
 * @property {Record<string, string>} userSeriesColours
 * @property {Record<string, string>} userSeriesLabels
 */

export default class StratifyProject {
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

	/** @type {import('$lib/components/charts/v2/types.js').ChartType} */
	chartType = $state('stacked-area');

	// --- Series customisation ---
	/** @type {string[]} */
	hiddenSeries = $state([]);

	/** @type {Record<string, string>} */
	userSeriesColours = $state({});

	/** @type {Record<string, string>} */
	userSeriesLabels = $state({});

	// --- Session tracking (not serialised) ---
	/** @type {string | null} */
	currentChartId = $state(null);

	// --- Derived from CSV ---
	parsedData = $derived(parseCSV(this.csvText, {}, this.displayMode));

	hasData = $derived(this.parsedData.data.length > 0);

	isCategory = $derived(this.parsedData.mode === 'category');

	/** Merged colours: user overrides take precedence over parsed defaults */
	seriesColours = $derived.by(() => {
		const parsed = this.parsedData;
		if (parsed.seriesNames.length === 0) return this.userSeriesColours;

		/** @type {Record<string, string>} */
		const merged = {};
		for (const name of parsed.seriesNames) {
			merged[name] = this.userSeriesColours[name] || parsed.seriesColours[name];
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

	// --- Chart store (composition) ---
	/** @type {ChartStore} */
	chartStore;

	constructor() {
		this.chartStore = new ChartStore({
			key: Symbol('stratify'),
			title: '',
			chartType: 'stacked-area',
			hideDataOptions: true,
			hideChartTypeOptions: true
		});

		// Sync all project state → chart store in a single effect to avoid
		// intermediate states where chart type and data are out of sync.
		$effect(() => {
			// Category mode settings
			this.chartStore.isCategoryChart = this.isCategory;
			this.chartStore.xKey = this.isCategory ? 'category' : 'date';
			this.chartStore.formatX = this.isCategory
				? (/** @type {any} */ d) => String(d)
				: (/** @type {any} */ d) => d;

			// Chart type
			this.chartStore.chartOptions.selectedChartType = this.chartType;

			// Series data
			if (this.hasData) {
				this.chartStore.seriesData = /** @type {any} */ (this.parsedData.data);
				this.chartStore.seriesNames = this.parsedData.seriesNames;
				this.chartStore.seriesColours = this.seriesColours;
				this.chartStore.seriesLabels = this.seriesLabels;
				this.chartStore.hiddenSeriesNames = this.hiddenSeries;
			} else {
				this.chartStore.seriesData = [];
				this.chartStore.seriesNames = [];
			}
		});

		// Auto-switch chart type when data mode changes
		// Category mode only supports bar types; time-series supports all types
		$effect(() => {
			if (this.isCategory) {
				if (this.chartType !== 'grouped-bar' && this.chartType !== 'bar-stacked') {
					this.chartType = 'grouped-bar';
				}
			}
		});
	}

	/**
	 * Reset the project to a blank state.
	 */
	reset() {
		this.csvText = '';
		this.title = '';
		this.description = '';
		this.dataSource = '';
		this.notes = '';
		this.displayMode = 'auto';
		this.chartType = 'stacked-area';
		this.hiddenSeries = [];
		this.userSeriesColours = {};
		this.userSeriesLabels = {};
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
		this.chartType = /** @type {import('$lib/components/charts/v2/types.js').ChartType} */ (
			example.chartType
		);
		this.displayMode = 'auto';
		this.userSeriesColours = {};
		this.userSeriesLabels = {};
		this.hiddenSeries = [];
	}

	/**
	 * Serialise the project to a plain object for persistence.
	 * @returns {StratifyProjectSnapshot}
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
			hiddenSeries: this.hiddenSeries,
			userSeriesColours: this.userSeriesColours,
			userSeriesLabels: this.userSeriesLabels
		};
	}

	/**
	 * Restore a project from a snapshot.
	 * @param {StratifyProjectSnapshot} snapshot
	 * @returns {StratifyProject}
	 */
	static fromJSON(snapshot) {
		const project = new StratifyProject();
		project.csvText = snapshot.csvText ?? '';
		project.title = snapshot.title ?? '';
		project.description = snapshot.description ?? '';
		project.dataSource = snapshot.dataSource ?? '';
		project.notes = snapshot.notes ?? '';
		project.chartType = /** @type {import('$lib/components/charts/v2/types.js').ChartType} */ (
			snapshot.chartType ?? 'stacked-area'
		);
		project.displayMode = snapshot.displayMode ?? 'auto';
		project.hiddenSeries = snapshot.hiddenSeries ?? [];
		project.userSeriesColours = snapshot.userSeriesColours ?? {};
		project.userSeriesLabels = snapshot.userSeriesLabels ?? {};
		return project;
	}
}
