<script>
	import { scaleSqrt } from 'd3-scale';
	import PointMap from '$lib/components/map/PointMap.svelte';
	import { parseCSV } from '$lib/stratify/csv-parser.js';
	import { uniqueColumnValues } from '$lib/stratify/chart-data.js';
	import { assignPaletteColours } from '$lib/stratify/colour-palettes.js';

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

	// Range of the size column. scaleSqrt over [minVal, maxVal] → [minR, maxR].
	const sizeRange = $derived.by(() => {
		if (!sizeKey) return null;
		let min = Infinity;
		let max = -Infinity;
		for (const row of rowsWithFirstColAliased) {
			const v = Number(row[sizeKey]);
			if (Number.isFinite(v)) {
				if (v < min) min = v;
				if (v > max) max = v;
			}
		}
		if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
		return { min, max };
	});

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
		popupColumnLabels={dataColumnLabels}
		height={`${height}px`}
	/>
{/if}
