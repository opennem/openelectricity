<script>
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

	function initialHeight() {
		if (heightStorageKey && typeof localStorage !== 'undefined') {
			const saved = parseInt(localStorage.getItem(heightStorageKey) ?? '', 10);
			if (Number.isFinite(saved)) return clampHeight(saved);
		}
		return defaultHeightPx;
	}

	let heightPx = $state(initialHeight());
	let isDragging = $state(false);

	/** @param {PointerEvent} e */
	function startDrag(e) {
		e.preventDefault();
		isDragging = true;
		const startY = e.clientY;
		const startHeight = heightPx;

		/** @param {PointerEvent} moveEvent */
		function onMove(moveEvent) {
			heightPx = clampHeight(startHeight + (moveEvent.clientY - startY));
		}

		function onUp() {
			isDragging = false;
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
			window.removeEventListener('pointercancel', onUp);
			if (heightStorageKey && typeof localStorage !== 'undefined') {
				try {
					localStorage.setItem(heightStorageKey, String(heightPx));
				} catch {
					// ignore quota/availability errors
				}
			}
		}

		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
		window.addEventListener('pointercancel', onUp);
	}
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
			onstart={startDrag}
			active={isDragging}
			class="h-4 rounded-md"
			role="separator"
			aria-orientation="horizontal"
			aria-label="Resize chart height"
		/>
	{/if}
</div>
