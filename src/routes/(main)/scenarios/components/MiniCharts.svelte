<script>
	import ChartStore from '$lib/components/charts/v2/ChartStore.svelte.js';
	import StratumChart from '$lib/components/charts/v2/StratumChart.svelte';
	import Icon from '$lib/components/Icon.svelte';

	import { scenarioLabelMap } from '../page-data-options/models';

	/**
	 * @typedef {Object} Props
	 * @property {string[]} seriesNames
	 * @property {Record<string, string>} seriesLabels
	 * @property {Record<string, string>} seriesColours
	 * @property {TimeSeriesData[]} seriesData
	 * @property {string[]} [seriesLoadsIds]
	 * @property {string} [displayUnit]
	 * @property {boolean} [isButton]
	 * @property {string} [selected]
	 * @property {Record<string, string> | null} [seriesPathways]
	 * @property {boolean} [showIcon]
	 * @property {boolean} [showArea]
	 * @property {string} [gridColClass]
	 * @property {string} [gridGapClass]
	 * @property {string} [sectionBorderClass]
	 * @property {number | undefined} [hoverTime]
	 * @property {number | undefined} [focusTime]
	 * @property {any} [xTicks]
	 * @property {(value: any, timeZone?: string) => string} [formatTickX]
	 * @property {(value: number) => string} [formatTickY]
	 * @property {number | undefined} [overlayStart]
	 * @property {(time: number, key?: string) => void} [onhover]
	 * @property {() => void} [onhoverend]
	 * @property {(time: number) => void} [onfocus]
	 * @property {(detail: { key: string }) => void} [onscenarioclick]
	 */

	/** @type {Props} */
	let {
		seriesNames,
		seriesLabels,
		seriesColours,
		seriesData,
		seriesLoadsIds = [],
		displayUnit = '',
		isButton = false,
		selected = '',
		seriesPathways = null,
		showIcon = false,
		showArea = true,
		gridColClass = 'grid-cols-2 md:grid-cols-3',
		gridGapClass = 'gap-3',
		sectionBorderClass = '',
		hoverTime,
		focusTime,
		xTicks,
		formatTickX,
		formatTickY,
		overlayStart,
		shadingData = [],
		shadingFill = '',
		onhover,
		onhoverend,
		onfocus,
		onscenarioclick
	} = $props();

	/**
	 * @param {string} key
	 */
	function handleScenarioClick(key) {
		if (isButton) {
			onscenarioclick?.({ key });
		}
	}

	let tag = $derived(isButton ? 'button' : 'header');

	// Normalise overlayStart to a ms timestamp
	let overlayStartMs = $derived.by(() => {
		if (overlayStart == null) return undefined;
		if (typeof overlayStart === 'number') return overlayStart;
		const d = /** @type {any} */ (overlayStart)?.date;
		return d ? +new Date(d) : undefined;
	});

	// Overlay start as a Date (shared reference for ticks + highlight)
	let overlayStartDate = $derived(overlayStartMs != null ? new Date(overlayStartMs) : null);

	// Compute mini chart ticks: start year, overlay start year, end year
	let miniTicks = $derived.by(() => {
		if (!seriesData.length) return xTicks;
		const first = seriesData[0];
		const last = seriesData[seriesData.length - 1];
		if (!first?.time || !last?.time) return xTicks;

		/** @type {Date[]} */
		const ticks = [new Date(first.time), new Date(last.time)];

		if (overlayStartDate) {
			ticks.splice(1, 0, overlayStartDate);
		}

		return ticks;
	});

	// Highlight ticks — same reference as in miniTicks for exact match
	let highlightTicks = $derived(overlayStartDate ? [overlayStartDate] : []);

	/** Negate loads in the dataset */
	let dataset = $derived(
		seriesData.map((d) => {
			const obj = { ...d };
			seriesLoadsIds.forEach((id) => {
				obj[id] = d[id] ? -d[id] : d[id];
			});
			return obj;
		})
	);

	/**
	 * Store pool + reactive entries list.
	 * A single $effect syncs all props into ChartStore instances — this is the
	 * correct pattern because ChartStore is an external stateful object (its
	 * properties are $state) that cannot be written inside $derived.
	 */
	const storePool = new Map();

	/** @type {Array<[string, ChartStore]>} */
	let miniChartEntries = $state([]);

	$effect(() => {
		const chartType = showArea ? 'stacked-area' : 'line';
		const currentKeys = new Set(seriesNames);

		for (const key of storePool.keys()) {
			if (!currentKeys.has(key)) storePool.delete(key);
		}

		for (const key of seriesNames) {
			let store = storePool.get(key);
			if (!store) {
				store = new ChartStore({
					key: Symbol(key),
					chartType,
					hideDataOptions: true,
					hideChartTypeOptions: true,
					chartStyles: { chartHeightClasses: 'h-[150px]' }
				});
				storePool.set(key, store);
			}

			store.seriesData = dataset;
			store.seriesNames = [key];
			store.seriesColours = { [key]: seriesColours[key] };
			store.seriesLabels = { [key]: seriesLabels[key] };
			store.hoverTime = hoverTime;
			store.focusTime = focusTime;
			// Show gridlines but make default stroke transparent — only highlighted ticks visible
			store.chartStyles.xGridlines = true;
			store.chartStyles.xAxisStroke = 'transparent';
			store.chartStyles.lastYTickDy = 10;
			store.xHighlightTicks = highlightTicks;
			if (miniTicks) store.xTicks = miniTicks;
			if (formatTickX) store.formatTickX = formatTickX;
			if (shadingData.length) store.shadingData = shadingData;
			if (shadingFill) store.shadingFill = shadingFill;

			// Y-axis: set ticks to data min/max and use parent's formatter
			if (formatTickY) {
				store.useFormatY = true;
				store.formatY = formatTickY;
			}
			const seriesKey = key;
			const vals = dataset
				.map((d) => /** @type {number | null} */ (d[seriesKey]))
				.filter((v) => v != null);
			if (vals.length) {
				const min = Math.min(0, .../** @type {number[]} */ (vals));
				const max = Math.max(.../** @type {number[]} */ (vals));
				store.yTicks = [min, max];
			}
		}

		miniChartEntries = seriesNames.map(
			(key) => /** @type {[string, ChartStore]} */ ([key, storePool.get(key)])
		);
	});

	/**
	 * @param {ChartStore} store
	 * @param {string} key
	 * @returns {number | undefined}
	 */
	function getDisplayValue(store, key) {
		const data = store.hoverData || store.focusData;
		if (!data) return undefined;
		const raw = /** @type {number | undefined} */ (data[key]);
		if (raw == null) return undefined;
		return seriesLoadsIds.includes(key) ? -raw : raw;
	}

	/**
	 * @param {ChartStore} store
	 */
	function getDisplayTime(store) {
		return store.hoverTime || store.focusTime;
	}
