<script>
	import { Popover, Select } from 'bits-ui';
	import { DateRangePicker } from '$lib/components/ui/date-range-picker';
	import Calendar from '@lucide/svelte/icons/calendar';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';

	/**
	 * @typedef {Object} Props
	 * @property {number | null} [selectedRange] - Active preset in days (null = custom date range)
	 * @property {string} [activeMetric] - 'power' | 'energy'
	 * @property {string} [displayInterval] - '5m' | '30m' | '1d' | '1M'
	 * @property {string | null} [startDate] - YYYY-MM-DD for DateRangePicker
	 * @property {string | null} [endDate] - YYYY-MM-DD for DateRangePicker
	 * @property {string | null} [minDate] - Earliest selectable date
	 * @property {string | null} [maxDate] - Latest selectable date
	 * @property {string | null} [earliestDate] - Earliest data date (for "All" range)
	 * @property {(days: number) => void} [onrangeselect]
	 * @property {(range: {start: string, end: string}) => void} [ondaterangechange]
	 * @property {(interval: string) => void} [onintervalchange]
	 */

	/** @type {Props} */
	let {
		selectedRange = null,
		activeMetric = 'power',
		displayInterval = '5m',
		startDate = null,
		endDate = null,
		minDate = null,
		maxDate = null,
		earliestDate = null,
		onrangeselect,
		ondaterangechange,
		onintervalchange
	} = $props();

	const rangePresets = [
		{ label: '1D', days: 1 },
		{ label: '3D', days: 3 },
		{ label: '7D', days: 7 },
		{ label: '1M', days: 30 },
		{ label: '6M', days: 182 },
		{ label: '1Y', days: 365 },
		{ label: '5Y', days: 1825 },
		{ label: 'All', days: -1 }
	];

	let intervalOptions = $derived(
		activeMetric === 'power'
			? [
					{ value: '5m', label: '5 min' },
					{ value: '30m', label: '30 min' }
				]
			: [
					{ value: '1d', label: 'Daily' },
					{ value: '1M', label: 'Monthly' },
					{ value: '3M', label: 'Quarterly' },
					{ value: '1y', label: 'Yearly' }
				]
	);

	let currentIntervalLabel = $derived(
		intervalOptions.find((o) => o.value === displayInterval)?.label ?? displayInterval
	);

	let currentRangeLabel = $derived(
		rangePresets.find((p) => p.days === selectedRange)?.label ?? 'Range'
	);

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

<!-- Desktop layout -->
<div class="hidden sm:flex items-center gap-1.5">
	<!-- Range preset switcher -->
	<div class="flex items-center gap-0.5 bg-light-warm-grey rounded-md p-0.5">
		{#each rangePresets as preset (preset.days)}
			<button
				class="px-2.5 py-1 text-xs font-medium rounded transition-colors {selectedRange === preset.days
					? 'bg-white text-dark-grey shadow-sm'
					: 'text-mid-grey hover:text-dark-grey'}"
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
		<Popover.Content sideOffset={6} class="z-50 border border-warm-grey bg-white shadow-lg p-3 rounded-xl">
			<DateRangePicker
				bind:this={datePickerRef}
				startDate={startDate}
				endDate={endDate}
				{minDate}
				{maxDate}
				size="sm"
				onchange={ondaterangechange}
			/>
		</Popover.Content>
	</Popover.Root>

	<span class="text-warm-grey text-xs">|</span>

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
			class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-warm-grey text-mid-grey hover:bg-light-warm-grey transition-colors cursor-pointer"
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
</div>
