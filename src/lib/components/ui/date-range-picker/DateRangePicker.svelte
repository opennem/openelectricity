<script>
	import { DateRangePicker } from 'bits-ui';
	import { CalendarDate } from '@internationalized/date';
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
	 * @property {'sm' | 'md' | 'lg'} [size] - Size variant for the From/To inputs
	 * @property {number} [numberOfMonths] - Months shown side by side in the calendar
	 * @property {(event: DateRangeChangeEvent) => void} [onchange] - Callback when date range changes
	 */

	/** @type {Props} */
	let {
		startDate = null,
		endDate = null,
		minDate = null,
		maxDate = null,
		size = 'md',
		numberOfMonths = 2,
		onchange
	} = $props();

	let minValue = $derived(parseDate(minDate));
	let maxValue = $derived(parseDate(maxDate));

	const sizeConfig = {
		sm: { input: 'px-2 py-1.5 rounded-lg', segment: 'px-0.5 text-xs' },
		md: { input: 'px-3 py-2 rounded-lg', segment: 'px-0.5 text-sm' },
		lg: { input: 'px-4 py-2.5 rounded-xl', segment: 'px-1 text-base' }
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
		localRange = /** @type {{ start: CalendarDate | undefined, end: CalendarDate | undefined }} */ (
			value
		);

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
		// Cancel any pending blur validation (e.g. focus moved to calendar and back)
		if (blurTimer) {
			clearTimeout(blurTimer);
			blurTimer = null;
		}
	}

	/**
	 * Show validation errors when focus leaves the date picker entirely.
	 * Uses a small delay to handle focus transitions within the panel.
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

	const monthHeadingFmt = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });

	/**
	 * Heading label ("June 2026") for a month's first-day DateValue.
	 * @param {import('@internationalized/date').DateValue} dateValue
	 * @returns {string}
	 */
	function formatMonthHeading(dateValue) {
		return monthHeadingFmt.format(new Date(dateValue.year, dateValue.month - 1, 1));
	}
</script>

<div
	bind:this={containerEl}
	onfocusin={handleFocusIn}
	onfocusout={handleFocusOut}
	class="inline-block font-space"
>
	<DateRangePicker.Root
		weekdayFormat="short"
		fixedWeeks={true}
		{locale}
		{numberOfMonths}
		value={dateRange}
		onValueChange={handleValueChange}
		{minValue}
		{maxValue}
	>
		<!-- Labelled From / To inputs (type to edit, or pick from the calendar) -->
		<div class="flex items-end gap-3">
			{#each inputTypes as type (type)}
				{@const fieldErr = type === 'start' ? startHasError : endHasError}
				<label class="flex min-w-0 flex-1 flex-col">
					<span class="mb-1 text-[10px] font-medium uppercase tracking-wider text-mid-grey">
						{type === 'start' ? 'From' : 'To'}
					</span>
					<DateRangePicker.Input
						{type}
						class="flex w-full items-center justify-center gap-0.5 border bg-white transition-colors {fieldErr
							? 'border-red-300 bg-red-50'
							: 'border-warm-grey focus-within:border-dark-grey'} {s.input}"
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
				</label>
			{/each}
		</div>

		<!-- Two-month range calendar -->
		<DateRangePicker.Calendar class="mt-3 border-t border-warm-grey pt-3">
			{#snippet children({ months, weekdays })}
				<div class="relative">
					<DateRangePicker.PrevButton
						class="absolute left-0 top-0 rounded-md p-1 text-mid-grey transition-colors hover:bg-light-warm-grey hover:text-dark-grey focus:outline-none"
					>
						<ChevronLeft class="size-4" />
					</DateRangePicker.PrevButton>

					<DateRangePicker.NextButton
						class="absolute right-0 top-0 rounded-md p-1 text-mid-grey transition-colors hover:bg-light-warm-grey hover:text-dark-grey focus:outline-none"
					>
						<ChevronRight class="size-4" />
					</DateRangePicker.NextButton>

					<div class="flex flex-col gap-4 sm:flex-row sm:gap-6">
						{#each months as month (month.value)}
							<div>
								<div class="pb-3 text-center text-xs font-medium text-dark-grey">
									{formatMonthHeading(month.value)}
								</div>

								<DateRangePicker.Grid class="select-none border-collapse">
									<DateRangePicker.GridHead>
										<DateRangePicker.GridRow class="flex">
											{#each weekdays as day (day)}
												<DateRangePicker.HeadCell
													class="w-8 text-center text-[10px] font-medium text-mid-grey"
												>
													{day.slice(0, 2)}
												</DateRangePicker.HeadCell>
											{/each}
										</DateRangePicker.GridRow>
									</DateRangePicker.GridHead>

									<DateRangePicker.GridBody>
										{#each month.weeks as weekDates (weekDates)}
											<DateRangePicker.GridRow class="flex">
												{#each weekDates as date (date)}
													<DateRangePicker.Cell
														{date}
														month={month.value}
														class="relative p-0 text-center"
													>
														<DateRangePicker.Day
															class="relative inline-flex h-8 w-8 items-center justify-center rounded-md text-xs text-dark-grey transition-colors hover:bg-light-warm-grey focus:outline-none data-[disabled]:pointer-events-none data-[outside-month]:pointer-events-none data-[selected]:rounded-none data-[selection-end]:rounded-r-md data-[selection-start]:rounded-l-md data-[highlighted]:bg-light-warm-grey data-[highlighted]:rounded-none data-[selected]:bg-dark-grey data-[disabled]:text-warm-grey data-[outside-month]:text-warm-grey data-[selected]:text-white"
														>
															{date.day}
															{#if isToday(date)}
																<span
																	class="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-current"
																></span>
															{/if}
														</DateRangePicker.Day>
													</DateRangePicker.Cell>
												{/each}
											</DateRangePicker.GridRow>
										{/each}
									</DateRangePicker.GridBody>
								</DateRangePicker.Grid>
							</div>
						{/each}
					</div>
				</div>
			{/snippet}
		</DateRangePicker.Calendar>

		{#if errorMessage}
			<p class="mt-2 text-center text-xs text-red">{errorMessage}</p>
		{/if}
	</DateRangePicker.Root>
</div>
