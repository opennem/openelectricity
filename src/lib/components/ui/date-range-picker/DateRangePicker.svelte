<script>
	import { DateRangePicker } from 'bits-ui';
	import { CalendarDate } from '@internationalized/date';
	import Calendar from '@lucide/svelte/icons/calendar';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	/**
	 * @typedef {Object} DateRangeChangeEvent
	 * @property {string} start - Start date in YYYY-MM-DD format
	 * @property {string} end - End date in YYYY-MM-DD format
	 */

	/**
	 * @typedef {Object} Props
	 * @property {string | null} [startDate] - Start date in YYYY-MM-DD format
	 * @property {string | null} [endDate] - End date in YYYY-MM-DD format
	 * @property {string | null} [minDate] - Earliest selectable date in YYYY-MM-DD format
	 * @property {string | null} [maxDate] - Latest selectable date in YYYY-MM-DD format
	 * @property {'sm' | 'md' | 'lg'} [size] - Size variant
	 * @property {(event: DateRangeChangeEvent) => void} [onchange] - Callback when date range changes
	 */

	/** @type {Props} */
	let { startDate = null, endDate = null, minDate = null, maxDate = null, size = 'md', onchange } = $props();

	let minValue = $derived(parseDate(minDate));
	let maxValue = $derived(parseDate(maxDate));

	const sizeConfig = {
		sm: {
			input: 'px-2 py-1.5 text-xs gap-0.5 rounded-lg',
			segment: 'px-0.5 text-xs',
			separator: 'px-0.5',
			trigger: 'ml-1 p-0.5',
			iconSize: 'size-3.5',
			content: 'p-3 rounded-xl',
			heading: 'text-xs',
			navButton: 'p-0.5',
			navIcon: 'size-3.5',
			headCell: 'w-7 text-[10px]',
			dayCell: 'h-7 w-7 text-[11px]',
			todayDot: 'h-0.5 w-0.5 bottom-0.5'
		},
		md: {
			input: 'px-3 py-2 text-sm gap-1 rounded-lg',
			segment: 'px-0.5 text-sm',
			separator: 'px-1',
			trigger: 'ml-1.5 p-1',
			iconSize: 'size-4',
			content: 'p-4 rounded-xl',
			heading: 'text-sm',
			navButton: 'p-1',
			navIcon: 'size-4',
			headCell: 'w-9 text-xs',
			dayCell: 'h-9 w-9 text-xs',
			todayDot: 'h-1 w-1 bottom-1'
		},
		lg: {
			input: 'px-4 py-3 text-base gap-1.5 rounded-xl',
			segment: 'px-1 text-base',
			separator: 'px-1.5',
			trigger: 'ml-2 p-1',
			iconSize: 'size-5',
			content: 'p-5 rounded-2xl',
			heading: 'text-base',
			navButton: 'p-1.5',
			navIcon: 'size-5',
			headCell: 'w-11 text-sm',
			dayCell: 'h-11 w-11 text-sm',
			todayDot: 'h-1 w-1 bottom-1.5'
		}
	};

	let s = $derived(sizeConfig[size]);

	/**
	 * Parse a YYYY-MM-DD string into a CalendarDate
	 * @param {string | null} dateStr
	 * @returns {CalendarDate | undefined}
	 */
	function parseDate(dateStr) {
		if (!dateStr) return undefined;
		const [year, month, day] = dateStr.split('-').map(Number);
		return new CalendarDate(year, month, day);
	}

	/**
	 * Format a CalendarDate to YYYY-MM-DD string
	 * @param {import('@internationalized/date').DateValue} date
	 * @returns {string}
	 */
	function formatDate(date) {
		const y = String(date.year).padStart(4, '0');
		const m = String(date.month).padStart(2, '0');
		const d = String(date.day).padStart(2, '0');
		return `${y}-${m}-${d}`;
	}

	/** @type {{ start: CalendarDate | undefined, end: CalendarDate | undefined }} */
	let initialRange = $derived({
		start: parseDate(startDate),
		end: parseDate(endDate)
	});

	/** @type {{ start: CalendarDate | undefined, end: CalendarDate | undefined } | null} */
	let localRange = $state(null);

	/** @type {{ start: CalendarDate | undefined, end: CalendarDate | undefined }} */
	let dateRange = $derived(localRange ?? initialRange);

	// Clear local overrides and errors when parent updates props (e.g. range preset selected)
	$effect(() => {
		// Track the prop-derived range
		const _s = initialRange.start;
		const _e = initialRange.end;
		clearErrors();
	});

	/** Reset local range and clear all validation errors */
	export function clearErrors() {
		localRange = null;
		pendingValidation = { error: '', startErr: false, endErr: false };
		errorMessage = '';
		startHasError = false;
		endHasError = false;
	}

	// ============================================
	// Validation
	// ============================================

	/** Friendly display of min date for error messages */
	let minDateDisplay = $derived(
		minValue
			? new Intl.DateTimeFormat('en-AU', {
					day: 'numeric',
					month: 'short',
					year: 'numeric'
				}).format(new Date(/** @type {string} */ (minDate) + 'T00:00:00'))
			: ''
	);

	/**
	 * Pending validation result — computed on every value change,
	 * but only displayed to the user on focusout.
	 * @type {{ error: string, startErr: boolean, endErr: boolean }}
	 */
	let pendingValidation = { error: '', startErr: false, endErr: false };

	/** Displayed error message (shown after focusout) */
	let errorMessage = $state('');
	let startHasError = $state(false);
	let endHasError = $state(false);
	let hasError = $derived(!!errorMessage);

	/**
	 * Validate a date range against all rules.
	 * @param {CalendarDate} start
	 * @param {CalendarDate} end
	 * @returns {{ error: string, startErr: boolean, endErr: boolean }}
	 */
	function validateRange(start, end) {
		// Min bound
		if (minValue && start.compare(minValue) < 0) {
			return {
				error: `Start date is before ${minDateDisplay}`,
				startErr: true,
				endErr: false
			};
		}

		// Max bound
		if (maxValue && end.compare(maxValue) > 0) {
			return { error: 'End date is after today', startErr: false, endErr: true };
		}

		// Start must be strictly before end (CalendarDate has day precision,
		// so compare < 0 guarantees at least 1 day apart)
		if (start.compare(end) >= 0) {
			return {
				error: 'Start date must be before end date',
				startErr: true,
				endErr: true
			};
		}

		return { error: '', startErr: false, endErr: false };
	}

	/**
	 * Handle value change from the DateRangePicker.
	 * Validates the range and only fires onchange when valid.
	 * @param {{ start: import('@internationalized/date').DateValue | undefined, end: import('@internationalized/date').DateValue | undefined }} value
	 */
	function handleValueChange(value) {
		localRange =
			/** @type {{ start: CalendarDate | undefined, end: CalendarDate | undefined }} */ (value);

		if (value.start && value.end) {
			pendingValidation = validateRange(
				/** @type {CalendarDate} */ (value.start),
				/** @type {CalendarDate} */ (value.end)
			);

			if (!pendingValidation.error) {
				// Valid — clear any displayed errors and notify parent
				errorMessage = '';
				startHasError = false;
				endHasError = false;
				onchange?.({
					start: formatDate(value.start),
					end: formatDate(value.end)
				});
			} else {
				// Invalid — show errors immediately (user completed both dates)
				errorMessage = pendingValidation.error;
				startHasError = pendingValidation.startErr;
				endHasError = pendingValidation.endErr;
			}
		} else {
			// Incomplete range — clear errors
			pendingValidation = { error: '', startErr: false, endErr: false };
			errorMessage = '';
			startHasError = false;
			endHasError = false;
		}
	}

	// ============================================
	// Focus handling
	// ============================================

	/** @type {HTMLDivElement | undefined} */
	let containerEl = $state(undefined);

	/** @type {ReturnType<typeof setTimeout> | null} */
	let blurTimer = null;

	function handleFocusIn() {
		// Cancel any pending blur validation (e.g. focus moved to calendar popover and back)
		if (blurTimer) {
			clearTimeout(blurTimer);
			blurTimer = null;
		}
	}

	/**
	 * Show validation errors when focus leaves the date picker entirely.
	 * Uses a small delay to handle popover focus transitions (portaled content).
	 * @param {FocusEvent} e
	 */
	function handleFocusOut(e) {
		const related = /** @type {Element | null} */ (e.relatedTarget);
		if (related && containerEl?.contains(related)) return;

		if (blurTimer) clearTimeout(blurTimer);
		blurTimer = setTimeout(() => {
			errorMessage = pendingValidation.error;
			startHasError = pendingValidation.startErr;
			endHasError = pendingValidation.endErr;
		}, 150);
	}

	// ============================================
	// Calendar helpers
	// ============================================

	const today = new CalendarDate(
		new Date().getFullYear(),
		new Date().getMonth() + 1,
		new Date().getDate()
	);

	/**
	 * Check if a CalendarDate is today
	 * @param {{ year: number, month: number, day: number }} date
	 * @returns {boolean}
	 */
	function isToday(date) {
		return date.year === today.year && date.month === today.month && date.day === today.day;
	}

	/** @type {('start' | 'end')[]} */
	const inputTypes = ['start', 'end'];

	// Use the browser's locale for date formatting (e.g. DD/MM/YYYY vs MM/DD/YYYY)
	const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-AU';