</script>

<div class="grid {gridColClass} {gridGapClass}">
	{#each [...miniChartEntries].reverse() as [key, store] (key)}
		{@const title = scenarioLabelMap[key] || seriesLabels[key]}
		{@const displayValue = getDisplayValue(store, key)}
		{@const displayTime = getDisplayTime(store)}

		<section
			class="p-8 {sectionBorderClass || 'border-warm-grey border'}"
			class:rounded-xl={isButton}
			class:hover:!border-mid-warm-grey={isButton}
			class:!border-mid-grey={selected === key}
			class:shadow-xl={selected === key}
		>
			<svelte:element
				this={tag}
				class="block w-full text-left"
				role={isButton ? 'button' : 'header'}
				tabindex={isButton ? 0 : undefined}
				aria-label={title}
				onmousedown={() => handleScenarioClick(key)}
			>
				<div class="flex flex-col">
					<div class="flex justify-between items-center">
						<h6 {title} class="truncate mb-0 col-span-5 text-dark-grey">{title}</h6>
						{#if showIcon}
							<Icon icon={key.replace(/\.(energy|power)\..+$/, '')} size={28} />
						{/if}
					</div>
					{#if seriesPathways && seriesPathways[key]}
						<small class="text-xs text-mid-grey">{seriesPathways[key]}</small>
					{/if}
				</div>

				<h3 class="leading-sm h-14 mt-4 mb-0">
					{#if displayTime}
						{displayValue != null && formatTickY ? formatTickY(displayValue) : '—'}
						<small class="block text-xs text-mid-grey font-light">{displayUnit}</small>
					{/if}
				</h3>
			</svelte:element>

			<div class="text-right h-8">
				{#if displayTime && formatTickX}
					<span class="text-mid-grey text-xs">
						{formatTickX(new Date(displayTime))}
					</span>
				{/if}
			</div>

			<StratumChart
				chart={store}
				overlayStart={overlayStartMs}
				showHeader={false}
				showTooltip={false}
				{onhover}
				{onhoverend}
				{onfocus}
			/>
		</section>
	{/each}
</div>
