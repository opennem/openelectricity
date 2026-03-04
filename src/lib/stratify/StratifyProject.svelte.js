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
	/** @type {'stacked-area' | 'area' | 'line'} */
	chartType = $state('stacked-area');

	// --- Series customisation ---
	/** @type {string[]} */
	hiddenSeries = $state([]);

	/** @type {Record<string, string>} */
	userSeriesColours = $state({});

	/** @type {Record<string, string>} */
	userSeriesLabels = $state({});

	// --- Derived from CSV ---
	parsedData = $derived(parseCSV(this.csvText));

	hasData = $derived(this.parsedData.data.length > 0);

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

		// Sync project state → chart store for rendering
		$effect(() => {
			if (this.hasData) {
				this.chartStore.seriesData = this.parsedData.data;
				this.chartStore.seriesNames = this.parsedData.seriesNames;
				this.chartStore.seriesColours = this.seriesColours;
				this.chartStore.seriesLabels = this.seriesLabels;
				this.chartStore.hiddenSeriesNames = this.hiddenSeries;
			} else {
				this.chartStore.seriesData = [];
				this.chartStore.seriesNames = [];
			}
		});

		$effect(() => {
			this.chartStore.chartOptions.selectedChartType = this.chartType;
		});
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
		this.chartType = /** @type {'stacked-area' | 'area' | 'line'} */ (example.chartType);
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
		project.chartType = /** @type {'stacked-area' | 'area' | 'line'} */ (
			snapshot.chartType ?? 'stacked-area'
		);
		project.hiddenSeries = snapshot.hiddenSeries ?? [];
		project.userSeriesColours = snapshot.userSeriesColours ?? {};
		project.userSeriesLabels = snapshot.userSeriesLabels ?? {};
		return project;
	}
}
