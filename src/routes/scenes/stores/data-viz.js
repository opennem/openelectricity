import { derived, writable } from 'svelte/store';

export default function () {
	/** @type {import('svelte/store').Writable<TimeSeriesData[]>} */
	const seriesData = writable([]);

	/** @type {import('svelte/store').Writable<string[]>} */
	const seriesNames = writable([]);

	/** @type {import('svelte/store').Writable<Object.<string, string>>} */
	const seriesColours = writable({});

	/** @type {import('svelte/store').Writable<Object.<string, string>>} */
	const seriesLabels = writable({});

	/** @type {import('svelte/store').Writable<{ label: string, value: string }[]>} */
	const nameOptions = writable([]);

	/** @type {import('svelte/store').Writable<number[]>} */
	const yDomain = writable([]);

	/** @type {import('svelte/store').Writable<Date[]>} */
	const xTicks = writable([]);

	/** @type {import('svelte/store').Writable<Function>} */
	const formatTickX = writable((/** @type {*} */ d) => d);

	/** @type {import('svelte/store').Writable<'area' | 'line'>} */
	const chartType = writable('area');

	/** @type {import('svelte/store').Writable<{ xStartValue: Date, xEndValue: Date }>} */
	const chartOverlay = writable();

	/** @type {import('svelte/store').Writable<{ date: Date }>} */
	const chartOverlayLine = writable();

	const chartOverlayHatchStroke = writable('rgba(236, 233, 230, 0.4)');

	// /** @type {import('svelte/store').Writable<TimeSeriesData | undefined>} */
	// const hoverData = writable();

	/** @type {import('svelte/store').Writable<string | undefined>} */
	const hoverKey = writable();

	/** @type {import('svelte/store').Writable<number | undefined>} */
	const hoverTime = writable();

	const hoverData = derived([seriesData, hoverTime], ([$seriesData, $hoverTime]) => {
		if (!$hoverTime) return;

		const data = $seriesData.find((d) => d.time === $hoverTime);

		return data;
	});

	return {
		seriesData,
		seriesNames,
		seriesColours,
		seriesLabels,
		nameOptions,
		yDomain,
		xTicks,
		formatTickX,
		chartType,
		chartOverlay,
		chartOverlayLine,
		chartOverlayHatchStroke,
		hoverKey,
		hoverTime,
		hoverData
	};
}
