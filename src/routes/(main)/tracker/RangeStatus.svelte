<script>
	import { mergeProps } from 'bits-ui';
	import RotateCw from '@lucide/svelte/icons/rotate-cw';
	import LogoMarkLoader from '$lib/components/LogoMarkLoader.svelte';
	import Tooltip from '$lib/components/ui/Tooltip.svelte';

	/**
	 * RangeStatus — every tracker view's range readout: the selected range
	 * label, replaced by the hovered or keyboard-inspected period while a
	 * chart is being inspected, and by the loader while data updates. With
	 * `onrefresh` the readout is a button that refreshes (no view fetches on
	 * its own). Without it, the readout is a plain label.
	 *
	 * Two placements (the shell renders both and CSS shows one):
	 *
	 *   - `bar` (768px up) sits in the top nav. Hovering it says when the data
	 *     last updated. Below `lg` the Region pill shortens and below `md`
	 *     the view switcher and range presets fold into dropdowns to make room;
	 *     below `md` it takes at most 40% of the bar and truncates, so a long
	 *     custom range never squeezes the controls out, and it never drops
	 *     below the loader's width.
	 *   - `sticky` (phones) is a full-width strip at the top of the page body
	 *     that stays in view as the top nav scrolls away. Phones can't hover,
	 *     so the update time shows under the label, with a refresh icon. Its
	 *     test ids carry a `-sticky` suffix so they don't collide with the
	 *     bar's.
	 *
	 * @type {import('./types.js').TrackerRangeStatus & { variant?: 'bar' | 'sticky' }}
	 */
	let {
		label,
		inspectLabel = undefined,
		loading,
		updatedLabel = undefined,
		onrefresh,
		variant = 'bar'
	} = $props();

	const sticky = variant === 'sticky';
	/** @param {string} name */
	const testId = (name) => (sticky ? `${name}-sticky` : name);

	function refresh() {
		if (!loading) onrefresh?.();
	}
</script>

{#snippet text()}
	<span class="truncate">{inspectLabel ?? label}</span>
{/snippet}

<div
	class="range-status relative flex items-center overflow-hidden {sticky
		? 'h-full w-full'
		: 'min-w-[36px] max-w-[40%] self-stretch md:max-w-none md:shrink-0'}"
	data-loading={loading}
	data-inspecting={inspectLabel !== undefined}
	data-testid={testId('tracker-range-status')}
>
	{#if onrefresh && sticky}
		<button
			type="button"
			onclick={refresh}
			class="range-label flex h-full w-full min-w-0 cursor-pointer items-center gap-3 px-4 text-left text-dark-grey focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-dark-grey"
			aria-disabled={loading}
			data-testid={testId('tracker-range-label')}
		>
			<span class="flex min-w-0 flex-1 flex-col gap-0.5">
				<span class="truncate text-sm leading-[1.2] font-bold">{inspectLabel ?? label}</span>
				<span class="sr-only">, refresh data</span>
				<!-- While inspecting, the period stands on its own. -->
				{#if updatedLabel && inspectLabel === undefined}
					<span class="truncate text-xs leading-[1.2] text-mid-grey" aria-hidden="true"
						>Updated {updatedLabel}</span
					>
				{/if}
			</span>
			<RotateCw class="size-4 shrink-0 text-mid-grey" aria-hidden="true" />
		</button>
	{:else if onrefresh}
		<Tooltip
			lines={[...(updatedLabel ? [`Updated ${updatedLabel}`] : []), 'Tap to refresh (R)']}
			side="bottom"
		>
			{#snippet trigger({ props })}
				<!-- Focusable while loading: hiding or disabling a focused button
				     strands keyboard focus, so taps are ignored instead. The visible
				     date leads its accessible name. -->
				<button
					{...mergeProps(props, { onclick: refresh })}
					type="button"
					class="range-label flex h-full min-w-0 items-center cursor-pointer whitespace-nowrap rounded-md px-4 text-sm font-bold text-dark-grey transition-colors hover:bg-warm-grey focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-dark-grey"
					aria-disabled={loading}
					data-testid={testId('tracker-range-label')}
				>
					{@render text()}<span class="sr-only">, refresh data</span>
				</button>
			{/snippet}
		</Tooltip>
	{:else}
		<span
			class="range-label flex h-full min-w-0 items-center whitespace-nowrap px-4 text-sm font-bold text-dark-grey"
			aria-hidden={loading}
			data-testid={testId('tracker-range-label')}>{@render text()}</span
		>
	{/if}
	<div
		class="range-loader pointer-events-none absolute inset-0 flex items-center justify-end {sticky
			? 'pr-4'
			: ''}"
		role={loading ? 'status' : undefined}
		aria-label={loading ? 'Updating tracker' : undefined}
		aria-hidden={!loading}
		data-testid={loading ? testId('tracker-loading') : undefined}
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
