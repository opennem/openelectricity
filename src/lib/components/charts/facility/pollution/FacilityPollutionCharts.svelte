<script>
	import MiniCharts from '$lib/components/charts/v2/MiniCharts.svelte';
	import { CATEGORY_META, getCategoryPalette } from './pollution-constants.js';

	/**
	 * Small-multiples view for the public /facility/[code] pollution panel.
	 * Wraps the shared `MiniCharts` component so cards visually match the
	 * /scenarios small-multiples — white card, large bold latest-year value
	 * top-left, FY label top-right, area chart with a dashed max-line.
	 *
	 * Pollutants are grouped by category (Air Pollutants / Water Pollutants /
	 * Heavy Metals / Organics) so the layout mirrors `PollutionDataTable`.
	 *
	 * Hover state is lifted up here so a hover on any card syncs the hover
	 * indicator + displayed value across every other card (including across
	 * categories), and the floating tooltip is enabled to mirror the main
	 * facility chart.
	 *
	 * @type {{ data: import('./transform-pollution.js').PollutionData }}
	 */
	let { data } = $props();

	/** @type {number | undefined} */
	let hoverTime = $state(undefined);
	/** @type {number | undefined} */
	let focusTime = $state(undefined);

	/** @param {number} time */
	function handleHover(time) {
		hoverTime = time;
	}
	function handleHoverEnd() {
		hoverTime = undefined;
	}
	/** @param {number} time */
	function handleFocus(time) {
		focusTime = focusTime === time ? undefined : time;
	}

	/** @type {string[]} */
	let categoryOrder = $derived(
		Object.keys(CATEGORY_META).filter((key) => data.byCategory[key]?.length)
	);

	/**
	 * Format a year key (e.g. "2020-07-01" or "2020") as Australian fiscal
	 * year (`FY21` for the year starting 1 July 2020).
	 * @param {Date | number | string} value
	 * @returns {string}
	 */
	function fiscalYearLabel(value) {
		const startYear =
			value instanceof Date
				? value.getUTCFullYear()
				: parseInt(String(value).slice(0, 4), 10);
		if (Number.isNaN(startYear)) return '';
		const fyEnd = (startYear + 1) % 100;
		return `FY${String(fyEnd).padStart(2, '0')}`;
	}

	/**
	 * Format a mass value (assumed kg base) with the appropriate SI scale —
	 * kg / t / kt / Mt for large values, g / mg / µg for sub-kilogram values.
	 * Keeps each card's labels readable regardless of the pollutant's
	 * magnitude (NOx in tens of kt vs. dioxins in micrograms).
	 *
	 * @param {number} v
	 * @returns {string}
	 */
	function formatPollutantMass(v) {
		if (v == null) return '—';
		if (v === 0) return '0';
		const abs = Math.abs(v);
		const fmt = (/** @type {number} */ n) =>
			n.toLocaleString('en-AU', { maximumFractionDigits: 2 });
		if (abs >= 1e9) return `${fmt(v / 1e9)} Mt`;
		if (abs >= 1e6) return `${fmt(v / 1e6)} kt`;
		if (abs >= 1e3) return `${fmt(v / 1e3)} t`;
		if (abs >= 1) return `${fmt(v)} kg`;
		if (abs >= 1e-3) return `${fmt(v * 1e3)} g`;
		if (abs >= 1e-6) return `${fmt(v * 1e6)} mg`;
		return `${fmt(v * 1e9)} µg`;
	}

	/**
	 * Reshape a single category's `PollutantSeries[]` into the prop bundle
	 * `MiniCharts` expects. Returns null if the category has no usable data.
	 *
	 * `time` is the start-of-FY (1 July) timestamp; `date` is the same value
	 * as a Date — ChartStore's default xKey is 'date' so the area path reads
	 * from there, while hover lookups go through `time`.
	 *
	 * @param {string} catKey
	 */
	function buildCategoryProps(catKey) {
		const pollutants = data.byCategory[catKey] ?? [];
		const active = pollutants.filter((p) =>
			Object.values(p.values).some((v) => v != null)
		);
		if (!active.length) return null;

		const seriesNames = active.map((p) => p.code);
		/** @type {Record<string, string>} */
		const seriesLabels = Object.fromEntries(active.map((p) => [p.code, p.label]));
		const palette = getCategoryPalette(catKey, active.length);
		/** @type {Record<string, string>} */
		const seriesColours = Object.fromEntries(
			active.map((p, i) => [p.code, palette[i]])
		);

		const seriesData = data.years.map((year) => {
			const startYear = parseInt(String(year).slice(0, 4), 10);
			const time = Date.UTC(startYear, 6, 1);
			/** @type {Record<string, any>} */
			const row = { time, date: new Date(time) };
			for (const p of active) row[p.code] = p.values[year] ?? null;
			return row;
		});

		return { seriesNames, seriesLabels, seriesColours, seriesData };
	}

	// Cache the per-category prop bundles so hover-driven re-renders don't
	// re-run buildCategoryProps (which allocates fresh arrays + Date objects)
	// — the result only depends on `data`, not on hover state. Without this,
	// every mousemove cascades into MiniCharts seeing a fresh `seriesData`
	// reference and re-syncing every per-series ChartStore.
	let categoryPropsByKey = $derived(
		Object.fromEntries(categoryOrder.map((key) => [key, buildCategoryProps(key)]))
	);
</script>

<div class="space-y-5">
	{#each categoryOrder as catKey (catKey)}
		{@const catMeta = CATEGORY_META[catKey]}
		{@const props = categoryPropsByKey[catKey]}

		{#if props}
			<section>
				<header
					class="text-[10px] text-mid-grey uppercase tracking-widest mb-3 pb-1 border-b border-dark-grey font-sans flex items-center gap-1.5"
				>
					<span
						class="inline-block w-1.5 h-1.5 rounded-full"
						style:background-color={catMeta.colour}
					></span>
					{catMeta.label}
				</header>

				<MiniCharts
					seriesNames={props.seriesNames}
					seriesLabels={props.seriesLabels}
					seriesColours={props.seriesColours}
					seriesData={props.seriesData}
					displayUnit=""
					gridColClass="grid-cols-2 md:grid-cols-4"
					gridGapClass="gap-3"
					sectionPaddingClass="p-4"
					sectionBorderClass="rounded-xl border border-warm-grey"
					reverseOrder={false}
					showMaxReferenceLine={true}
					tooltipMode="compact-strip"
					showCardSummary={false}
					{hoverTime}
					{focusTime}
					formatTickX={fiscalYearLabel}
					formatTickY={formatPollutantMass}
					onhover={handleHover}
					onhoverend={handleHoverEnd}
					onfocus={handleFocus}
				/>
			</section>
		{/if}
	{/each}
</div>
