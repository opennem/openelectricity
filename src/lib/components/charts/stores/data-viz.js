import { curveStep, curveLinear, curveMonotoneX } from 'd3-shape';
import { get, readable, derived, writable } from 'svelte/store';
import { getNumberFormat, getFormattedDate, getFormattedTime } from '$lib/utils/formatters';
import { convert } from '$lib/utils/si-units';

/**
 * @param {TimeSeriesData} d
 * @param {TimeSeriesData[]} dataset
 * @param {string[]} domains
 * @returns
 */
function proportionTransform(d, dataset, domains) {
	let total = 0;
	const updated = {
		...d
	};

	domains.forEach((e) => {
		const value = /** @type {number} **/ (d[e]);
		total += value > 0 ? value : 0;
	});

	domains.forEach((e) => {
		const value = /** @type {number} **/ (d[e]);
		updated[e] = value > 0 ? (value / total) * 100 : 0;
	});

	return updated;
}

/**
 * @param {TimeSeriesData} d
 * @param {TimeSeriesData[]} dataset
 * @param {string[]} domains
 * @returns
 */
function changeSinceTransform(d, dataset, domains) {
	const changeCompare = dataset[0];
	const updated = {
		...d
	};

	domains.forEach((e) => {
		const value = /** @type {number} **/ (d[e]);
		const compareValue = /** @type {number} **/ (changeCompare[e] || 0);
		updated[e] = value - compareValue;
	});

	return updated;
}

const numberFormat = getNumberFormat();

