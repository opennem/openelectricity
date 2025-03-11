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

	// remove last data and reverse array - last data is a duplicate to pad out the chart
	let seriesData = $derived([...cxt.seriesData].reverse().slice(1));

	/**
	 * @param {Date} time
	 */
	function isBetween(time) {
		if (!brushedRange) return true;
		return time >= brushedRange[0] && time <= brushedRange[1];
	}

	/**
	 * @param {Date} currentDate
	 * @param {Date} prevDate
	 * @returns {string}
	 */
	function getIntervalDate(currentDate, prevDate) {
		let currentFormatDate = new Intl.DateTimeFormat('en-AU', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			timeZone: cxt.timeZone
		}).format(currentDate);

		let nextFormatDate = new Intl.DateTimeFormat('en-AU', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			timeZone: cxt.timeZone
		}).format(prevDate);

		if (currentFormatDate === nextFormatDate) {
			return '';
		}

		return currentFormatDate;
	}

	/**
	 * @param {KeyboardEvent} event
	 */
	function handleKeydown(event) {
		if (
			event.key !== 'ArrowUp' &&
			event.key !== 'ArrowDown' &&
			event.key !== 'ArrowLeft' &&
			event.key !== 'ArrowRight'
		)
			return;
		event.preventDefault();

		if (cxt.focusTime) {
			if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
				let find = seriesData.findIndex((record) => record.time === cxt.focusTime);
				if (find !== -1 && find > 0) {
					handlePointerUp(seriesData[find - 1]);
				}
			}
			if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
				let find = seriesData.findIndex((record) => record.time === cxt.focusTime);
				if (find !== -1 && find < seriesData.length - 1) {
					handlePointerUp(seriesData[find + 1]);
				}
			}
		}
	}

	/**
	 * @param {TimeSeriesData} record
	 */
	function handlePointerUp(record) {
		onpointerup({
			time: record.time,
			date: record.date,
			recordedDateTimeStr: record.recordedDateTimeStr
		});
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="overflow-y-auto rounded-lg border border-warm-grey h-full">
	<table class="bg-white text-xs w-full">
		<thead>
			<tr class="sticky top-0 z-10 bg-light-warm-grey backdrop-blur-xl">
				<th class="text-left">
					<div class="pl-4 py-2">Date</div>
				</th>

				{#if period === 'interval'}
					<th class="text-right">
						<div class="pl-4 py-2">Time</div>
					</th>
				{/if}

				<th class="text-right w-1/2">
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
			{#each seriesData as record, index (index)}
				<!-- svelte-ignore a11y_mouse_events_have_key_events -->
				<tr
					class="pointer hover:bg-warm-grey"
					class:font-semibold={record.time === cxt.focusTime}
					class:bg-warm-grey={record.time === cxt.focusTime}
					class:bg-light-warm-grey={record.time === cxt.hoverTime}
					class:hidden={brushedRange && !isBetween(record.time)}
					onmousemove={() => onmousemove({ time: record.time, date: record.date })}
					{onmouseout}
					onpointerup={() => handlePointerUp(record)}
				>
					<td
						class="pl-4 py-2 font-mono text-dark-grey whitespace-nowrap"
						class:text-red={record.time === cxt.focusTime}
					>
						{#if period === 'interval'}
							<!-- if previous record is the same date, then return empty string -->
							<time datetime={record.interval}>
								{getIntervalDate(record.date, seriesData[index - 1]?.date)}
							</time>
						{:else}
							<time datetime={record.interval}>
								{cxt.formatXWithTimeZone(record.date)}
							</time>
						{/if}
					</td>

					{#if period === 'interval'}
						<td
							class="py-2 font-mono text-dark-grey text-right whitespace-nowrap"
							class:text-red={record.time === cxt.focusTime}
						>
							<time datetime={record.interval}>
								{new Intl.DateTimeFormat('en-AU', {
									hour: 'numeric',
									minute: 'numeric',
									timeZone: cxt.timeZone
								}).format(record.date)}
							</time>
						</td>
					{/if}

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
