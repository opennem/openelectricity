<script>
	import { untrack } from 'svelte';
	import { ChartStore, StratumChart } from '$lib/components/charts/v2';
	import { computeYDomain } from '$lib/components/charts/v2/compute-y-domain.js';

	/**
	 * CompareSlopeChart — a slope chart of a comparison: each series' value
	 * at A on the left joined to its value at B on the right, so rises, falls
	 * and crossings read at a glance. Under ranks it is a bump chart (#1 at
	 * the top). Dashed series (the NEM and All Regions among ranked states)
	 * are reference lines that never take a rank of their own.
	 *
	 * On the shared Stratum line chart: a line takes the pointer and reports
	 * its series (`onhover`), and `hovered` stands out on the chart while the
	 * others recede. A and B sit at two synthetic times, so A is always on the
	 * left whichever is earlier. The chart never draws a header: inside a
	 * chart card it would take over the card's.
	 *
	 * @type {{
	 *   rows: import('./chart-compare.js').CompareRow[],
	 *   source: import('../types.js').CompareSource,
	 *   labels: {a: string, b: string},
	 *   hovered?: string,
	 *   onhover?: (id: string | undefined) => void,
	 *   height?: number
	 * }}
	 */
	let { rows, source, labels, hovered, onhover, height = 200 } = $props();

	/** The synthetic x of A and B (never 0: the store reads 0 as unset). */
	const X_A = 1000;
	const X_B = 2000;
	/** Room either side so the end points sit inside the plot. */
	const X_PAD = 160;

	const chart = new ChartStore({
		key: Symbol('compare-slope'),
		title: untrack(() => source.title),
		chartType: 'line',
		timeZone: 'UTC',
		hideDataOptions: true,
		hideChartTypeOptions: true
	});
	chart.chartTooltips.showTotal = false;
	chart.chartStyles.chartPadding = { top: 10, bottom: 22, left: 0, right: 0 };
	chart.chartStyles.lineHitWidth = 10;
	chart.chartOptions.allowHoverHighlight = true;
	chart.chartOptions.prefix = '';
	chart.chartOptions.setAutomaticDisplayPrefix('');
	chart.chartOptions.allowedPrefixes = [];
	chart.useFormatY = true;
	chart.setXDomain(X_A - X_PAD, X_B + X_PAD);
	chart.xTicks = [new Date(X_A), new Date(X_B)];
	chart.xGridlineTicks = [new Date(X_A), new Date(X_B)];

	let ranked = $derived(source.deltaMode === 'rank');
	let lines = $derived(rows.filter((row) => !row.dashed));
	let references = $derived(rows.filter((row) => row.dashed));
	let data = $derived(
		[
			{ time: X_A, side: /** @type {const} */ ('a') },
			{ time: X_B, side: /** @type {const} */ ('b') }
		].map(({ time, side }) => ({
			time,
			date: new Date(time),
			...Object.fromEntries(rows.map((row) => [row.id, row[side]]))
		}))
	);

	$effect(() => {
		chart.chartOptions.baseUnit = ranked ? '' : source.unit;
		chart.formatY = ranked ? (/** @type {number} */ rank) => `#${rank}` : source.format;
		chart.formatTooltipY = ranked ? (/** @type {number} */ rank) => `#${rank}` : source.format;
		chart.maximumFractionDigits = ranked ? 0 : 1;
	});
	$effect(() => {
		chart.seriesNames = lines.map((row) => row.id);
		chart.seriesLabels = Object.fromEntries(rows.map((row) => [row.id, row.label]));
		chart.seriesColours = Object.fromEntries(rows.map((row) => [row.id, row.colour]));
		chart.seriesData = data;
		chart.overlayLines = references.map((row) => ({
			id: row.id,
			data,
			valueKey: row.id,
			colour: row.colour,
			dasharray: '4 3',
			label: row.label,
			tooltipUnit: '',
			formatTooltipValue: ranked ? source.format : undefined,
			hoverable: true
		}));
	});
	$effect(() => {
		chart.formatTickX = (/** @type {Date} */ date) => (Number(date) === X_A ? labels.a : labels.b);
		chart.formatTooltipX = (/** @type {Date} */ date) =>
			Number(date) === X_A ? `A · ${labels.a}` : `B · ${labels.b}`;
	});
	$effect(() => {
		chart.chartStyles.chartHeightPx = height;
	});
	$effect(() => {
		if (ranked) {
			chart.setYDomain([lines.length + 0.5, 0.5]);
			chart.yTicks = lines.map((_, index) => index + 1);
			return;
		}
		chart.yTicks = undefined;
		const values = rows.flatMap((row) => [row.a, row.b]).filter((value) => value !== null);
		chart.setYDomain(
			computeYDomain([{ _min: Math.min(0, ...values), _max: Math.max(0, ...values) }])
		);
	});
	$effect(() => {
		chart.hoverKey = hovered;
	});
</script>

<div class="min-w-0" data-testid="compare-slope">
	<StratumChart
		{chart}
		showHeader={false}
		tooltipMode="floating"
		onhover={(_time, key) => {
			if (key !== undefined) onhover?.(key);
		}}
		onhoverend={() => onhover?.(undefined)}
		onfocus={() => {}}
	/>
</div>
