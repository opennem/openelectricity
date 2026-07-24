<script>
	/**
	 * Focus breadcrumb — the spine of the Focus prototype's navigation.
	 *
	 * Renders the focus stack as "NEM › SA1 › Torrens Island". Every ancestor
	 * is a real button that pops the stack to that level; the leaf is inert.
	 * The NEM root is always present. Region segments carry a dot in the
	 * region's brand colour; the styling is deliberately a step louder than
	 * the surrounding filter controls (it IS the region selector) without
	 * shouting.
	 */
	import { regionsWithColours, regionsWithLabels } from '$lib/regions.js';
	import { focusRegionOf } from '../focus-state.js';

	/**
	 * @type {{
	 *   focus: import('../focus-state.js').Focus,
	 *   facilityLabel?: string,
	 *   onnavigate?: (focus: import('../focus-state.js').Focus) => void
	 * }}
	 */
	let { focus, facilityLabel = '', onnavigate = undefined } = $props();

	let region = $derived(focusRegionOf(focus));
	let regionColour = $derived(region ? regionsWithColours[region.toLowerCase()] : undefined);
	let regionTitle = $derived(region ? regionsWithLabels[region.toLowerCase()] : undefined);
</script>

<nav
	aria-label="Focus"
	class="flex min-w-0 shrink-0 items-center gap-1.5 rounded-full border border-warm-grey bg-light-warm-grey/60 px-3 py-1.5"
>
	{#if focus.level === 'nem'}
		<span class="text-sm font-semibold text-dark-grey" aria-current="location">NEM</span>
	{:else}
		<button
			type="button"
			class="cursor-pointer text-sm font-medium text-mid-grey transition-colors hover:text-dark-grey hover:underline"
			onclick={() => onnavigate?.({ level: 'nem' })}
		>
			NEM
		</button>

		<span class="text-mid-warm-grey select-none" aria-hidden="true">›</span>

		{#if focus.level === 'region'}
			<span class="flex items-center gap-1.5" aria-current="location">
				{#if regionColour}
					<span class="size-2 shrink-0 rounded-full" style:background-color={regionColour}></span>
				{/if}
				<span class="text-sm font-semibold text-dark-grey" title={regionTitle}>{region}</span>
			</span>
		{:else}
			<button
				type="button"
				class="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-mid-grey transition-colors hover:text-dark-grey hover:underline"
				title={regionTitle}
				onclick={() => region && onnavigate?.({ level: 'region', region })}
			>
				{#if regionColour}
					<span class="size-2 shrink-0 rounded-full" style:background-color={regionColour}></span>
				{/if}
				{region}
			</button>

			<span class="text-mid-warm-grey select-none" aria-hidden="true">›</span>

			<span
				class="max-w-48 truncate text-sm font-semibold text-dark-grey"
				aria-current="location"
				title={facilityLabel || focus.code}
			>
				{facilityLabel || focus.code}
			</span>
		{/if}
	{/if}
</nav>