export default function () {
	const title = writable('');

	const allowedPrefixes = writable([]);
	const allowPrefixSwitch = derived(
		allowedPrefixes,
		($allowedPrefixes) => $allowedPrefixes && $allowedPrefixes.length > 1
	);

	const baseUnit = writable('');

	const dataScaleOptions = readable([
		{
			label: 'Absolute',
			value: 'absolute'
		},
		{
			label: 'Proportion',
			value: 'proportion',
			dataScaleFunction: proportionTransform
		},
		{
			label: 'Change since',
			value: 'changeSince',
			dataScaleFunction: changeSinceTransform
		}
	]);
	const dataScaleType = writable('absolute');
	const dataScaleFunction = derived(
		[dataScaleOptions, dataScaleType],
		([$dataScaleOptions, $dataScaleType]) => {
			const option = $dataScaleOptions.find((d) => d.value === $dataScaleType);
			return option && option.dataScaleFunction
				? option.dataScaleFunction
				: (/** @type {*} */ d) => d;
		}
	);
	const isDataScaleTypeProportion = derived(
		dataScaleType,
		($dataScaleType) => $dataScaleType === 'proportion'
	);

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

	/*** Line chart specific  */
	const showLineArea = writable(true);
	const lineColour = writable('rgba(0, 0, 0, 0.7)'); // CSS colour
	const dotStroke = writable('rgba(0, 0, 0, 0.7)'); // CSS colour
	const dotFill = writable('white'); // CSS colour
	/*** /end Line chart specific  */

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

	/** @type {import('svelte/store').Writable<string[]>} */
	const hiddenSeriesNames = writable([]);

	const visibleSeriesNames = derived(
		[seriesNames, hiddenSeriesNames],
		([$seriesNames, $hiddenSeriesNames]) => {
			return $seriesNames.filter((n) => !$hiddenSeriesNames.includes(n));
		}
	);

	/** @type {import('svelte/store').Writable<Object.<string, string>>} */
	const seriesColours = writable({});

	const visibleSeriesColours = derived(
		[seriesColours, visibleSeriesNames],
		([$seriesColours, $visibleSeriesNames]) => {
			return $visibleSeriesNames.map((/** @type {string} */ d) => $seriesColours[d]);
		}
	);

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

	const chartTypeOptions = readable([
		{
			label: 'Area',
			value: 'area'
		},
		{
			label: 'Line',
			value: 'line'
		}
	]);

	/** @type {import('svelte/store').Writable<'area' | 'line'>} */
	const chartType = writable('area');
	const isChartTypeArea = derived(chartType, ($chartType) => $chartType === 'area');
	const isChartTypeLine = derived(chartType, ($chartType) => $chartType === 'line');

	/** @type {import('svelte/store').Writable<{ xStartValue: Date, xEndValue: Date }>} */
	const chartOverlay = writable();

	/** @type {import('svelte/store').Writable<{ date: Date }>} */
	const chartOverlayLine = writable();

	const chartOverlayHatchStroke = writable('rgba(236, 233, 230, 0.4)');

	const chartHeightClasses = writable('h-[400px] md:h-[450px]');

	const seriesScaledData = derived(
		[seriesData, visibleSeriesNames, dataScaleType, xDomain, dataScaleFunction],
		([$seriesData, $visibleSeriesNames, $dataScaleType, $xDomain, $dataScaleFunction]) => {
			if (!$seriesData) return [];
			const isChangeSince = $dataScaleType === 'changeSince';
			const filteredSeriesData =
				isChangeSince && $xDomain && $xDomain[0] && $xDomain[1]
					? $seriesData.filter(
							(d) => d.time >= $xDomain[0].getTime() && d.time <= $xDomain[1].getTime()
					  )
					: $seriesData;
			return [...$seriesData].map((d) =>
				$dataScaleFunction(d, filteredSeriesData, $visibleSeriesNames)
			);
		}
	);

	const seriesProportionData = derived([seriesData, seriesNames], ([$seriesData, $seriesNames]) => {
		if (!$seriesData) return [];
		return [...$seriesData].map((d) => proportionTransform(d, $seriesData, $seriesNames));
	});

	/** @type {import('svelte/store').Writable<string | undefined>} */
	const hoverKey = writable();

	/** @type {import('svelte/store').Writable<number | undefined>} */
	const hoverTime = writable();

	const hoverData = derived([seriesData, hoverTime], ([$seriesData, $hoverTime]) => {
		if (!$hoverTime) return;

		const data = $seriesData.find((d) => d.time === $hoverTime);

		return data;
	});

	const hoverScaledData = derived(
		[seriesScaledData, hoverTime],
		([$seriesScaledData, $hoverTime]) => {
			if (!$hoverTime) return;

			const data = $seriesScaledData.find((d) => d.time === $hoverTime);

			return data;
		}
	);

	const hoverProportionData = derived(
		[seriesProportionData, hoverTime],
		([$seriesProportionData, $hoverTime]) => {
			if (!$hoverTime) return;

			const data = $seriesProportionData.find((d) => d.time === $hoverTime);

			return data;
		}
	);

	/** @type {import('svelte/store').Writable<number | undefined>} */
	const focusTime = writable();

	const focusData = derived([seriesData, focusTime], ([$seriesData, $focusTime]) => {
		if (!$focusTime) return;

		const data = $seriesData.find((d) => d.time === $focusTime);

		return data;
	});

	const focusScaledData = derived(
		[seriesScaledData, focusTime],
		([$seriesScaledData, $focusTime]) => {
			if (!$focusTime) return;

			const data = $seriesScaledData.find((d) => d.time === $focusTime);

			return data;
		}
	);

	const focusProportionData = derived(
		[seriesProportionData, focusTime],
		([$seriesProportionData, $focusTime]) => {
			if (!$focusTime) return;

			const data = $seriesProportionData.find((d) => d.time === $focusTime);

			return data;
		}
	);

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

	function formatValue(/** @type {number} */ d) {
		const $maximumFractionDigits = get(maximumFractionDigits);
		return getNumberFormat($maximumFractionDigits).format(d);
	}

	/**
	 *
	 * @param {string} name
	 * @param {boolean} isMetaPressed
	 */
	function updateHiddenSeriesNames(name, isMetaPressed) {
		const $seriesNames = get(seriesNames);
		const $hiddenSeriesNames = get(hiddenSeriesNames);

		if (isMetaPressed) {
			hiddenSeriesNames.set($seriesNames.filter((n) => n !== name));
		} else {
			if ($hiddenSeriesNames.includes(name)) {
				hiddenSeriesNames.set($hiddenSeriesNames.filter((n) => n !== name));
			} else {
				// if all series are going to be hidden, then show all instead
				if ($hiddenSeriesNames.length === $seriesNames.length - 1) {
					hiddenSeriesNames.set([]);
				} else {
					hiddenSeriesNames.set([...$hiddenSeriesNames, name]);
				}
			}
		}
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

		dataScaleOptions,
		dataScaleType,
		dataScaleFunction,
		isDataScaleTypeProportion,

		chartTypeOptions,
		chartType,
		isChartTypeArea,
		isChartTypeLine,

		seriesData,
		seriesCsvData,
		seriesScaledData,
		seriesNames,
		visibleSeriesNames,
		hiddenSeriesNames,
		seriesColours,
		visibleSeriesColours,
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
		curveOptions,
		curveType,
		curveFunction,
		chartOverlay,
		chartOverlayLine,
		chartOverlayHatchStroke,
		chartHeightClasses,

		hoverKey,
		hoverTime,
		hoverData,
		hoverScaledData,
		hoverProportionData,
		focusTime,
		focusData,
		focusScaledData,
		focusProportionData,

		strokeWidth,
		showLineArea,
		lineColour,
		dotStroke,
		dotFill,

		reset,
		getNextPrefix,
		updateHiddenSeriesNames,
		formatValue
	};
}
