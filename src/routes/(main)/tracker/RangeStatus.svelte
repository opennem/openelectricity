<script>
	import { mergeProps } from 'bits-ui';
	import Settings2 from '@lucide/svelte/icons/settings-2';
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
	 *   - `sticky` (phones) sits at the top of the page body and stays in view
	 *     as the top nav scrolls away: a centred white pill as wide as its
	 *     text, the filters icon leading the range over a smaller `detail`
	 *     line of the other filters ("NEM · 30 min"). With `onfilters` it is
	 *     the button that opens the phone filter sheet. Once stuck to the top
	 *     (`stuck`) it lifts out over the charts with a soft shadow. Only the
	 *     pill takes taps. An inspected period only changes its text. Its test
	 *     ids carry a `-sticky` suffix so they don't collide with the bar's.
	 *
	 * @type {import('./types.js').TrackerRangeStatus & {
	 *   variant?: 'bar' | 'sticky',
	 *   stuck?: boolean,
	 *   detail?: string,
	 *   onfilters?: () => void
	 * }}
	 */
	let {
		label,
		inspectLabel = undefined,
		loading,
		updatedLabel = undefined,
		onrefresh,
		variant = 'bar',
		stuck = false,
		detail = '',
		onfilters
	} = $props();

	const sticky = variant === 'sticky';
	/** @param {string} name */
	const testId = (name) => (sticky ? `${name}-sticky` : name);

	function refresh() {
		if (!loading) onrefresh?.();
	}

	/** The sticky pill's natural width (its border included), measured from an
	 * unconstrained copy of its content: CSS can't animate `width: auto`, so
	 * the pill takes this width and eases between widths as the text changes
	 * (an inspected date replacing the range, say). */
	let pillWidth = $state(0);
</script>

{#snippet text()}
	<span class="truncate">{inspectLabel ?? label}</span>
{/snippet}

{#snippet loader(/** @type {string} */ align)}
	<div
		class="range-loader pointer-events-none absolute inset-0 flex items-center {align}"
		role={loading ? 'status' : undefined}
		aria-label={loading ? 'Updating tracker' : undefined}
		aria-hidden={!loading}
		data-testid={loading ? testId('tracker-loading') : undefined}
	>
		<LogoMarkLoader class="[&_svg]:size-[28px]" />
	</div>
{/snippet}

{#if sticky}
	<div
		class="range-status pointer-events-none flex h-full w-full items-center justify-center px-4"
		data-loading={loading}
		data-inspecting={inspectLabel !== undefined}
		data-stuck={stuck}
		data-variant="sticky"
		data-testid={testId('tracker-range-status')}
	>
		<div
			class="pointer-events-auto relative flex h-[52px] max-w-full items-center overflow-hidden rounded-full border border-warm-grey bg-white text-dark-grey transition-[width,box-shadow] duration-200 ease-out motion-reduce:transition-none {stuck
				? 'shadow-[0_8px_20px_-10px_rgba(53,53,53,0.45)]'
				: ''}"
			style:width={pillWidth ? `${pillWidth + 2}px` : undefined}
		>
			{#if onfilters}
				<!-- The width source: the content laid out unconstrained, unseen. -->
				<span
					class="invisible absolute left-0 top-0 flex w-max items-center gap-3 whitespace-nowrap pl-5 pr-7 tabular-nums"
					aria-hidden="true"
					bind:clientWidth={pillWidth}
				>
					<span class="size-[18px] shrink-0"></span>
					<span class="flex flex-col">
						<span class="text-sm leading-[18px] font-semibold">{inspectLabel ?? label}</span>
						{#if detail}<span class="text-xs leading-[15px]">{detail}</span>{/if}
					</span>
				</span>
				<button
					type="button"
					onclick={onfilters}
					aria-haspopup="dialog"
					class="range-label flex h-full w-full min-w-0 cursor-pointer items-center gap-3 whitespace-nowrap pl-5 pr-7 text-left tabular-nums focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-dark-grey"
					data-testid={testId('tracker-range-label')}
				>
					<Settings2
						class="size-[18px] shrink-0 text-mid-grey"
						strokeWidth={1.75}
						aria-hidden="true"
					/>
					<!-- Laid out in full, never truncated: while the pill eases wider the
					     pill's edge reveals the text. -->
					<span class="flex shrink-0 flex-col">
						<span class="text-sm leading-[18px] font-semibold">{inspectLabel ?? label}</span>
						{#if detail}
							<span class="text-xs leading-[15px] text-mid-grey"
								><span class="sr-only">, </span>{detail}</span
							>
						{/if}
					</span>
					<span class="sr-only">, change filters</span>
				</button>
			{:else}
				<span
					class="range-label flex h-full w-full min-w-0 items-center justify-center whitespace-nowrap px-5 text-sm font-semibold tabular-nums"
					aria-hidden={loading}
					data-testid={testId('tracker-range-label')}>{@render text()}</span
				>
			{/if}
			{@render loader('justify-center')}
		</div>
	</div>
{:else}
	<div
		class="range-status relative flex min-w-[36px] max-w-[40%] items-center self-stretch overflow-hidden md:max-w-none md:shrink-0"
		data-loading={loading}
		data-inspecting={inspectLabel !== undefined}
		data-testid={testId('tracker-range-status')}
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
		{@render loader('justify-end')}
	</div>
{/if}

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
	/* The phone chip swaps vertically: the loader drops in from the top as
	   the range drops out of the bottom. */
	[data-variant='sticky'] .range-loader {
		transform: translateY(-100%);
	}
	[data-variant='sticky'][data-loading='true'] .range-label {
		transform: translateY(100%);
	}
	[data-variant='sticky'][data-loading='true'] .range-loader {
		transform: translateY(0);
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
