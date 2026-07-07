<script>
	import { untrack } from 'svelte';
	import { X } from '@lucide/svelte';

	/**
	 * @typedef {import('svelte').Snippet} Snippet
	 */

	let {
		open = false,
		onclose,
		title = '',
		direction = 'top',
		defaultSize = 50,
		minSize = 250,
		snapThreshold = 85,
		/** When > 0, dragging the panel smaller than this many px lets it shrink
		 *  past `minSize`, and releasing below the threshold dismisses it (calls
		 *  `onclose`). Releasing between the threshold and `minSize` snaps back up
		 *  to `minSize`. 0 (default) keeps the panel clamped at `minSize`. */
		dismissThreshold = 0,
		containerSize = 0,
		/** Extra distance (any CSS length) added to the closed-state translate, so a
		 *  panel inset from the edge (e.g. `bottom-8`) still slides fully out of
		 *  view instead of leaving a peeking strip. */
		closedOffset = '0px',
		class: className = '',
		/** Inline style for the drag-handle wrapper — lets callers set a dynamic
		 *  background (e.g. a per-facility colour) the class system can't express. */
		dragHandleStyle = '',
		/** Colour classes for the grip pill, so it can stay legible when the strip
		 *  is given a non-default background via `dragHandleStyle`. */
		gripClass = 'bg-mid-warm-grey group-hover:bg-mid-grey',
		header = undefined,
		footer = undefined,
		children
	} = $props();

	// Start at the caller's default so a panel that mounts already-open (e.g. a
	// deep-linked / back-navigated `?facility=` selection) paints at full size from
	// the first frame — otherwise it flashes a smaller height (and the view
	// transition captures the wrong size) before the open effect grows it. Only the
	// initial value matters here; the effect below re-syncs on later changes.
	let currentSize = $state(untrack(() => defaultSize));
	let isResizing = $state(false);

	let isVertical = $derived(direction === 'top' || direction === 'bottom');

	// Reset size when open becomes true or defaultSize changes
	$effect(() => {
		// Track these dependencies
		const isOpen = open;
		const size = defaultSize;

		untrack(() => {
			if (isOpen) {
				currentSize = size;
			}
		});
	});

	// Distance to slide the panel fully off-screen when closed = its own size
	// (100%) plus any gap the caller insets it from the edge (e.g. a `bottom-8`
	// floating margin), so no strip peeks back into view.
	let closedDistance = $derived(`calc(100% + ${closedOffset})`);

	/** @type {string} */
	let closedTransform = $derived.by(() => {
		switch (direction) {
			case 'top':
				return `translateY(${closedDistance})`;
			case 'bottom':
				return `translateY(calc(-1 * ${closedDistance}))`;
			case 'left':
				return `translateX(${closedDistance})`;
			case 'right':
				return `translateX(calc(-1 * ${closedDistance}))`;
			default:
				return `translateY(${closedDistance})`;
		}
	});

	let sizeStyle = $derived.by(() => {
		const prop = isVertical ? 'height' : 'width';
		// No transition while dragging (follow the pointer); otherwise ease both the
		// size (programmatic resize) and the transform (the open/close slide). This
		// inline `transition` is why it must include transform — it overrides any
		// `transition-*` utility class on the element.
		const transition = isResizing
			? ''
			: `; transition: ${prop} 0.15s ease-out, transform 0.25s ease-out`;
		return `${prop}: ${currentSize}%${transition}`;
	});

	let transformStyle = $derived(
		open ? 'transform: translate(0, 0)' : `transform: ${closedTransform}`
	);

	let combinedStyle = $derived(`${sizeStyle}; ${transformStyle}`);

	/** Start panel resize drag
	 * @param {PointerEvent} e
	 */
	function onResizePointerDown(e) {
		if (!containerSize) return;

		const startPos = isVertical ? e.clientY : e.clientX;
		const startSize = currentSize;
		isResizing = true;

		/** @type {HTMLElement} */
		const target = /** @type {HTMLElement} */ (e.currentTarget);
		target.setPointerCapture(e.pointerId);

		/** @param {PointerEvent} ev */
		function onPointerMove(ev) {
			const currentPos = isVertical ? ev.clientY : ev.clientX;
			let delta;

			// For top/left: moving toward the edge increases size
			// For bottom/right: moving away from the edge increases size
			if (direction === 'top' || direction === 'left') {
				delta = startPos - currentPos;
			} else {
				delta = currentPos - startPos;
			}

			const deltaPct = (delta / containerSize) * 100;
			const minPct = (minSize / containerSize) * 100;
			// When dismissible, allow shrinking past minSize (down to 0) so the drag
			// can reach the dismiss threshold; otherwise clamp at minSize.
			const lowerPct = dismissThreshold > 0 ? 0 : minPct;
			let newPct = Math.min(100, Math.max(lowerPct, startSize + deltaPct));

			if (newPct >= snapThreshold) {
				newPct = 100;
			}

			currentSize = newPct;
		}

		function onPointerUp() {
			isResizing = false;
			target.removeEventListener('pointermove', onPointerMove);
			target.removeEventListener('pointerup', onPointerUp);

			if (dismissThreshold > 0 && containerSize) {
				const currentPx = (currentSize / 100) * containerSize;
				if (currentPx < dismissThreshold) {
					// Dragged below the dismiss line — close.
					onclose?.();
				} else if (currentPx < minSize) {
					// Released between the dismiss line and minSize — snap back up.
					currentSize = (minSize / containerSize) * 100;
				}
			}
		}

		target.addEventListener('pointermove', onPointerMove);
		target.addEventListener('pointerup', onPointerUp);
	}
