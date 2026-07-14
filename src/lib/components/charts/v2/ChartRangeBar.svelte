<script>
	import { Popover, Select } from 'bits-ui';
	import { DateRangePicker } from '$lib/components/ui/date-range-picker';
	import SwitchWithIcons from '$lib/components/SwitchWithIcons.svelte';
	import Calendar from '@lucide/svelte/icons/calendar';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import {
		RANGE_PRESETS,
		getPresetByDays,
		getIntervalsForRange,
		getIntervalOptionsForDays,
		getIntervalSpec
	} from '$lib/components/charts/facility/range-interval-config.js';

	/**
	 * @typedef {Object} Props
	 * @property {number | null} [selectedRange] - Active preset in days (null = custom date range)
	 * @property {number | null} [customDays] - Span (days) of the current custom view, used to derive interval options when no preset is active
	 * @property {string} [displayInterval] - Active interval id (5m | 30m | 1d | 7d | 1M | season | quarter | half | fy | 1y)
	 * @property {string | null} [startDate] - YYYY-MM-DD for DateRangePicker
	 * @property {string | null} [endDate] - YYYY-MM-DD for DateRangePicker
	 * @property {string | null} [minDate] - Earliest selectable date
	 * @property {string | null} [maxDate] - Latest selectable date
	 * @property {string | null} [earliestDate] - Earliest data date (for "All" range)
	 * @property {boolean} [showIntervalDropdown] - When false, the interval renders as a static badge instead of a Select dropdown. Default `true`.
	 * @property {boolean} [compact] - Always render the range picker as a dropdown (plus the calendar popover) regardless of viewport width — for narrow containers like the unit slide-out where the preset pills don't fit. Default `false` (responsive: pills at `md:` and up, dropdowns below).
	 * @property {boolean} [raised] - Rest-state controls render as raised white chips instead of grey ones — for placement on the recessed light-grey toolbar tray. Default `false`.
	 * @property {boolean} [pending] - While true, the active range control pulses to show the switched range is still loading. The bar stays interactive.
	 * @property {(days: number) => void} [onrangeselect]
	 * @property {(range: {start: string, end: string}) => void} [ondaterangechange]
	 * @property {(interval: string) => void} [onintervalchange]
	 */

	/** @type {Props} */
	let {
		selectedRange = null,
		customDays = null,
		displayInterval = '5m',
		startDate = null,
		endDate = null,
		minDate = null,
		maxDate = null,
		earliestDate = null,
		showIntervalDropdown = true,
		compact = false,
		raised = false,
		pending = false,
		onrangeselect,
		ondaterangechange,
		onintervalchange
	} = $props();

	const rangePresets = RANGE_PRESETS;

	// Rest-state chip fill: grey on plain surfaces, raised white (with a whisper
	// of lift) when the bar sits on the recessed toolbar tray.
	let chipRestClass = $derived(
		raised ? 'border-warm-grey bg-white shadow-xs' : 'border-mid-warm-grey bg-light-warm-grey'
	);

	// Shared pill styling for the range/interval dropdown triggers so they match
	// the SwitchWithIcons switcher: light track at rest, dark thumb when open.
	let selectTriggerClass = $derived(
		`inline-flex items-center gap-1 rounded-lg border ${chipRestClass} px-3 py-2.5 text-xs font-medium text-mid-grey transition-colors hover:text-black data-[state=open]:border-dark-grey data-[state=open]:bg-dark-grey data-[state=open]:text-white cursor-pointer`
	);

	// Interval options follow the selected range (or the custom span's tier).
	let intervalOptions = $derived.by(() => {
		const preset = selectedRange != null ? getPresetByDays(selectedRange) : null;
		const ids = preset
			? getIntervalsForRange(preset.id).options
			: getIntervalOptionsForDays(customDays ?? 0).options;
		return ids.map((id) => ({ value: id, label: getIntervalSpec(id)?.label ?? id }));
	});

	let currentIntervalLabel = $derived(getIntervalSpec(displayInterval)?.label ?? displayInterval);

	let currentRangeLabel = $derived(getPresetByDays(selectedRange ?? NaN)?.label ?? 'Range');

	let popoverOpen = $state(false);

	/** @type {import('$lib/components/ui/date-range-picker/DateRangePicker.svelte').default | undefined} */
	let datePickerRef = $state(undefined);

	/**
	 * @param {number} days
	 */
	function handlePresetClick(days) {
		datePickerRef?.clearErrors();
		onrangeselect?.(days);
	}
</script>

