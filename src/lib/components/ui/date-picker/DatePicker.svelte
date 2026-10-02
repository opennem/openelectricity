<script>
	import { DatePicker } from 'bits-ui';
	import { CalendarDate } from '@internationalized/date';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	/**
	 * DatePicker — a single-date picker built on bits-ui's DatePicker
	 * (https://www.bits-ui.com/docs/components/date-picker): a typeable date
	 * input whose calendar button opens the month grid in its own popover,
	 * styled in the app's tokens. Picking a day closes the popover; a date
	 * outside the bounds is never reported. `footer` renders under the
	 * calendar (e.g. a reset action). The input matches a compact filter pill
	 * (`FilterPill`): the same padding and height, with the calendar icon where
	 * the pill's chevron sits.
	 *
	 * @typedef {Object} Props
	 * @property {string | null} [date] - Selected date in YYYY-MM-DD format
	 * @property {string | null} [minDate] - Earliest selectable date in YYYY-MM-DD format
	 * @property {string | null} [maxDate] - Latest selectable date in YYYY-MM-DD format
	 * @property {string} [label] - Accessible label (visually hidden unless `showLabel`)
	 * @property {boolean} [showLabel] - Show the label above the input
	 * @property {boolean} [active] - Mark a non-default choice, like an active filter pill
	 * @property {(date: string) => void} [onchange] - Called with a valid YYYY-MM-DD date
	 * @property {import('svelte').Snippet<[{ close: () => void }]>} [footer]
	 */

	/** @type {Props} */
	let {
		date = null,
		minDate = null,
		maxDate = null,
		label = 'Date',
		showLabel = false,
		active = false,
		onchange,
		footer
	} = $props();

	/**
	 * @param {string | null} value
	 * @returns {CalendarDate | undefined}
	 */
	function parseDate(value) {
		if (!value) return undefined;
		const [year, month, day] = value.split('-').map(Number);
		return new CalendarDate(year, month, day);
	}

	/** @param {import('@internationalized/date').DateValue} value */
	function formatDate(value) {
		const y = String(value.year).padStart(4, '0');
		const m = String(value.month).padStart(2, '0');
		const d = String(value.day).padStart(2, '0');
		return `${y}-${m}-${d}`;
	}

	let value = $derived(parseDate(date));
	let minValue = $derived(parseDate(minDate));
	let maxValue = $derived(parseDate(maxDate));
	let open = $state(false);

	/** @param {import('@internationalized/date').DateValue | undefined} next */
	function handleValueChange(next) {
		if (!next) return;
		if (minValue && next.compare(minValue) < 0) return;
		if (maxValue && next.compare(maxValue) > 0) return;
		onchange?.(formatDate(next));
	}

	// The browser's locale orders the segments (DD/MM/YYYY vs MM/DD/YYYY).
	const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-AU';
</script>

<DatePicker.Root
	weekdayFormat="short"
	calendarLabel={label}
	fixedWeeks={true}
	{locale}
	{value}
	onValueChange={handleValueChange}
	{minValue}
	{maxValue}
	bind:open
>
	<div class="flex flex-col gap-1">
		<DatePicker.Label
			class={showLabel
				? 'text-[10px] font-medium uppercase tracking-wider text-mid-grey'
				: 'sr-only'}
		>
			{label}
		</DatePicker.Label>
		<DatePicker.Input
			class="flex select-none items-center whitespace-nowrap rounded-lg border bg-white py-2.5 pl-4 pr-3 text-xs font-medium text-dark-grey transition-colors focus-within:border-dark-grey hover:border-dark-grey {active ||
			open
				? 'border-dark-grey'
				: 'border-warm-grey'}"
		>
			{#snippet children({ segments })}
				{#each segments as { part, value: segment }, i (part + i)}
					<div class="inline-block select-none">
						{#if part === 'literal'}
							<DatePicker.Segment {part} class="px-px text-mid-grey">{segment}</DatePicker.Segment>
						{:else}
							<DatePicker.Segment
								{part}
								class="rounded px-0.5 py-1 tabular-nums hover:bg-light-warm-grey focus:bg-light-warm-grey focus:outline-none aria-[valuetext=Empty]:text-mid-grey"
							>
								{segment}
							</DatePicker.Segment>
						{/if}
					</div>
				{/each}
				<DatePicker.Trigger
					aria-label="Open calendar"
					class="ml-1.5 inline-flex items-center justify-center rounded text-mid-grey transition-colors hover:text-dark-grey"
				>
					<CalendarIcon class="size-3.5" />
				</DatePicker.Trigger>
			{/snippet}
		</DatePicker.Input>
	</div>

	<!-- Portalled so a scrolling nav can't clip it; above the app's sheets. -->
	<DatePicker.Portal>
		<DatePicker.Content sideOffset={6} class="z-[10000]">
			<DatePicker.Calendar class="rounded-xl border border-warm-grey bg-white p-3 shadow-lg">
				{#snippet children({ months, weekdays })}
					<DatePicker.Header class="flex items-center justify-between">
						<DatePicker.PrevButton
							class="inline-flex size-7 items-center justify-center rounded-md text-mid-grey transition-colors hover:bg-light-warm-grey hover:text-dark-grey"
						>
							<ChevronLeft class="size-4" />
						</DatePicker.PrevButton>
						<DatePicker.Heading class="text-xs font-medium text-dark-grey" />
						<DatePicker.NextButton
							class="inline-flex size-7 items-center justify-center rounded-md text-mid-grey transition-colors hover:bg-light-warm-grey hover:text-dark-grey"
						>
							<ChevronRight class="size-4" />
						</DatePicker.NextButton>
					</DatePicker.Header>

					<div class="flex flex-col gap-4 pt-3 sm:flex-row">
						{#each months as month (month.value)}
							<DatePicker.Grid class="w-full border-collapse select-none">
								<DatePicker.GridHead>
									<DatePicker.GridRow class="flex w-full justify-between">
										{#each weekdays as day (day)}
											<DatePicker.HeadCell
												class="w-8 text-center text-[10px] font-medium text-mid-grey"
											>
												{day.slice(0, 2)}
											</DatePicker.HeadCell>
										{/each}
									</DatePicker.GridRow>
								</DatePicker.GridHead>
								<DatePicker.GridBody>
									{#each month.weeks as weekDates (weekDates)}
										<DatePicker.GridRow class="flex w-full">
											{#each weekDates as day (day)}
												<DatePicker.Cell
													date={day}
													month={month.value}
													class="relative size-8 p-0 text-center"
												>
													<DatePicker.Day
														class="group relative inline-flex size-8 items-center justify-center rounded-md text-xs text-dark-grey transition-colors hover:bg-light-warm-grey data-[disabled]:pointer-events-none data-[outside-month]:pointer-events-none data-[selected]:bg-dark-grey data-[disabled]:text-warm-grey data-[outside-month]:text-warm-grey data-[selected]:text-white"
													>
														<span
															class="absolute bottom-1 hidden size-1 rounded-full bg-current group-data-[today]:block"
														></span>
														{day.day}
													</DatePicker.Day>
												</DatePicker.Cell>
											{/each}
										</DatePicker.GridRow>
									{/each}
								</DatePicker.GridBody>
							</DatePicker.Grid>
						{/each}
					</div>
					{#if footer}
						<div class="mt-3 border-t border-warm-grey pt-3">
							{@render footer({ close: () => (open = false) })}
						</div>
					{/if}
				{/snippet}
			</DatePicker.Calendar>
		</DatePicker.Content>
	</DatePicker.Portal>
</DatePicker.Root>
