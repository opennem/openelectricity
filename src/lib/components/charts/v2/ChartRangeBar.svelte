<script>
	import { MediaQuery } from 'svelte/reactivity';
	import { Popover, Select } from 'bits-ui';
	import { DateRangePicker } from '$lib/components/ui/date-range-picker';
	import SwitchWithIcons from '$lib/components/SwitchWithIcons.svelte';
	import { BottomSheet } from '$lib/components/ui/bottom-sheet';
	import { portal } from '$lib/actions/portal.js';
	import { BELOW_TABLET_QUERY } from '$lib/utils/fullscreen-mode.js';
	import Calendar from '@lucide/svelte/icons/calendar';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import X from '@lucide/svelte/icons/x';
	import {
		RANGE_PRESETS,
		getPresetByDays,
		getIntervalsForRange,
		getIntervalOptionsForDays,
		getIntervalSpec,
		isRollingInterval,
		rollingIntervalFor,
		baseIntervalFor
	} from '$lib/components/charts/facility/range-interval-config.js';
	import {
		bucketFilterKindFor,
		bucketFilterOptionsFor
	} from '$lib/components/charts/v2/bucket-filter.js';

	/**
	 * @typedef {Object} Props
	 * @property {number | null} [selectedRange] - Active preset in days (null = custom date range)
	 * @property {number | null} [customDays] - Span (days) of the current custom view, used to derive interval options when no preset is active
	 * @property {string} [displayInterval] - Active interval id, including the optional `12mr*` rolling variants
	 * @property {string | null} [startDate] - YYYY-MM-DD for DateRangePicker
	 * @property {string | null} [endDate] - YYYY-MM-DD for DateRangePicker
	 * @property {string | null} [minDate] - Earliest selectable date
	 * @property {string | null} [maxDate] - Latest selectable date
	 * @property {boolean} [showIntervalDropdown] - When false, the interval renders as a static badge instead of a Select dropdown. Default `true`.
	 * @property {boolean} [includeRollingInterval] - Offer the 12-month rolling modifier. Default `false`.
	 * @property {boolean} [showBucketFilter] - Offer calendar-period filtering in the All tier. Default `false`.
	 * @property {string | null} [bucketFilter] - Active calendar-period filter id, null = All.
	 * @property {(filter: string | null) => void} [onbucketfilterchange]
	 * @property {'expanded' | 'small'} [variant] - `expanded` uses the preset switcher at `md:` and up; `small` always uses dropdowns. Default `small`.
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
		showIntervalDropdown = true,
		includeRollingInterval = false,
		showBucketFilter = false,
		bucketFilter = null,
		variant = 'small',
		pending = false,
		onrangeselect,
		ondaterangechange,
		onintervalchange,
		onbucketfilterchange
	} = $props();

	const rangePresets = RANGE_PRESETS;

	const chipRestClass = 'border-mid-warm-grey bg-white';

	const selectTriggerClass = `inline-flex items-center gap-1.5 rounded-lg border ${chipRestClass} pl-4 pr-3 py-2.5 text-xs font-medium text-dark-grey transition-colors hover:border-dark-grey data-[state=open]:border-dark-grey data-[state=open]:bg-dark-grey data-[state=open]:text-white cursor-pointer`;

	const menuItemClass =
		'flex items-center gap-6 px-3 py-1.5 text-xs rounded-md cursor-pointer outline-none transition-colors text-mid-grey data-[highlighted]:bg-warm-grey data-[selected]:text-black data-[disabled]:opacity-40 data-[disabled]:cursor-default';

	// Interval options follow the selected range (or the custom span's tier).
	// Rolling ids remain valid state but render as a modifier below the base grains.
	let intervalOptionIds = $derived.by(() => {
		const preset = selectedRange != null ? getPresetByDays(selectedRange) : null;
		const tierOptions = { includeRolling: includeRollingInterval };
		return preset
			? getIntervalsForRange(preset.id, tierOptions).options
			: getIntervalOptionsForDays(customDays ?? 0, tierOptions).options;
	});
	let intervalOptions = $derived(
		intervalOptionIds
			.filter((id) => !isRollingInterval(id))
			.map((id) => ({ value: id, label: getIntervalSpec(id)?.label ?? id }))
	);

	let currentIntervalLabel = $derived(getIntervalSpec(displayInterval)?.label ?? displayInterval);

	let rollingActive = $derived(isRollingInterval(displayInterval));
	let baseInterval = $derived(baseIntervalFor(displayInterval) ?? displayInterval);
	let rollingSupported = $derived(intervalOptionIds.some((id) => isRollingInterval(id)));
	let rollingAvailable = $derived.by(() => {
		const target = rollingIntervalFor(baseInterval);
		return target != null && intervalOptionIds.includes(target);
	});

	/** @param {string} baseId */
	function handleBaseIntervalChange(baseId) {
		const target = rollingActive ? rollingIntervalFor(baseId) : null;
		onintervalchange?.(target && intervalOptionIds.includes(target) ? target : baseId);
	}

	function toggleRolling() {
		if (rollingActive) {
			onintervalchange?.(baseInterval);
			return;
		}
		const target = rollingIntervalFor(baseInterval);
		if (target && intervalOptionIds.includes(target)) onintervalchange?.(target);
	}

	let inAllTier = $derived(
		selectedRange === -1 || (selectedRange == null && (customDays ?? 0) > 550)
	);
	let bucketFilterOptions = $derived(bucketFilterOptionsFor(bucketFilterKindFor(displayInterval)));
	let bucketFilterVisible = $derived(showBucketFilter && inAllTier && !!bucketFilterOptions);
	let currentBucketFilterLabel = $derived(
		bucketFilterOptions?.find((option) => option.id === bucketFilter)?.label ?? 'All'
	);

	// Panning or zooming also leaves a concrete custom range.
	let isCustomActive = $derived(selectedRange == null && startDate != null && endDate != null);

	let currentRangeLabel = $derived(
		getPresetByDays(selectedRange ?? NaN)?.label ?? (isCustomActive ? 'Custom' : 'Range')
	);

	const switchButtons = [
		...RANGE_PRESETS.map((p) => ({ label: p.label, value: p.days })),
		{
			value: 'custom',
			icon: Calendar,
			size: 'size-4.5 -my-px',
			ariaLabel: 'Choose a custom date range'
		}
	];
	let switchSelected = $derived(selectedRange ?? (isCustomActive ? 'custom' : ''));

	const belowTablet = new MediaQuery(BELOW_TABLET_QUERY);

	let rangeMenuOpen = $state(false);
	let pickerOpen = $state(false);
	/** @type {HTMLElement | undefined} */
	let pickerAnchorEl = $state(undefined);
	let sheetOpen = $state(false);
	let sheetContainerHeight = $state(0);
	/** @type {HTMLElement | null} */
	let rangeTriggerEl = $state(null);

	/** @type {import('$lib/components/ui/date-range-picker/DateRangePicker.svelte').default | undefined} */
	let popoverPickerRef = $state(undefined);
	/** @type {import('$lib/components/ui/date-range-picker/DateRangePicker.svelte').default | undefined} */
	let sheetPickerRef = $state(undefined);

	/**
	 * A preset pick dismisses either custom picker and clears its validation.
	 * @param {number} days
	 */
	function handlePresetClick(days) {
		pickerOpen = false;
		sheetOpen = false;
		popoverPickerRef?.clearErrors();
		sheetPickerRef?.clearErrors();
		onrangeselect?.(days);
	}

	/**
	 * Open the date picker beside the control that requested it.
	 * @param {HTMLElement | null | undefined} anchor
	 */
	function openPicker(anchor) {
		if (!anchor) return;
		pickerAnchorEl = anchor;
		pickerOpen = true;
	}

	function openCustomFromDropdown() {
		rangeMenuOpen = false;
		if (belowTablet.current) {
			sheetOpen = true;
		} else {
			openPicker(rangeTriggerEl);
		}
	}

	/**
	 * @param {{value: string, element: HTMLButtonElement}} opt
	 */
	function handleSwitchChange(opt) {
		if (opt.value === 'custom') {
			openPicker(opt.element);
		} else {
			handlePresetClick(Number(opt.value));
		}
	}