</script>

{#snippet dragHandle()}
	{#if isVertical}
		<div
			class="shrink-0 flex items-center justify-center cursor-ns-resize select-none touch-none py-1.5 group"
			style={dragHandleStyle}
			onpointerdown={onResizePointerDown}
			role="separator"
			aria-orientation="horizontal"
			aria-label="Resize panel"
			tabindex="-1"
		>
			<div class="w-8 h-1 rounded-full transition-colors {gripClass}"></div>
		</div>
	{:else}
		<div
			class="shrink-0 flex items-center justify-center cursor-ew-resize select-none touch-none px-1.5 group"
			style={dragHandleStyle}
			onpointerdown={onResizePointerDown}
			role="separator"
			aria-orientation="vertical"
			aria-label="Resize panel"
			tabindex="-1"
		>
			<div class="h-8 w-1 rounded-full transition-colors {gripClass}"></div>
		</div>
	{/if}
{/snippet}

{#snippet defaultHeader()}
	<header class="flex items-center justify-between px-6 pb-4 border-b border-warm-grey shrink-0">
		<h2 class="text-lg font-medium text-dark-grey m-0 truncate pr-4">{title}</h2>
		<button
			onclick={onclose}
			class="p-2 rounded-lg hover:bg-warm-grey transition-colors text-mid-grey hover:text-dark-grey cursor-pointer"
			aria-label="Close panel"
		>
			<X size={20} />
		</button>
	</header>
{/snippet}

{#if isVertical}
	<div class="flex-col overflow-hidden {className}" style={combinedStyle}>
		{#if direction === 'top'}
			{@render dragHandle()}
		{/if}

		{#if header}
			{@render header()}
		{:else}
			{@render defaultHeader()}
		{/if}

		<div class="flex-1 overflow-y-auto min-h-0">
			{#if children}
				{@render children()}
			{/if}
		</div>

		{#if footer}
			{@render footer()}
		{/if}

		{#if direction === 'bottom'}
			{@render dragHandle()}
		{/if}
	</div>
{:else}
	<div class="flex-row overflow-hidden {className}" style={combinedStyle}>
		{#if direction === 'left'}
			{@render dragHandle()}
		{/if}

		<div class="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden">
			{#if header}
				{@render header()}
			{:else}
				{@render defaultHeader()}
			{/if}

			<div class="flex-1 overflow-y-auto min-h-0">
				{#if children}
					{@render children()}
				{/if}
			</div>

			{#if footer}
				{@render footer()}
			{/if}
		</div>

		{#if direction === 'right'}
			{@render dragHandle()}
		{/if}
	</div>
{/if}