{#snippet intervalBadge()}
	<span
		class="inline-flex items-center rounded-lg border {chipRestClass} px-3 py-2.5 text-xs font-medium text-mid-grey"
	>
		{currentIntervalLabel}
	</span>
{/snippet}

{#snippet rangeDropdown()}
	<Select.Root
		type="single"
		value={String(selectedRange ?? '')}
		onValueChange={(v) => {
			const days = parseInt(v, 10);
			if (!isNaN(days)) handlePresetClick(days);
		}}
		items={rangePresets.map((p) => ({ value: String(p.days), label: p.label }))}
	>
		<Select.Trigger
			class="{selectTriggerClass} {pending ? 'animate-pulse' : ''}"
			aria-busy={pending}
		>
			{currentRangeLabel}
			<ChevronDown size={12} />
		</Select.Trigger>
		<Select.Content
			sideOffset={4}
			class="z-50 border border-warm-grey bg-white shadow-lg rounded-lg p-1"
		>
			{#each rangePresets as preset (preset.days)}
				<Select.Item
					value={String(preset.days)}
					label={preset.label}
					class="px-3 py-1.5 text-xs rounded cursor-pointer outline-none transition-colors data-[highlighted]:bg-light-warm-grey data-[selected]:font-medium data-[selected]:text-dark-grey"
				>
					{preset.label}
				</Select.Item>
			{/each}
		</Select.Content>
	</Select.Root>
{/snippet}

{#snippet calendarPopover()}
	<Popover.Root bind:open={popoverOpen}>
		<Popover.Trigger
			class="inline-flex items-center rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors {popoverOpen
				? 'border-dark-grey bg-dark-grey text-white shadow-sm'
				: `${chipRestClass} text-mid-grey hover:text-black`}"
		>
			<Calendar size={14} />
		</Popover.Trigger>
		<Popover.Portal>
			<Popover.Content
				sideOffset={6}
				class="z-50 border border-warm-grey bg-white shadow-lg p-3 rounded-xl w-auto max-w-[calc(100vw-2rem)]"
			>
				<DateRangePicker
					bind:this={datePickerRef}
					{startDate}
					{endDate}
					{minDate}
					{maxDate}
					size="sm"
					onchange={ondaterangechange}
				/>
			</Popover.Content>
		</Popover.Portal>
	</Popover.Root>
{/snippet}

{#snippet intervalControl()}
	{#if showIntervalDropdown}
		<Select.Root
			type="single"
			value={displayInterval}
			onValueChange={(v) => onintervalchange?.(v)}
			items={intervalOptions}
		>
			<Select.Trigger class={selectTriggerClass}>
				{currentIntervalLabel}
				<ChevronDown size={12} />
			</Select.Trigger>
			<Select.Content
				sideOffset={4}
				class="z-50 border border-warm-grey bg-white shadow-lg rounded-lg p-1"
			>
				{#each intervalOptions as option (option.value)}
					<Select.Item
						value={option.value}
						label={option.label}
						class="px-3 py-1.5 text-xs rounded cursor-pointer outline-none transition-colors data-[highlighted]:bg-light-warm-grey data-[selected]:font-medium data-[selected]:text-dark-grey"
					>
						{option.label}
					</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	{:else}
		{@render intervalBadge()}
	{/if}
{/snippet}

{#if compact}
	<!-- Compact layout — range dropdown at every viewport width, for narrow
	     containers where the preset pills don't fit. Keeps the calendar popover
	     so custom date ranges stay available. -->
	<div class="flex items-stretch gap-1.5">
		{@render rangeDropdown()}
		{@render calendarPopover()}
		{@render intervalControl()}
	</div>
{:else}
	<!-- Desktop layout — items-stretch so the icon-only calendar matches the height
	     of the text controls (switcher / interval) rather than sitting shorter. -->
	<div class="hidden md:flex items-stretch gap-1.5">
		<!-- Range preset switcher -->
		<SwitchWithIcons
			buttons={rangePresets.map((p) => ({ label: p.label, value: p.days }))}
			selected={selectedRange ?? ''}
			compact
			rounded="rounded-lg"
			darkSelected
			trackClass={chipRestClass}
			class={pending ? 'animate-pulse' : ''}
			onchange={(opt) => handlePresetClick(Number(opt.value))}
		/>

		{@render calendarPopover()}
		{@render intervalControl()}
	</div>

	<!-- Mobile layout -->
	<div class="flex md:hidden items-center gap-2">
		{@render rangeDropdown()}
		{@render intervalControl()}
	</div>
{/if}
