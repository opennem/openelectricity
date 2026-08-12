<script>
	/**
	 * DemoChart — an illustrative "typical day" stacked generation profile
	 * rendered through the real Stratum chart stack, so the specimen shows the
	 * production chart styling (gridlines, axis text, tooltip strip, focus
	 * treatment) with the canonical fuel-tech palette. Data is synthetic and
	 * deterministic — a fixed summer day, built from shape functions rather
	 * than an API call, so the specimen never changes between visits.
	 */

	import { ChartStore, StratumChart } from '$lib/components/charts/v2';
	import { getTimeFormatPolicy } from '$lib/components/charts/v2/time-format-policy.js';
	import { cachedFormatter } from '$lib/components/charts/v2/date-labels.js';
	import { getFuelTechColour } from '$lib/components/charts/colours.js';
	import { fuelTechNameMap } from '$lib/fuel_techs.js';

	/** Stack order (bottom → top) follows the site convention: coal at the
	 *  base, gas, hydro, wind, then solar crowning the stack. */
	const SHAPES = /** @type {[string, (i: number) => number][]} */ ([
		['coal_black', (i) => 6 - 1.2 * Math.exp(-(((i - 26) / 9) ** 2))],
		['gas_ccgt', (i) => 0.8 + 0.9 * Math.exp(-(((i - 37) / 5) ** 2)) + 0.3 * Math.sin(i / 4)],
		['hydro', (i) => 1 + 0.8 * Math.exp(-(((i - 38) / 6) ** 2)) + 0.2 * Math.sin(i / 3 + 1)],
		['wind', (i) => 2.2 + 0.9 * Math.sin(i / 6 + 2) + 0.3 * Math.sin(i / 2.5)],
		['solar_utility', (i) => Math.max(0, 3.6 * Math.exp(-(((i - 24) / 7.5) ** 2)))],
		['solar_rooftop', (i) => Math.max(0, 2.8 * Math.exp(-(((i - 24) / 6.5) ** 2)))]
	]);

	// Midnight 15 Jan 2026 AEDT, in UTC ms — fixed so SSR and client agree.
	const START_UTC = Date.UTC(2026, 0, 14, 13, 0);
	const INTERVAL_MS = 30 * 60 * 1000;

	const rows = Array.from({ length: 49 }, (_, i) => {
		const time = START_UTC + i * INTERVAL_MS;
		/** @type {TimeSeriesData} */
		const row = { time, date: new Date(time) };
		for (const [code, shape] of SHAPES) {
			row[code] = Math.round(shape(i) * 1000); // MW
		}
		return row;
	});

	const seriesNames = SHAPES.map(([code]) => code);

	const chart = new ChartStore({
		key: Symbol('design-system-demo'),
		title: 'Generation by fuel type',
		prefix: 'M',
		displayPrefix: 'M',
		baseUnit: 'W',
		timeZone: 'Australia/Sydney'
	});
	chart.chartStyles.chartHeightPx = 320;

	// Axis ticks read as times of day in the network's zone ("6 am", "12 pm");
	// the tooltip gets the full standalone label from the shared time-format
	// policy, the single source of truth for chart date rendering.
	const policy = getTimeFormatPolicy('30m', 'Australia/Sydney');
	const hourFormat = cachedFormatter('design-system-demo-hour', 'Australia/Sydney', {
		hour: 'numeric',
		hour12: true
	});
	/** @param {(d: Date) => string} format */
	const safeFormat = (format) => (/** @type {any} */ d) => (d?.getTime?.() ? format(d) : '');
	chart.xTicks = 6;
	chart.formatTickX = safeFormat((d) => hourFormat.format(d));
	chart.formatTooltipX = safeFormat((d) => policy.formatTooltip(d));
	chart.seriesData = rows;
	chart.seriesNames = seriesNames;
	chart.seriesColours = Object.fromEntries(
		seriesNames.map((code) => [code, getFuelTechColour(code)])
	);
	chart.seriesLabels = Object.fromEntries(seriesNames.map((code) => [code, fuelTechNameMap[code]]));
	chart.setXDomain(rows[0].time, rows[rows.length - 1].time);
</script>

<StratumChart {chart} showHeader={false} showOptions={false} zoomMode="none" enablePan={false} />
