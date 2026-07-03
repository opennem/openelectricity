<script>
	import { Popover, Select } from 'bits-ui';
	import { DateRangePicker } from '$lib/components/ui/date-range-picker';
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
		pending = false,
		onrangeselect,
		ondaterangechange,
		onintervalchange
	} = $props();

	const rangePresets = RANGE_PRESETS;

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
		class="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md border border-warm-grey text-mid-grey"
	>
		{currentIntervalLabel}
	</span>
{/snippet}

<!-- Desktop layout -->
<div class="hidden sm:flex items-center gap-1.5">
	<!-- Range preset switcher -->
	<div class="flex items-center gap-0.5 bg-light-warm-grey rounded-md p-0.5">
		{#each rangePresets as preset (preset.days)}
			<button
				class="px-2.5 py-1 text-xs font-medium rounded transition-colors {selectedRange ===
				preset.days
					? 'bg-white text-dark-grey shadow-sm'
					: 'text-mid-grey hover:text-dark-grey'} {pending && selectedRange === preset.days
					? 'animate-pulse'
					: ''}"
				aria-busy={pending && selectedRange === preset.days}
				onclick={() => handlePresetClick(preset.days)}
			>
				{preset.label}
			</button>
		{/each}
	</div>

	<span class="text-warm-grey text-xs">|</span>

	<!-- Calendar popover -->
	<Popover.Root bind:open={popoverOpen}>
		<Popover.Trigger
			class="px-2.5 py-1 text-xs font-medium rounded-md transition-colors {popoverOpen
				? 'bg-dark-grey text-white'
				: 'border border-warm-grey text-mid-grey hover:bg-light-warm-grey'}"
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

	<span class="text-warm-grey text-xs">|</span>

	{#if showIntervalDropdown}
		<!-- Interval dropdown -->
		<Select.Root
			type="single"
			value={displayInterval}
			onValueChange={(v) => onintervalchange?.(v)}
			items={intervalOptions}
		>
			<Select.Trigger
				class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-warm-grey text-mid-grey hover:bg-light-warm-grey transition-colors cursor-pointer"
			>
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
</div>

<!-- Mobile layout -->
<div class="flex sm:hidden items-center gap-2">
	<!-- Range dropdown -->
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
			class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-warm-grey text-mid-grey hover:bg-light-warm-grey transition-colors cursor-pointer {pending
				? 'animate-pulse'
				: ''}"
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

	{#if showIntervalDropdown}
		<!-- Interval dropdown -->
		<Select.Root
			type="single"
			value={displayInterval}
			onValueChange={(v) => onintervalchange?.(v)}
			items={intervalOptions}
		>
			<Select.Trigger
				class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-warm-grey text-mid-grey hover:bg-light-warm-grey transition-colors cursor-pointer"
			>
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
</div>
