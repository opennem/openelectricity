<script>
	import { onMount, untrack } from 'svelte';
	import { createResizeControl } from '$lib/components/ui/panel/resize-control.svelte.js';
	import DragHandle from '$lib/components/ui/panel/drag-handle.svelte';

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
	 *   engaged?: boolean,
	 *   heightStorageKey?: string,
	 *   defaultHeightPx?: number,
	 *   minHeightPx?: number,
	 *   maxHeightPx?: number,
	 *   actions?: import('svelte').Snippet,
	 *   children: import('svelte').Snippet<[number]>
	 * }}
	 */
	let {
		title,
		badge = '',
		engaged = false,
		heightStorageKey = '',
		defaultHeightPx = 260,
		minHeightPx = 120,
		maxHeightPx = 800,
		actions,
		children
	} = $props();

	/** @param {number} value */
	function clampHeight(value) {
		return Math.min(maxHeightPx, Math.max(minHeightPx, value));
	}

	let heightPx = $state(untrack(() => clampHeight(defaultHeightPx)));
	onMount(() => {
		try {
			const saved = parseInt(localStorage.getItem(heightStorageKey) ?? '', 10);
			if (heightStorageKey && Number.isFinite(saved)) heightPx = clampHeight(saved);
		} catch {
			/* Storage can be unavailable in embedded/private contexts. */
		}
	});
	const resize = createResizeControl({
		axis: 'y',
		get: () => heightPx,
		set: (value) => {
			heightPx = value;
		},
		min: () => minHeightPx,
		max: () => maxHeightPx,
		commit: () => {
			try {
				if (heightStorageKey) localStorage.setItem(heightStorageKey, String(heightPx));
			} catch {
				/* The current height remains usable without persistence. */
			}
		}
	});
</script>

<div>
	<!-- Subtle border at rest, dark when pan/zoom is engaged; the chart and its
	     options bar sit flush against the container edges. overflow-hidden at
	     every width — the flush chart would otherwise paint over the bottom
	     corner radius. Floating tooltips stay within the chart area. -->
	<section
		class="overflow-hidden rounded-lg border bg-white transition-colors {engaged
			? 'border-dark-grey'
			: 'border-mid-warm-grey/40'}"
	>
		<header
			class="flex min-h-[52px] items-center justify-between gap-4 border-b border-mid-warm-grey/40 px-4 py-2"
		>
			<h3 class="m-0 font-space text-sm font-semibold text-dark-grey">{title}</h3>
			<div class="flex items-center gap-3">
				{#if badge}
					<span class="rounded bg-light-warm-grey px-2 py-1 font-mono text-xxs text-mid-grey">
						{badge}
					</span>
				{/if}
				{#if actions}{@render actions()}{/if}
			</div>
		</header>
		<!-- Bottom breathing room so the date labels stay clear of the border. -->
		<div class="pb-3">
			{@render children(heightPx)}
		</div>
	</section>

	{#if heightStorageKey}
		<!-- Fills the entire gap to the next card (the column has no space-y),
		     so the whole gap is the drag target; rounded like the cards. -->
		<DragHandle
			axis="y"
			onstart={resize.start}
			onkeydown={resize.keydown}
			tabindex={0}
			aria-valuemin={minHeightPx}
			aria-valuemax={maxHeightPx}
			aria-valuenow={Math.round(heightPx)}
			active={resize.dragging}
			alwaysShowGrip
			class="h-4 rounded-md"
			role="separator"
			aria-orientation="horizontal"
			aria-label="Resize chart height"
		/>
	{/if}
</div>
