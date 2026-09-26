<script>
	import { mergeProps } from 'bits-ui';
	import LogoMarkLoader from '$lib/components/LogoMarkLoader.svelte';
	import Tooltip from '$lib/components/ui/Tooltip.svelte';

	/**
	 * RangeStatus — the top-nav readout for the timeline view: the selected
	 * range label, replaced by the hovered or keyboard-inspected period while
	 * a chart is being inspected, and by the loader while data updates. The
	 * readout is a button: hovering it says when the data last updated, and
	 * tapping it refreshes (the timeline fetches nothing on its own).
	 *
	 * @type {{ label: string, inspectLabel?: string, loading: boolean,
	 *   updatedLabel?: string, onrefresh: () => void }}
	 */
	let { label, inspectLabel = undefined, loading, updatedLabel = undefined, onrefresh } = $props();
</script>

<div
	class="range-status relative flex w-0 shrink-0 items-center self-stretch overflow-hidden lg:w-auto lg:min-w-[36px]"
	data-loading={loading}
	data-inspecting={inspectLabel !== undefined}
	data-testid="tracker-range-status"
>
	<Tooltip
		lines={[...(updatedLabel ? [`Updated ${updatedLabel}`] : []), 'Tap to refresh (R)']}
		side="bottom"
	>
		{#snippet trigger({ props })}
			<button
				{...mergeProps(props, { onclick: onrefresh })}
				type="button"
				class="range-label hidden h-full items-center cursor-pointer whitespace-nowrap rounded-md px-4 text-sm font-bold text-dark-grey transition-colors hover:bg-warm-grey focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-dark-grey lg:flex"
				disabled={loading}
				aria-hidden={loading}
				aria-label="Refresh data"
				data-testid="tracker-range-label"
			>
				{inspectLabel ?? label}
			</button>
		{/snippet}
	</Tooltip>
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
	@media (max-width: 1439px) {
		.range-status {
			transition: width 240ms ease;
		}
		.range-status[data-loading='true'] {
			width: 36px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.range-status,
		.range-label,
		.range-loader {
			transition: none;
		}
		.range-loader :global(svg) {
			animation: none;
		}
	}
</style>
