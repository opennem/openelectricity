<script>
	import FilterSelect from '$lib/components/filters/FilterSelect.svelte';
	import {
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
	 * IntervalControls — the interval pill and calendar-period filter shared by
	 * the Timeline range bar and Compare. The pill lists the base grains; the
	 * 12-month rolling sum is a switch in its footer, offered whenever a grain
	 * has a rolling variant among `options`, so a rolling interval reads as its
	 * grain plus the switch. The calendar-period pill ("All", or a month,
	 * season, quarter or half) follows the grain and hides where it has none.
	 * Both render as siblings, so the caller's flex row spaces them.
	 *
	 * @typedef {Object} Props
	 * @property {string[]} options - Selectable interval ids, including any `12mr*` rolling variants
	 * @property {string} displayInterval - Active interval id
	 * @property {boolean} [staticDisplay] - Show the interval as a static badge instead of a dropdown
	 * @property {boolean} [showBucketFilter] - Offer the calendar-period filter. Default `false`.
	 * @property {string | null} [bucketFilter] - Active calendar-period filter id, null = All
	 * @property {(interval: string) => void} [onintervalchange]
	 * @property {(filter: string | null) => void} [onbucketfilterchange]
	 */

	/** @type {Props} */
	let {
		options,
		displayInterval,
		staticDisplay = false,
		showBucketFilter = false,
		bucketFilter = null,
		onintervalchange,
		onbucketfilterchange
	} = $props();

	let rollingActive = $derived(isRollingInterval(displayInterval));
	let baseInterval = $derived(baseIntervalFor(displayInterval) ?? displayInterval);
	// While rolling, grains without a rolling variant are dimmed.
	let intervalOptions = $derived(
		options
			.filter((id) => !isRollingInterval(id))
			.map((id) => {
				const rollingTarget = rollingIntervalFor(id);
				return {
					value: id,
					label: getIntervalSpec(id)?.label ?? id,
					disabled: rollingActive && !(rollingTarget && options.includes(rollingTarget))
				};
			})
	);
	let currentIntervalLabel = $derived(getIntervalSpec(displayInterval)?.label ?? displayInterval);
	let rollingSupported = $derived(options.some((id) => isRollingInterval(id)));
	let rollingAvailable = $derived.by(() => {
		const target = rollingIntervalFor(baseInterval);
		return target != null && options.includes(target);
	});

	/** @param {string} baseId */
	function handleBaseIntervalChange(baseId) {
		const target = rollingActive ? rollingIntervalFor(baseId) : null;
		onintervalchange?.(target && options.includes(target) ? target : baseId);
	}

	function toggleRolling() {
		if (rollingActive) {
			onintervalchange?.(baseInterval);
			return;
		}
		const target = rollingIntervalFor(baseInterval);
		if (target && options.includes(target)) onintervalchange?.(target);
	}

	let bucketFilterOptions = $derived(bucketFilterOptionsFor(bucketFilterKindFor(displayInterval)));
	let bucketFilterSelectOptions = $derived([
		{ value: 'all', label: 'All', divider: true },
		...(bucketFilterOptions ?? []).map((option) => ({ value: option.id, label: option.label }))
	]);
</script>

{#snippet rollingToggle()}
	<!-- A switch keeps the rolling window independent of the base grain. -->
	<button
		type="button"
		role="switch"
		aria-checked={rollingActive}
		disabled={!rollingActive && !rollingAvailable}
		onclick={toggleRolling}
		class="w-full flex items-center gap-5 px-2 py-2 rounded-md cursor-pointer outline-none transition-colors hover:bg-warm-grey disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent {rollingActive
			? 'text-black'
			: 'text-mid-grey'}"
	>
		<span class="flex-1 text-left whitespace-nowrap">12-mth rolling sum</span>
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
{/snippet}

{#if staticDisplay}
	<!-- Matches FilterPill's inactive pill. -->
	<span
		class="inline-flex items-center rounded-lg border border-warm-grey bg-white px-4 py-2.5 text-xs font-medium text-dark-grey"
	>
		{currentIntervalLabel}
	</span>
{:else}
	<FilterSelect
		selected={baseInterval}
		options={intervalOptions}
		listLabel="Interval"
		compact
		footer={rollingSupported ? rollingToggle : undefined}
		onchange={handleBaseIntervalChange}
	/>
{/if}
{#if showBucketFilter && bucketFilterOptions}
	<!-- Compare the same calendar period across years. -->
	<FilterSelect
		selected={bucketFilter ?? 'all'}
		options={bucketFilterSelectOptions}
		listLabel="Calendar period"
		defaultValue="all"
		compact
		onchange={(value) => onbucketfilterchange?.(value === 'all' ? null : value)}
	/>
{/if}