</script>

<div bind:this={containerEl} onfocusin={handleFocusIn} onfocusout={handleFocusOut}>
	<DateRangePicker.Root
		weekdayFormat="short"
		fixedWeeks={true}
		{locale}
		value={dateRange}
		onValueChange={handleValueChange}
		{minValue}
		{maxValue}
	>
		<div
			class="inline-flex items-center border transition-colors bg-white {hasError
				? 'border-red-300 focus-within:border-red-400'
				: 'border-warm-grey focus-within:border-dark-grey'} {s.input}"
		>
			{#each inputTypes as type (type)}
				<DateRangePicker.Input
					{type}
					class="inline-flex items-center gap-0.5 rounded-sm px-0.5 -mx-0.5 transition-colors {type ===
						'start' && startHasError
						? 'bg-red-50'
						: ''} {type === 'end' && endHasError ? 'bg-red-50' : ''}"
				>
					{#snippet children({ segments })}
						{#each segments as { part, value }, i (part + i)}
							{#if part === 'literal'}
								<span class="text-mid-grey {s.segment}">{value}</span>
							{:else}
								<DateRangePicker.Segment
									{part}
									class="rounded text-dark-grey tabular-nums focus:bg-light-warm-grey focus:text-dark-grey focus:outline-none {s.segment}"
								>
									{value}
								</DateRangePicker.Segment>
							{/if}
						{/each}
					{/snippet}
				</DateRangePicker.Input>
				{#if type === 'start'}
					<span class="text-mid-grey {s.separator}">&ndash;</span>
				{/if}
			{/each}

			<DateRangePicker.Trigger
				class="rounded text-mid-grey transition-colors hover:text-dark-grey focus:outline-none {s.trigger}"
			>
				<Calendar class={s.iconSize} />
			</DateRangePicker.Trigger>
		</div>

		<DateRangePicker.Content
			sideOffset={6}
			class="z-50 border border-warm-grey bg-white shadow-lg {s.content}"
		>
			<DateRangePicker.Calendar>
				{#snippet children({ months, weekdays })}
					<DateRangePicker.Header class="flex items-center justify-between pb-3">
						<DateRangePicker.PrevButton
							class="rounded-md text-mid-grey transition-colors hover:bg-light-warm-grey hover:text-dark-grey {s.navButton}"
						>
							<ChevronLeft class={s.navIcon} />
						</DateRangePicker.PrevButton>

						<DateRangePicker.Heading class="font-medium text-dark-grey {s.heading}" />

						<DateRangePicker.NextButton
							class="rounded-md text-mid-grey transition-colors hover:bg-light-warm-grey hover:text-dark-grey {s.navButton}"
						>
							<ChevronRight class={s.navIcon} />
						</DateRangePicker.NextButton>
					</DateRangePicker.Header>

					{#each months as month (month.value)}
						<DateRangePicker.Grid class="w-full border-collapse">
							<DateRangePicker.GridHead>
								<DateRangePicker.GridRow class="flex w-full">
									{#each weekdays as day (day)}
										<DateRangePicker.HeadCell
											class="text-center font-medium text-mid-grey {s.headCell}"
										>
											{day.slice(0, 2)}
										</DateRangePicker.HeadCell>
									{/each}
								</DateRangePicker.GridRow>
							</DateRangePicker.GridHead>

							<DateRangePicker.GridBody>
								{#each month.weeks as weekDates (weekDates)}
									<DateRangePicker.GridRow class="flex w-full">
										{#each weekDates as date (date)}
											<DateRangePicker.Cell
												{date}
												month={month.value}
												class="relative p-0 text-center"
											>
												<DateRangePicker.Day
													class="relative inline-flex items-center justify-center rounded-md text-dark-grey transition-colors hover:bg-light-warm-grey focus:outline-none data-[disabled]:pointer-events-none data-[outside-month]:text-warm-grey data-[outside-month]:pointer-events-none data-[highlighted]:bg-light-warm-grey data-[highlighted]:rounded-none data-[selected]:bg-dark-grey data-[selected]:text-white data-[selected]:rounded-none data-[selection-start]:rounded-l-md data-[selection-end]:rounded-r-md data-[disabled]:text-warm-grey {s.dayCell}"
												>
													{date.day}
													{#if isToday(date)}
														<span
															class="absolute left-1/2 -translate-x-1/2 rounded-full bg-current {s.todayDot}"
														></span>
													{/if}
												</DateRangePicker.Day>
											</DateRangePicker.Cell>
										{/each}
									</DateRangePicker.GridRow>
								{/each}
							</DateRangePicker.GridBody>
						</DateRangePicker.Grid>
					{/each}
				{/snippet}
			</DateRangePicker.Calendar>
		</DateRangePicker.Content>
	</DateRangePicker.Root>

	{#if errorMessage}
		<p class="text-xs text-red-500 mt-1">{errorMessage}</p>
	{/if}
</div>
