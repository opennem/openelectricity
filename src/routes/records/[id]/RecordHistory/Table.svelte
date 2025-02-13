<script>
	import getContext from '$lib/utils/get-context.js';
	import formatDateBasedOnInterval from '$lib/utils/formatters-data-interval';
	import { getFormattedDate, getFormattedTime } from '$lib/utils/formatters.js';
	import { xTickValueFormatters } from './helpers/config';
	/**
	 * @typedef {Object} Props
	 * @property {symbol} cxtKey
	 * @property {Date[] | undefined} brushedRange
	 * @property {string} period
	 * @property {(evt: TimeSeriesData) => void} onmousemove
	 * @property {() => void} onmouseout
	 * @property {(evt: TimeSeriesData) => void} onpointerup
	 */

	/** @type {Props} */
	let { cxtKey, brushedRange, period, onmousemove, onmouseout, onpointerup } = $props();
	let cxt = getContext(cxtKey);
	let prevDay = '';

	// remove last data and reverse array - last data is a duplicate to pad out the chart
	let seriesData = $derived([...cxt.seriesData].reverse().slice(1));

	/**
	 * @param {boolean} [timeOnly]
	 */
	function tableTimeFormatter(timeOnly = false) {
		if (period === 'interval') {
			return function (/** @type {Date} */ date) {
				const day = getFormattedDate(date, undefined, 'numeric', 'short', 'numeric', cxt.timeZone);
				if (!prevDay || day !== prevDay) {
					prevDay = day;
					return day;
				}

				if (timeOnly) return getFormattedTime(date, cxt.timeZone);

				return '';
			};
		}

		return period ? xTickValueFormatters[period].format : xTickValueFormatters.year.format;
	}

	/**
	 * @param {Date} time
	 */
	function isBetween(time) {
		if (!brushedRange) return true;
		return time >= brushedRange[0] && time <= brushedRange[1];
	}
</script>

<div class="overflow-y-auto rounded-lg border border-warm-grey h-full">
	<table class="bg-white text-xs w-full">
		<thead>
			<tr class="sticky top-0 z-10 bg-light-warm-grey/60 backdrop-blur-xl">
				<th class="text-left">
					<div class="px-4 py-2">Date</div>
				</th>
				<th class="text-right">
					{#if cxt.chartOptions.allowPrefixSwitch}
						<div class="px-4 py-2">
							<button
								class="hover:underline"
								onclick={() => (cxt.chartOptions.displayPrefix = cxt.getNextPrefix())}
							>
								{cxt.chartOptions.displayUnit || ''}
							</button>
						</div>
					{:else}
						<div class="px-4 py-2">{cxt.chartOptions.displayUnit || ''}</div>
					{/if}
				</th>
			</tr>
		</thead>

		<tbody>
			{#each seriesData as record (record.time)}
				<!-- svelte-ignore a11y_mouse_events_have_key_events -->
				<tr
					class="border-b border-light-warm-grey pointer hover:bg-warm-grey"
					class:font-semibold={record.time === cxt.focusTime}
					class:bg-warm-grey={record.time === cxt.hoverTime}
					class:hidden={brushedRange && !isBetween(record.time)}
					onmousemove={() => onmousemove({ time: record.time, date: record.date })}
					{onmouseout}
					onpointerup={() => onpointerup({ time: record.time, date: record.date })}
				>
					<td
						class="pl-4 py-2 font-mono text-dark-grey flex"
						class:text-red={record.time === cxt.focusTime}
					>
						<time datetime={record.interval} class="w-44 whitespace-nowrap">
							{tableTimeFormatter(false)(record.date)}
						</time>

						{#if period === 'interval'}
							<time datetime={record.interval} class="whitespace-nowrap">
								{tableTimeFormatter(true)(record.date)}
							</time>
						{/if}
					</td>

					<td
						class="px-4 py-2 text-right font-mono text-dark-grey"
						class:text-red={record.time === cxt.focusTime}
					>
						{cxt.convertAndFormatValue(record.value)}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
