import { curveStep, curveLinear, curveMonotoneX } from 'd3-shape';
import { get, readable, derived, writable } from 'svelte/store';
import { getNumberFormat, getFormattedDate, getFormattedTime } from '$lib/utils/formatters';
import { convert } from '$lib/utils/si-units';

const numberFormat = getNumberFormat();

export default function () {
	const title = writable('');

	const allowedPrefixes = writable([]);
	const allowPrefixSwitch = derived(
		allowedPrefixes,
		($allowedPrefixes) => $allowedPrefixes && $allowedPrefixes.length > 1
	);

	const baseUnit = writable('');

	const curveOptions = readable([
		{
			label: 'Smooth',
			value: 'smooth',
			curveFunction: curveMonotoneX
		},
		{
			label: 'Straight',
			value: 'straight',
			curveFunction: curveLinear
		},
		{
			label: 'Step',
			value: 'step',
			curveFunction: curveStep
		}
	]);
	const curveType = writable('straight');
	const curveFunction = derived([curveOptions, curveType], ([$curveOptions, $curveType]) => {
		const option = $curveOptions.find((d) => d.value === $curveType);
		return option ? option.curveFunction : null;
	});

	const snapXTicks = writable(false);
	const strokeWidth = writable('2px');

	const timeZone = writable('Australia/Sydney');

	// Line chart specific
	const showLineArea = writable(true);
	const lineColour = writable('rgba(0, 0, 0, 0.7)'); // CSS colour
	const dotStroke = writable('rgba(0, 0, 0, 0.7)'); // CSS colour
	const dotFill = writable('white'); // CSS colour

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

	/** @type {import('svelte/store').Writable<number[] | undefined>} */
	const xDomain = writable();
	/** @type {import('svelte/store').Writable<number[]>} */
	const yDomain = writable([]);

	/** @type {import('svelte/store').Writable<Date[] | number>} */
	const xTicks = writable([]);
	/** @type {import('svelte/store').Writable<Date[] | number>} */
	const yTicks = writable([]);

	/** @type {import('svelte/store').Writable<Date[]>} */
	const miniXTicks = writable([]);

	/** @type {import('svelte/store').Writable<Function>} */
	const formatTickX = writable((/** @type {*} */ d) => d);

	/** @type {import('svelte/store').Writable<Function>} */
	const formatTickY = writable((/** @type {number} */ d) => numberFormat.format(d));

	const maximumFractionDigits = writable(0);

	const convertAndFormatValue = derived(
		[prefix, displayPrefix, maximumFractionDigits],
		([$prefix, $displayPrefix, $maximumFractionDigits]) => {
			return (/** @type {number} */ d) => {
				const converted = convert($prefix, $displayPrefix, d);
				return isNaN(converted) ? '—' : getNumberFormat($maximumFractionDigits).format(converted);
			};
		}
	);

	const convertValue = derived([prefix, displayPrefix], ([$prefix, $displayPrefix]) => {
		return (/** @type {number} */ d) => {
			const formatter = getNumberFormat(0, false);
			const converted = convert($prefix, $displayPrefix, d);
			return isNaN(converted) ? '—' : formatter.format(converted);
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

	const chartHeightClasses = writable('h-[400px] md:h-[450px]');

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

	const seriesCsvData = derived(
		[seriesData, seriesNames, seriesLabels, convertValue, timeZone],
		([$seriesData, $seriesNames, $seriesLabels, $convertValue, $timeZone]) => {
			if (!$seriesData) return '';

			let csv = '';
			csv += ['date', ...$seriesNames.map((d) => $seriesLabels[d])].join(',') + '\n';

			$seriesData.forEach((d) => {
				const day = getFormattedDate(d.date, undefined, 'numeric', 'short', 'numeric', $timeZone);
				const time = getFormattedTime(d.date, $timeZone);
				const date = day + ' ' + time;
				const row = [date];
				$seriesNames.forEach((key) => {
					row.push($convertValue(d[key]));
				});
				csv += row.join(',') + '\n';
			});

			return csv;
		}
	);

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
		chartType.set('line');
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
		convertValue,
		maximumFractionDigits,
		timeZone,

		seriesData,
		seriesCsvData,
		seriesNames,
		seriesColours,
		seriesLabels,
		nameOptions,
		xDomain,
		yDomain,
		xTicks,
		yTicks,
		miniXTicks,
		snapXTicks,
		formatTickX,
		formatTickY,
		chartType,
		curveOptions,
		curveType,
		curveFunction,
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

		strokeWidth,
		showLineArea,
		lineColour,
		dotStroke,
		dotFill,

		reset,
		getNextPrefix
	};
}
