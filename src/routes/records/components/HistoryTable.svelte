<script>
	import { createBubbler } from 'svelte/legacy';

	const bubble = createBubbler();
	import { getContext, createEventDispatcher } from 'svelte';
	import { getFormattedDate, getFormattedMonth, getFormattedTime } from '$lib/utils/formatters.js';

	let { sortedHistoryData } = $props();

	const dispatch = createEventDispatcher();
	const {
		focusTime,
		hoverTime,
		convertAndFormatValue,
		displayPrefix,
		allowPrefixSwitch,
		displayUnit,
		getNextPrefix,
		timeZone
	} = getContext('record-history-data-viz');

	let prevDay = '';

	/**
	 * @param {string} period
	 * @param {boolean} [timeOnly]
	 */
	function tableTimeFormatter(period, timeOnly = false) {
		if (period === 'interval') {
			return function (/** @type {Date} */ date) {
				const day = getFormattedDate(date, undefined, 'numeric', 'short', 'numeric', $timeZone);
				if (!prevDay || day !== prevDay) {
					prevDay = day;
					return day;
				}

				if (timeOnly) return getFormattedTime(date, $timeZone);

				return '';
			};
		}

		if (period === 'day') {
			return function (/** @type {Date} */ date) {
				return getFormattedDate(date, undefined, 'numeric', 'short', 'numeric', $timeZone);
			};
		}

		if (period === 'year') {
			return function (/** @type {Date} */ date) {
				return getFormattedMonth(date, undefined, $timeZone);
			};
		}

		return function (/** @type {Date} */ date) {
			return getFormattedMonth(date, 'short', $timeZone);
		};
	}

	function moveToNextDisplayPrefix() {
		$displayPrefix = getNextPrefix();
	}
</script>

<div class="h-[450px] md:h-auto overflow-y-auto rounded-lg border border-warm-grey">
	<table class="bg-white text-sm w-full">
		<thead>
			<tr class="sticky top-0 z-10 bg-light-warm-grey/60 backdrop-blur-xl">
				<th class="text-left">
					<div class="px-4 py-2">Date</div>
				</th>
				<th class="text-right">
					{#if $allowPrefixSwitch}
						<div class="px-4 py-2">
							<button class="hover:underline" onclick={moveToNextDisplayPrefix}>
								{$displayUnit || ''}
							</button>
						</div>
					{:else}
						<div class="px-4 py-2">{$displayUnit || ''}</div>
					{/if}
				</th>
			</tr>
		</thead>

		<tbody>
			{#each sortedHistoryData as record}
				<tr
					class="border-b border-light-warm-grey pointer hover:bg-warm-grey"
					class:font-semibold={record.time === $focusTime}
					class:bg-warm-grey={record.time === $hoverTime}
					onmousemove={() => dispatch('mousemove', { time: record.time })}
					onmouseout={bubble('mouseout')}
					onblur={bubble('blur')}
					onpointerup={() => dispatch('pointerup', { time: record.time })}
				>
					<td
						class="pl-4 py-2 font-mono text-dark-grey flex"
						class:text-red={record.time === $focusTime}
					>
						<time datetime={record.interval} class="w-44">
							{tableTimeFormatter(record.period, false)(record.date)}
						</time>

						{#if record.period === 'interval'}
							<time datetime={record.interval}>
								{tableTimeFormatter(record.period, true)(record.date)}
							</time>
						{/if}
					</td>

					<td
						class="px-4 py-2 text-right font-mono text-dark-grey"
						class:text-red={record.time === $focusTime}
					>
						{$convertAndFormatValue(record.value)}
					</td>
				</tr>
			{/each}
		</tbody>

		<tfoot>
			<tr class="sticky bottom-0 bg-light-warm-grey/60 backdrop-blur-xl">
				<th class="text-left">
					<div class="px-4 py-2">Total records</div>
				</th>
				<th class="text-right">
					<div class="px-4 py-2">{sortedHistoryData.length}</div>
				</th>
			</tr>
		</tfoot>
	</table>
</div>
