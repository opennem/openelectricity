<script>
	import { untrack } from 'svelte';
	import { createDockedPanel } from '$lib/components/ui/panel/docked-panel.svelte.js';
	import DragHandle from '$lib/components/ui/panel/drag-handle.svelte';
	import LoadingOverlay from './LoadingOverlay.svelte';

	/**
	 * ChartCard — shared card shell for the tracker's chart stack: header row
	 * (title, optional badge, optional actions such as a split SwitchTabs) over
	 * the chart body, with the engaged pan/zoom border treatment.
	 *
	 * Owns the drag-to-resize height so the five-dot handle sits OUTSIDE the
	 * card container, between cards. The height is passed to `children` as a
	 * snippet parameter and persists to localStorage under `heightStorageKey`
	 * (share one key across a split pair so toggling keeps the chosen height).
	 *
	 * @type {{
	 *   title: string,
	 *   badge?: string,
	 *   png?: {id: string, label: string, ready: boolean, caption?: string},
	 *   engaged?: boolean,
	 *   loading?: boolean,
	 *   heightStorageKey?: string,
	 *   defaultHeightPx?: number,
	 *   minHeightPx?: number,
	 *   maxHeightPx?: number,
	 *   actions?: import('svelte').Snippet,
	 *   status?: import('svelte').Snippet,
	 *   children: import('svelte').Snippet<[number]>
	 * }}
	 */
	let {
		title,
		badge = '',
		png,
		engaged = false,
		loading = false,
		heightStorageKey = '',
		defaultHeightPx = 260,
		minHeightPx = 120,
		maxHeightPx = 800,
		actions,
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

<div>
	<!-- Subtle border at rest, dark when pan/zoom is engaged; the chart and its
	     options bar sit flush against the container edges. overflow-hidden at
	     every width — the flush chart would otherwise paint over the bottom
	     corner radius. Floating tooltips stay within the chart area. -->
	<section
		data-tracker-png={png ? JSON.stringify(png) : undefined}
		class="overflow-hidden rounded-lg border bg-white transition-colors {engaged
			? 'border-dark-grey'
			: 'border-mid-warm-grey/40'}"
	>
		<header
			class="flex min-h-[52px] flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-mid-warm-grey/40 px-4 py-2"
		>
			<h3 class="m-0 text-sm font-semibold text-dark-grey">{title}</h3>
			<div class="flex shrink-0 items-center gap-3">
				{#if badge}
					<span class="rounded bg-light-warm-grey px-2 py-1 font-mono text-xxs text-mid-grey">
						{badge}
					</span>
				{/if}
				{#if actions}{@render actions()}{/if}
			</div>
			{#if status}{@render status()}{/if}
		</header>
		<!-- Bottom breathing room so the date labels stay clear of the border. -->
		<div class="relative pb-3" aria-busy={loading}>
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
	{/if}
</div>
