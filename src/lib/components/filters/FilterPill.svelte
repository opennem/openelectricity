<script>
	import IconChevronDown from '$lib/icons/ChevronDown.svelte';
	import { hasTouchControls, TOUCH_PILL_ICON } from '$lib/components/ui/touch-controls.js';
	import { filterPillClass } from './filter-pill.js';

	/**
	 * Pill-shaped filter trigger button. `shortLabel` replaces the label below
	 * `lg` (1440px), for pills in crowded bars (the tracker's Region: "NEM").
	 * In a touch-controls subtree it takes the phone sizes below 768px.
	 * @type {{
	 *   label: string,
	 *   shortLabel?: string,
	 *   badge?: number | string | null,
	 *   active?: boolean,
	 *   open?: boolean,
	 *   compact?: boolean,
	 *   disabled?: boolean,
	 *   el?: HTMLElement | undefined,
	 *   onclick?: () => void
	 * }}
	 */
	let {
		label,
		shortLabel = undefined,
		badge = null,
		active = false,
		open = false,
		compact = false,
		disabled = false,
		el = $bindable(undefined),
		onclick
	} = $props();

	const touch = hasTouchControls();
</script>

<button
	type="button"
	bind:this={el}
	{onclick}
	{disabled}
	aria-expanded={open}
	aria-haspopup="true"
	class="touch-hit cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 {filterPillClass({
		compact,
		active,
		open,
		touch
	})}"
>
	{#if shortLabel}
		<span class="lg:hidden">{shortLabel}</span>
		<span class="hidden lg:inline">{label}</span>
	{:else}
		<span>{label}</span>
	{/if}

	{#if badge}
		<span
			class="rounded-full font-medium flex items-center justify-center text-xxs {compact
				? 'min-w-[1.5rem] h-[1.5rem]'
				: 'min-w-[1.8rem] h-[1.8rem]'} px-1 {active
				? 'bg-white text-dark-grey'
				: 'bg-dark-grey text-white'}"
		>
			{badge}
		</span>
	{/if}

	<IconChevronDown
		class="{compact ? 'size-3.5' : 'size-4'} {touch
			? TOUCH_PILL_ICON
			: ''} transition-transform duration-200 {open ? 'rotate-180' : ''}"
	/>
</button>
