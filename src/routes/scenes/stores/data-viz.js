import { get, derived, writable } from 'svelte/store';
import { getNumberFormat } from '$lib/utils/formatters';
import { convert } from '$lib/utils/si-units';

const numberFormat = getNumberFormat();

export default function () {
	const title = writable('');

	const allowedPrefixes = writable([]);

	const allowPrefixSwitch = derived(
		allowedPrefixes,
		($allowedPrefixes) => $allowedPrefixes && $allowedPrefixes.length > 1
	);

	// const displayUnit = writable('');
	const baseUnit = writable('');

	/** @type {import('svelte/store').Writable<SiPrefix>} */
	const prefix = writable('');

	/** @type {import('svelte/store').Writable<SiPrefix>} */
	const displayPrefix = writable('');

	const displayUnit = derived([displayPrefix, baseUnit], ([$displayPrefix, $baseUnit]) => {
		return ($displayPrefix || '') + $baseUnit;
	});

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

	/** @type {import('svelte/store').Writable<Date[]>} */
	const miniXTicks = writable([]);

	/** @type {import('svelte/store').Writable<Function>} */
	const formatTickX = writable((/** @type {*} */ d) => d);

	/** @type {import('svelte/store').Writable<Function>} */
	const formatTickY = writable((/** @type {number} */ d) => numberFormat.format(d));

	const convertAndFormatValue = derived([prefix, displayPrefix], ([$prefix, $displayPrefix]) => {
		return (/** @type {number} */ d) => {
			const converted = convert($prefix, $displayPrefix, d);
			return isNaN(converted) ? '—' : numberFormat.format(converted);
		};
	});

	/** @type {import('svelte/store').Writable<'area' | 'line'>} */
	const chartType = writable('area');

	const isChartTypeArea = derived(chartType, ($chartType) => $chartType === 'area');

	/** @type {import('svelte/store').Writable<{ xStartValue: Date, xEndValue: Date }>} */
	const chartOverlay = writable();

	/** @type {import('svelte/store').Writable<{ date: Date }>} */
	const chartOverlayLine = writable();

	const chartOverlayHatchStroke = writable('rgba(236, 233, 230, 0.4)');

	const chartHeightClasses = writable('');

	/** @type {import('svelte/store').Writable<string | undefined>} */
	const hoverKey = writable();

	/** @type {import('svelte/store').Writable<number | undefined>} */
	const hoverTime = writable();

	const hoverData = derived([seriesData, hoverTime], ([$seriesData, $hoverTime]) => {
		if (!$hoverTime) return;

		const data = $seriesData.find((d) => d.time === $hoverTime);

		return data;
	});

	/** @type {import('svelte/store').Writable<number | undefined>} */
	const focusTime = writable();

	const focusData = derived([seriesData, focusTime], ([$seriesData, $focusTime]) => {
		if (!$focusTime) return;

		const data = $seriesData.find((d) => d.time === $focusTime);

		return data;
	});

	function getNextPrefix() {
		/** @type {SiPrefix[]} */
		const $prefixes = get(allowedPrefixes);
		const $displayPrefix = get(displayPrefix);

		if (!$prefixes) return '';

		const index = $prefixes.indexOf($displayPrefix);
		return index === $prefixes.length - 1 ? $prefixes[0] : $prefixes[index + 1];
	}

	function reset() {
		seriesData.set([]);
		seriesNames.set([]);
		seriesColours.set({});
		seriesLabels.set({});
		nameOptions.set([]);
		yDomain.set([]);
		// xTicks.set([]);
		chartType.set('area');
	}

	return {
		title,
		allowPrefixSwitch,
		allowedPrefixes,
		displayUnit,
		baseUnit,
		prefix,
		displayPrefix,
		convertAndFormatValue,

		seriesData,
		seriesNames,
		seriesColours,
		seriesLabels,
		nameOptions,
		yDomain,
		xTicks,
		miniXTicks,
		formatTickX,
		formatTickY,
		chartType,
		isChartTypeArea,
		chartOverlay,
		chartOverlayLine,
		chartOverlayHatchStroke,
		chartHeightClasses,
		hoverKey,
		hoverTime,
		hoverData,
		focusTime,
		focusData,

		reset,
		getNextPrefix
	};
}