</script>

{#snippet radioRow(/** @type {string} */ label, /** @type {boolean} */ checked)}
	<span class="flex-1 text-left">{label}</span>
	<span
		class="flex size-[15px] shrink-0 items-center justify-center rounded-full border {checked
			? 'border-mid-grey'
			: 'border-mid-warm-grey'}"
		aria-hidden="true"
	>
		{#if checked}<span class="size-[9px] rounded-full bg-dark-grey"></span>{/if}
	</span>
{/snippet}

{#snippet intervalBadge()}
	<span
		class="inline-flex items-center rounded-lg border {chipRestClass} px-4 py-2.5 text-xs font-medium text-dark-grey"
	>
		{currentIntervalLabel}
	</span>
{/snippet}

{#snippet rangeDropdown()}
	<Select.Root
		type="single"
		bind:open={rangeMenuOpen}
		value={String(selectedRange ?? '')}
		onValueChange={(v) => {
			const days = parseInt(v, 10);
			if (!isNaN(days)) handlePresetClick(days);
		}}
		items={rangePresets.map((p) => ({ value: String(p.days), label: p.label }))}
	>
		<Select.Trigger
			bind:ref={rangeTriggerEl}
			class="{selectTriggerClass} {pending ? 'animate-pulse' : ''}"
			aria-busy={pending}
		>
			{currentRangeLabel}
			<ChevronDown size={14} />
		</Select.Trigger>
		<Select.Content
			sideOffset={4}
			class="z-50 border border-warm-grey bg-white shadow-lg rounded-lg p-1"
		>
			{#each rangePresets as preset (preset.days)}
				<Select.Item value={String(preset.days)} label={preset.label} class={menuItemClass}>
					{#snippet children({ selected })}
						{@render radioRow(preset.label, selected)}
					{/snippet}
				</Select.Item>
			{/each}

			<!-- This opens another control, so it must not commit a Select value. -->
			<div class="my-1 h-px bg-warm-grey" role="separator"></div>
			<button
				type="button"
				class="w-full flex items-center gap-6 px-3 py-1.5 text-xs rounded-md cursor-pointer outline-none transition-colors hover:bg-warm-grey {isCustomActive
					? 'text-black'
					: 'text-mid-grey'}"
				onclick={openCustomFromDropdown}
			>
				{@render radioRow('Custom…', isCustomActive)}
			</button>
		</Select.Content>
	</Select.Root>
{/snippet}

{#snippet intervalControl()}
	{#if showIntervalDropdown}
		<Select.Root
			type="single"
			value={baseInterval}
			onValueChange={handleBaseIntervalChange}
			items={intervalOptions}
		>
			<Select.Trigger class={selectTriggerClass}>
				{currentIntervalLabel}
				<ChevronDown size={14} />
			</Select.Trigger>
			<Select.Content
				sideOffset={4}
				class="z-50 border border-warm-grey bg-white shadow-lg rounded-lg p-1"
			>
				{#each intervalOptions as option (option.value)}
					{@const rollingTarget = rollingIntervalFor(option.value)}
					{@const dimmed =
						rollingActive && !(rollingTarget && intervalOptionIds.includes(rollingTarget))}
					<Select.Item
						value={option.value}
						label={option.label}
						disabled={dimmed}
						class={menuItemClass}
					>
						{#snippet children({ selected })}
							{@render radioRow(option.label, selected)}
						{/snippet}
					</Select.Item>
				{/each}

				{#if rollingSupported}
					<!-- A switch keeps the rolling window independent of the base grain. -->
					<div class="my-1 h-px bg-warm-grey" role="separator"></div>
					<button
						type="button"
						role="switch"
						aria-checked={rollingActive}
						disabled={!rollingActive && !rollingAvailable}
						onclick={toggleRolling}
						class="w-full flex items-center gap-6 px-3 py-1.5 text-xs rounded-md cursor-pointer outline-none transition-colors hover:bg-warm-grey disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent {rollingActive
							? 'text-black'
							: 'text-mid-grey'}"
					>
						<span class="flex-1 text-left">12-mth rolling sum</span>
						<span
							class="relative h-4 w-7 shrink-0 rounded-full transition-colors {rollingActive
								? 'bg-dark-grey'
								: 'bg-mid-warm-grey'}"
						>
							<span
								class="absolute top-0.5 size-3 rounded-full bg-white transition-all {rollingActive
									? 'left-3.5'
									: 'left-0.5'}"
							></span>
						</span>
					</button>
				{/if}
			</Select.Content>
		</Select.Root>
	{:else}
		{@render intervalBadge()}
	{/if}
{/snippet}

{#snippet bucketFilterControl()}
	{#if bucketFilterVisible && bucketFilterOptions}
		<!-- Compare the same calendar period across years. -->
		<Select.Root
			type="single"
			value={bucketFilter ?? 'all'}
			onValueChange={(v) => onbucketfilterchange?.(v === 'all' ? null : v)}
			items={[
				{ value: 'all', label: 'All' },
				...bucketFilterOptions.map((option) => ({ value: option.id, label: option.label }))
			]}
		>
			<Select.Trigger class={selectTriggerClass}>
				{currentBucketFilterLabel}
				<ChevronDown size={14} />
			</Select.Trigger>
			<Select.Content
				sideOffset={4}
				class="z-50 border border-warm-grey bg-white shadow-lg rounded-lg p-1"
			>
				<Select.Item value="all" label="All" class={menuItemClass}>
					{#snippet children({ selected })}
						{@render radioRow('All', selected)}
					{/snippet}
				</Select.Item>
				<div class="my-1 h-px bg-warm-grey" role="separator"></div>
				{#each bucketFilterOptions as option (option.id)}
					<Select.Item value={option.id} label={option.label} class={menuItemClass}>
						{#snippet children({ selected })}
							{@render radioRow(option.label, selected)}
						{/snippet}
					</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	{/if}
{/snippet}

{#snippet smallControls()}
	{@render rangeDropdown()}
	{@render intervalControl()}
	{@render bucketFilterControl()}
{/snippet}

{#if variant === 'expanded'}
	<!-- The switcher falls back to dropdowns below `md`. -->
	<div class="hidden md:flex items-stretch gap-1.5">
		<SwitchWithIcons
			buttons={switchButtons}
			selected={switchSelected}
			compact
			rounded="rounded-lg"
			darkSelected
			trackClass={chipRestClass}
			class={pending ? 'animate-pulse' : ''}
			aria-busy={pending}
			onchange={handleSwitchChange}
		/>
		{@render intervalControl()}
		{@render bucketFilterControl()}
	</div>

	<div class="flex md:hidden items-stretch gap-1.5">
		{@render smallControls()}
	</div>
{:else}
	<div class="flex items-stretch gap-1.5">
		{@render smallControls()}
	</div>
{/if}

<!-- Both desktop entry points share one popover and restore focus to its opener. -->
<Popover.Root bind:open={pickerOpen}>
	<Popover.Portal>
		<!-- Portalled sheets use z-[9999]. -->
		<Popover.Content
			customAnchor={pickerAnchorEl ?? null}
			sideOffset={6}
			class="z-[10000] border border-warm-grey bg-white shadow-lg p-3 rounded-xl w-auto max-w-[calc(100vw-2rem)]"
			onCloseAutoFocus={(e) => {
				// This controlled popover has no Popover.Trigger to restore automatically.
				e.preventDefault();
				pickerAnchorEl?.focus();
			}}
		>
			<DateRangePicker
				bind:this={popoverPickerRef}
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

<!-- Keep the portalled mobile sheet mounted so its exit transition can play. -->
<div
	use:portal
	class="tablet:hidden fixed inset-0 z-[10000] pointer-events-none"
	bind:clientHeight={sheetContainerHeight}
>
	<BottomSheet
		open={sheetOpen}
		onclose={() => (sheetOpen = false)}
		containerHeight={sheetContainerHeight}
		peekFraction={0.8}
		fullFraction={0.94}
		class="pointer-events-auto"
	>
		{#snippet header()}
			<div
				class="shrink-0 px-6 pt-2 pb-4 border-b border-warm-grey flex items-center justify-between gap-2"
			>
				<h3 class="mb-0 text-base">Custom date range</h3>
				<button
					type="button"
					class="p-2 rounded-full bg-light-warm-grey hover:bg-warm-grey transition-colors cursor-pointer"
					onclick={() => (sheetOpen = false)}
					aria-label="Close date picker"
				>
					<X class="size-5 text-dark-grey" />
				</button>
			</div>
		{/snippet}
		<div class="px-6 py-4">
			<DateRangePicker
				bind:this={sheetPickerRef}
				{startDate}
				{endDate}
				{minDate}
				{maxDate}
				size="md"
				onchange={ondaterangechange}
			/>
		</div>
	</BottomSheet>
</div>
