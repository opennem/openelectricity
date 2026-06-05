<script>
	import { scaleSqrt, scaleLinear } from 'd3-scale';
	import { interpolateLab } from 'd3-interpolate';
	import PointMap from '$lib/components/map/PointMap.svelte';
	import { parseCSV } from '$lib/stratify/csv-parser.js';
	import { uniqueColumnValues } from '$lib/stratify/chart-data.js';
	import { assignPaletteColours } from '$lib/stratify/colour-palettes.js';
	import { makeValueFormatter } from '$lib/components/charts/plot/plot-configs.js';

	/** First-column synthetic keys, by parse mode. The CSV parser stores the
	 * first column under one of these instead of the column's own key. */
	const FIRST_COL_SYNTHETIC_KEY = {
		category: 'category',
		linear: 'linear',
		'time-series': '_dateStr'
	};

	/**
	 * @type {{
	 *   chart: any,
	 *   height?: number
	 * }}
	 */
	let { chart, height = 500 } = $props();

	const parsed = $derived(
		parseCSV(chart.csvText, {}, chart.displayMode ?? 'auto', chart.xColumn || 0)
	);

	const dataColumnLabels = $derived(
		Object.fromEntries(
			(parsed.allColumns ?? []).map((/** @type {{ key: string, label: string }} */ col) => [
				col.key,
				col.label
			])
		)
	);

	const latKey = $derived(chart.latColumn ?? null);
	const lngKey = $derived(chart.lngColumn ?? null);
	const labelKey = $derived(chart.labelColumn ?? null);
	const sizeKey = $derived(chart.sizeColumn ?? null);

	// Alias the parser's synthetic first-column value (e.g. `category`) onto
	// the column's display key (e.g. `name`) so every downstream lookup
	// (size, colour, label, popup) works whether the user picked the first
	// column or any later one.
	const firstColKey = $derived(parsed.allColumns?.[0]?.key ?? null);
	const firstValueKey = $derived(FIRST_COL_SYNTHETIC_KEY[parsed.mode] ?? '_dateStr');
	const rowsWithFirstColAliased = $derived.by(() => {
		if (!firstColKey) return parsed.data;
		return parsed.data.map((/** @type {Record<string, any>} */ row) =>
			row[firstColKey] === undefined ? { ...row, [firstColKey]: row[firstValueKey] } : row
		);
	});

	/**
	 * Min/max of a numeric column across the alias-resolved rows.
	 * @param {string} col
	 * @returns {{ min: number, max: number } | null}
	 */
	function columnExtent(col) {
		let min = Infinity;
		let max = -Infinity;
		for (const row of rowsWithFirstColAliased) {
			const v = Number(row[col]);
			if (Number.isFinite(v)) {
				if (v < min) min = v;
				if (v > max) max = v;
			}
		}
		return Number.isFinite(min) && Number.isFinite(max) ? { min, max } : null;
	}

	// Range of the size column. scaleSqrt over [minVal, maxVal] → [minR, maxR].
	const sizeRange = $derived(sizeKey ? columnExtent(sizeKey) : null);

	const minRadius = $derived(chart.mapMinRadius ?? 4);
	const maxRadius = $derived(chart.mapMaxRadius ?? 24);
	const fixedRadius = $derived(Math.round((minRadius + maxRadius) / 2));

	const sizeScale = $derived.by(() => {
		if (!sizeRange) return null;
		if (sizeRange.min === sizeRange.max) {
			return () => fixedRadius;
		}
		return scaleSqrt().domain([sizeRange.min, sizeRange.max]).range([minRadius, maxRadius]);
	});

	const colourColumn = $derived(chart.colourColumn ?? null);
	const colourMode = $derived(chart.mapColourMode ?? 'single');

	const colourGroupNames = $derived(
		colourMode === 'category' && colourColumn
			? uniqueColumnValues(rowsWithFirstColAliased, colourColumn).map(String)
			: []
	);

	const categoryColours = $derived.by(() => {
		if (colourMode !== 'category' || colourGroupNames.length === 0) return {};
		const preset = assignPaletteColours(colourGroupNames, chart.colourPalette ?? 'oe-energy');
		/** @type {Record<string, string>} */
		const merged = {};
		const overrides = chart.userSeriesColours ?? {};
		for (const name of colourGroupNames) {
			merged[name] = overrides[name] || preset[name] || '#3b82f6';
		}
		return merged;
	});

	const singleColour = $derived(chart.singleMarkerColour ?? '#3b82f6');

	// Range mode: interpolate marker colour across the numeric colour column,
	// from mapRangeMinColour (at the lowest value) to mapRangeMaxColour (highest).
	const rangeMinColour = $derived(chart.mapRangeMinColour ?? '#dbeafe');
	const rangeMaxColour = $derived(chart.mapRangeMaxColour ?? '#1e3a8a');

	const colourRange = $derived(
		colourMode === 'range' && colourColumn ? columnExtent(colourColumn) : null
	);

	const colourScale = $derived.by(() => {
		if (!colourRange) return null;
		if (colourRange.min === colourRange.max) return () => rangeMaxColour;
		return scaleLinear()
			.domain([colourRange.min, colourRange.max])
			.range([rangeMinColour, rangeMaxColour])
			.interpolate(interpolateLab);
	});

	const points = $derived.by(() => {
		if (!latKey || !lngKey) return [];
		/** @type {import('$lib/components/map/types.js').MapPoint[]} */
		const out = [];
		let i = 0;
		for (const row of rowsWithFirstColAliased) {
			const lat = Number(row[latKey]);
			const lng = Number(row[lngKey]);
			if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
			if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;

			let radius = fixedRadius;
			if (sizeScale && sizeKey) {
				const v = Number(row[sizeKey]);
				radius = Number.isFinite(v) ? Number(sizeScale(v)) : minRadius;
			}

			let colour = singleColour;
			if (colourMode === 'category' && colourColumn) {
				const key = String(row[colourColumn] ?? '');
				colour = categoryColours[key] ?? singleColour;
			} else if (colourMode === 'range' && colourScale && colourColumn) {
				const v = Number(row[colourColumn]);
				colour = Number.isFinite(v) ? String(colourScale(v)) : rangeMinColour;
			}

			const label = labelKey ? String(row[labelKey] ?? '') : '';

			out.push({
				id: i++,
				lat,
				lng,
				label,
				colour,
				radius,
				raw: row
			});
		}
		return out;
	});

	const popupColumns = $derived(chart.tooltipColumns ?? []);
	const mapTheme = $derived(chart.mapTheme ?? 'light');

	// Shared value formatter for the numeric legend channels (range colour + size).
	const valueFormatter = $derived(makeValueFormatter(chart.valueFormat ?? '1'));

	// Legend descriptor — two independent channels. `colour` mirrors the active
	// colour mode (category labels reuse the per-group overrides set in the Series
	// panel; the range/category title uses the colour column's display label).
	// `size` describes the radius encoding, shown only when the size column spans
	// an actual range (a constant column gives every marker the same radius).
	const legend = $derived.by(() => {
		if ((chart.showLegend ?? true) === false) return null;
		const overrides = chart.userSeriesLabels ?? {};
		const columnLabel = colourColumn ? (dataColumnLabels[colourColumn] ?? colourColumn) : undefined;

		/** @type {import('$lib/components/map/types.js').MapColourLegend} */
		let colour;
		if (colourMode === 'category' && colourColumn && colourGroupNames.length > 0) {
			colour = {
				mode: 'category',
				label: columnLabel,
				items: colourGroupNames.map((name) => ({
					label: overrides[name] || name,
					colour: categoryColours[name] ?? singleColour
				}))
			};
		} else if (colourMode === 'range' && colourColumn && colourRange) {
			colour = {
				mode: 'range',
				label: columnLabel,
				min: colourRange.min,
				max: colourRange.max,
				minColour: rangeMinColour,
				maxColour: rangeMaxColour,
				formatValue: (/** @type {number} */ n) => String(valueFormatter(n))
			};
		} else {
			const singleLabel = labelKey ? dataColumnLabels[labelKey] : undefined;
			colour = { mode: 'single', colour: singleColour, label: singleLabel };
		}

		/** @type {import('$lib/components/map/types.js').MapSizeLegend | null} */
		let size = null;
		if (sizeKey && sizeRange && sizeScale && sizeRange.min !== sizeRange.max) {
			const mid = (sizeRange.min + sizeRange.max) / 2;
			size = {
				label: dataColumnLabels[sizeKey] ?? sizeKey,
				stops: [sizeRange.min, mid, sizeRange.max].map((value) => ({
					value,
					radius: Number(sizeScale(value))
				})),
				formatValue: (/** @type {number} */ n) => String(valueFormatter(n))
			};
		}

		return { colour, size };
	});

	const missingMapping = $derived(!latKey || !lngKey);
</script>

{#if missingMapping}
	<div
		class="flex items-center justify-center bg-warm-grey/20 rounded-md p-6 text-center text-xs text-mid-grey"
		style="height: {height}px;"
	>
		Pick a latitude and longitude column in the Chart panel to render the map.
	</div>
{:else if points.length === 0}
	<div
		class="flex items-center justify-center bg-warm-grey/20 rounded-md p-6 text-center text-xs text-mid-grey"
		style="height: {height}px;"
	>
		No valid lat/lng rows in the data.
	</div>
{:else}
	<PointMap
		{points}
		{mapTheme}
		{popupColumns}
		{legend}
		popupColumnLabels={dataColumnLabels}
		height={`${height}px`}
	/>
{/if}
