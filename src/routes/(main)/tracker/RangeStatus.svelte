<script>
	import { mergeProps } from 'bits-ui';
	import LogoMarkLoader from '$lib/components/LogoMarkLoader.svelte';
	import Tooltip from '$lib/components/ui/Tooltip.svelte';

	/**
	 * RangeStatus — the top-nav readout for every tracker view: the selected
	 * range label, replaced by the hovered or keyboard-inspected period while
	 * a chart is being inspected, and by the loader while data updates. With
	 * `onrefresh` the readout is a button: hovering it says when the data last
	 * updated, and tapping it refreshes (no view fetches on its own). Without
	 * it, the readout is a plain label.
	 *
	 * It keeps its place at every width: below `lg` the Region pill shortens
	 * and below `md` the view switcher and range presets fold into dropdowns
	 * to make room. Below `md` it takes at most 40% of the bar and truncates,
	 * so a long custom range never squeezes the controls out; it never drops
	 * below the loader's width.
	 *
	 * @type {import('./types.js').TrackerRangeStatus}
	 */
	let { label, inspectLabel = undefined, loading, updatedLabel = undefined, onrefresh } = $props();
</script>

<div
	class="range-status relative flex min-w-[36px] max-w-[40%] items-center self-stretch overflow-hidden md:max-w-none md:shrink-0"
	data-loading={loading}
	data-inspecting={inspectLabel !== undefined}
	data-testid="tracker-range-status"
>
	{#if onrefresh}
		<Tooltip
			lines={[...(updatedLabel ? [`Updated ${updatedLabel}`] : []), 'Tap to refresh (R)']}
			side="bottom"
		>
			{#snippet trigger({ props })}
				<!-- Focusable while loading: hiding or disabling a focused button
				     strands keyboard focus, so taps are ignored instead. The visible
				     date leads its accessible name. -->
				<button
					{...mergeProps(props, {
						onclick: () => {
							if (!loading) onrefresh();
						}
					})}
					type="button"
					class="range-label flex h-full min-w-0 items-center cursor-pointer whitespace-nowrap rounded-md px-4 text-sm font-bold text-dark-grey transition-colors hover:bg-warm-grey focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-dark-grey"
					aria-disabled={loading}
					data-testid="tracker-range-label"
				>
					<span class="truncate">{inspectLabel ?? label}</span><span class="sr-only"
						>, refresh data</span
					>
				</button>
			{/snippet}
		</Tooltip>
	{:else}
		<span
			class="range-label flex h-full min-w-0 items-center whitespace-nowrap px-4 text-sm font-bold text-dark-grey"
			aria-hidden={loading}
			data-testid="tracker-range-label"><span class="truncate">{inspectLabel ?? label}</span></span
		>
	{/if}
	<div
		class="range-loader pointer-events-none absolute inset-0 flex items-center justify-end"
		role={loading ? 'status' : undefined}
		aria-label={loading ? 'Updating tracker' : undefined}
		aria-hidden={!loading}
		data-testid={loading ? 'tracker-loading' : undefined}
	>
		<LogoMarkLoader class="[&_svg]:size-[28px]" />
	</div>
</div>

<style>
	.range-label,
	.range-loader {
		transition:
			transform 320ms cubic-bezier(0.22, 1, 0.36, 1),
			opacity 200ms ease;
	}
	.range-loader {
		transform: translateX(100%);
		opacity: 0;
	}
	[data-loading='true'] .range-label {
		transform: translateX(100%);
		opacity: 0;
	}
	[data-loading='true'] .range-loader {
		transform: translateX(0);
		opacity: 1;
	}
	[data-loading='false'] .range-loader :global(svg) {
		animation: none;
	}
	@media (prefers-reduced-motion: reduce) {
		.range-label,
		.range-loader {
			transition: none;
		}
		.range-loader :global(svg) {
			animation: none;
		}
	}
</style>
