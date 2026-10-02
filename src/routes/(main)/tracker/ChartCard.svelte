<script>
	import { untrack } from 'svelte';
	import { createDockedPanel } from '$lib/components/ui/panel/docked-panel.svelte.js';
	import DragHandle from '$lib/components/ui/panel/drag-handle.svelte';
	import Maximize2 from '@lucide/svelte/icons/maximize-2';
	import LoadingOverlay from './LoadingOverlay.svelte';

	/**
	 * ChartCard — shared card shell for the tracker's chart stack: header row
	 * (title, optional badge, optional actions such as a split SwitchTabs) over
	 * the chart body, with the engaged pan/zoom border treatment. `mini`
	 * styles it like the scenarios' mini charts — an h6 title on the left over
	 * a body with no side padding (its chart pads itself, so a readout band
	 * can run flush to the edges) — for small multiples such as the heatmap
	 * cards. `onexpand`
	 * adds an Enlarge button to the header (the radial cards' lightbox).
	 * `highlighted` darkens the border like the engaged treatment: the hovered
	 * card whose row or column the table is highlighting. `onhover` reports the
	 * pointer entering (true) and leaving (false) the card.
	 *
	 * Owns the drag-to-resize height so the five-dot handle sits OUTSIDE the
	 * card container, between cards. The height is passed to `children` as a
	 * snippet parameter and persists to localStorage under `heightStorageKey`
	 * (share one key across a split pair so toggling keeps the chosen height).
	 *
	 * @type {{
	 *   title: string,
	 *   mini?: boolean,
	 *   badge?: string,
	 *   png?: {id: string, label: string, ready: boolean, caption?: string},
	 *   engaged?: boolean,
	 *   highlighted?: boolean,
	 *   loading?: boolean,
	 *   heightStorageKey?: string,
	 *   defaultHeightPx?: number,
	 *   minHeightPx?: number,
	 *   maxHeightPx?: number,
	 *   actions?: import('svelte').Snippet,
	 *   onexpand?: () => void,
	 *   onhover?: (hovered: boolean) => void,
	 *   status?: import('svelte').Snippet,
	 *   children: import('svelte').Snippet<[number]>
	 * }}
	 */
	let {
		title,
		mini = false,
		badge = '',
		png,
		engaged = false,
		highlighted = false,
		loading = false,
		heightStorageKey = '',
		defaultHeightPx = 260,
		minHeightPx = 120,
		maxHeightPx = 800,
		actions,
		onexpand,
		onhover,
		status,
		children
	} = $props();

	const height = createDockedPanel({
		axis: 'y',
		initial: untrack(() => defaultHeightPx),
		min: () => minHeightPx,
		max: () => maxHeightPx,
		storageKey: untrack(() => heightStorageKey) || undefined
	});
	let heightPx = $derived(height.size);
</script>

{#snippet headerActions()}
	{#if badge || actions || onexpand}
		<div class="flex shrink-0 items-center gap-3">
			{#if badge}
				<span class="rounded bg-light-warm-grey px-2 py-1 font-mono text-xxs text-mid-grey">
					{badge}
				</span>
			{/if}
			{#if actions}{@render actions()}{/if}
			{#if onexpand}
				<button
					type="button"
					class="inline-flex size-[28px] items-center justify-center rounded-md text-mid-grey/70 transition-colors hover:bg-light-warm-grey hover:text-dark-grey"
					aria-label="Enlarge {title}"
					title="Enlarge"
					onclick={onexpand}
				>
					<Maximize2 class="size-[15px]" aria-hidden="true" />
				</button>
			{/if}
		</div>
	{/if}
{/snippet}

<div
	role="presentation"
	onpointerenter={onhover && (() => onhover(true))}
	onpointerleave={onhover && (() => onhover(false))}
>
	<!-- Subtle border at rest, dark when pan/zoom is engaged; the chart and its
	     options bar sit flush against the container edges. overflow-hidden at
	     every width — the flush chart would otherwise paint over the bottom
	     corner radius. Floating tooltips stay within the chart area. A mini
	     card pads its header and body instead, like the scenarios' mini
	     charts. -->
	<section
		data-tracker-png={png ? JSON.stringify(png) : undefined}
		class="overflow-hidden rounded-lg border bg-white transition-colors {highlighted ||
		(engaged && !mini)
			? 'border-dark-grey'
			: mini
				? 'border-warm-grey'
				: 'border-mid-warm-grey/40'}"
	>
		{#if mini}
			<header
				class="flex min-h-[52px] items-center justify-between gap-4 border-b border-warm-grey px-6 py-2"
			>
				<h6 class="mb-0 truncate text-dark-grey">{title}</h6>
				{@render headerActions()}
			</header>
		{:else}
			<header
				class="flex min-h-[52px] flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-mid-warm-grey/40 px-4 py-2"
			>
				<h3 class="m-0 text-sm font-semibold text-dark-grey">{title}</h3>
				{@render headerActions()}
				{#if status}{@render status()}{/if}
			</header>
		{/if}
		<!-- Bottom breathing room so the date labels stay clear of the border. -->
		<div class="relative {mini ? 'pb-6' : 'pb-3'}" aria-busy={loading}>
			{@render children(heightPx)}
			<LoadingOverlay active={loading} />
		</div>
	</section>

	{#if heightStorageKey}
		<!-- Fills the entire gap to the next card (the column has no space-y),
		     so the whole gap is the drag target; rounded like the cards. -->
		<DragHandle
			axis="y"
			onstart={height.start}
			onkeydown={height.keydown}
			tabindex={0}
			aria-valuemin={minHeightPx}
			aria-valuemax={maxHeightPx}
			aria-valuenow={Math.round(heightPx)}
			active={height.dragging}
			alwaysShowGrip
			class="h-4 rounded-md"
			role="separator"
			aria-orientation="horizontal"
			aria-label="Resize chart height"
		/>
	{:else}
		<!-- Same rhythm as the handle gap for cards whose height is their content. -->
		<div class="h-4" aria-hidden="true"></div>
	{/if}
</div>
