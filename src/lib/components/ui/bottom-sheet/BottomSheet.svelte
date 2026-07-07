<script>
	import { untrack } from 'svelte';
	import { fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	/**
	 * Mobile bottom sheet — a drag-resizable panel anchored to the bottom of its
	 * (relatively-positioned) container. There is deliberately no backdrop: the
	 * map / list behind stays visible and interactive. Drag the grip to snap
	 * between a peek and a full height, or drag down past the dismiss threshold to
	 * close (persistent sheets pass `dismissable={false}` to snap back down
	 * instead). Passing `minHeight` adds a third, minimised snap below the peek —
	 * a fixed pixel height sized to the caller's collapsed chrome. The body
	 * scrolls within the current height, so content is reachable even at the
	 * peek snap.
	 *
	 * Heights are fractions of `containerHeight` (the bounding relative parent),
	 * so the sheet sizes correctly regardless of viewport.
	 *
	 * @type {{
	 *   open: boolean,
	 *   onclose?: () => void,
	 *   containerHeight: number,
	 *   peekFraction?: number,
	 *   fullFraction?: number,
	 *   dismissFraction?: number,
	 *   dismissable?: boolean,
	 *   minHeight?: number | null,
	 *   snap?: 'min' | 'peek' | 'full',
	 *   defaultSnap?: 'min' | 'peek' | 'full',
	 *   bodyEl?: HTMLElement | null,
	 *   class?: string,
	 *   gripStyle?: string,
	 *   gripClass?: string,
	 *   header?: import('svelte').Snippet,
	 *   children?: import('svelte').Snippet,
	 *   footer?: import('svelte').Snippet
	 * }}
	 */
	let {
		open,
		onclose,
		containerHeight,
		peekFraction = 0.6,
		fullFraction = 0.94,
		dismissFraction = 0.4,
		dismissable = true,
		/** Pixel height of the minimised snap; null disables it. */
		minHeight = null,
		snap = $bindable('peek'),
		/** The snap each fresh open starts at — callers that remember the
		 *  user's last snap pass it here to restore it on reopen. */
		defaultSnap = /** @type {'min' | 'peek' | 'full'} */ ('peek'),
		/** The scrollable body element — bindable so callers can wire content
		 *  that listens to its own scroll container (e.g. the Timeline). */
		bodyEl = $bindable(null),
		class: className = '',
		/** Inline style for the drag-grip strip — lets callers set a dynamic
		 *  background (e.g. a per-facility colour) so the chrome flows into the
		 *  content below it. */
		gripStyle = '',
		/** Colour classes for the grip pill, so it stays legible when the strip is
		 *  given a non-default background via `gripStyle`. */
		gripClass = 'bg-mid-warm-grey',
		header,
		children,
		footer
	} = $props();

	let peekPx = $derived(Math.round(containerHeight * peekFraction));
	let fullPx = $derived(Math.round(containerHeight * fullFraction));
	let dismissPx = $derived(Math.round(containerHeight * dismissFraction));
	let minPx = $derived(minHeight ?? 0);

	/** Live height while dragging; null when settled (height comes from `snap`). */
	let dragHeight = $state(/** @type {number | null} */ (null));
	let isDragging = $state(false);

	// Each fresh open starts at the caller's default snap (untracked so a
	// default that follows the bound snap doesn't re-trigger the reset).
	$effect(() => {
		if (open) {
			snap = untrack(() => defaultSnap);
			dragHeight = null;
		}
	});

	let height = $derived(dragHeight ?? (snap === 'full' ? fullPx : snap === 'min' ? minPx : peekPx));

	/** @param {PointerEvent} e */
	function onGripDown(e) {
		if (!containerHeight) return;
		// The whole header is a drag surface, so leave presses on interactive
		// controls (buttons, links, inputs) to the control itself.
		if (/** @type {HTMLElement} */ (e.target).closest('button, a, input, select, textarea')) {
			return;
		}
		e.preventDefault();
		const startY = e.clientY;
		const startH = height;
		const grip = /** @type {HTMLElement} */ (e.currentTarget);
		grip.setPointerCapture(e.pointerId);
		isDragging = true;
		let moved = false;

		/** @param {PointerEvent} ev */
		function onMove(ev) {
			if (Math.abs(startY - ev.clientY) > 4) moved = true;
			const delta = startY - ev.clientY; // drag up → taller
			dragHeight = Math.max(0, Math.min(fullPx, startH + delta));
		}
		function onUp() {
			grip.removeEventListener('pointermove', onMove);
			grip.removeEventListener('pointerup', onUp);
			const settled = dragHeight ?? startH;
			isDragging = false;
			dragHeight = null;
			// A press without meaningful movement steps peek up to full and
			// anything else (min or full) back to peek.
			if (!moved) {
				snap = snap === 'peek' ? 'full' : 'peek';
				return;
			}
			// Dragged below the dismiss line → close (persistent sheets fall
			// through to the nearest-snap pick, which lands on min/peek instead).
			if (dismissable && settled < dismissPx) {
				onclose?.();
				return;
			}
			// Otherwise snap to the nearest height.
			/** @type {['min' | 'peek' | 'full', number][]} */
			const targets = [
				['peek', peekPx],
				['full', fullPx]
			];
			if (minHeight != null) targets.push(['min', minPx]);
			targets.sort((a, b) => Math.abs(settled - a[1]) - Math.abs(settled - b[1]));
			snap = targets[0][0];
		}
		grip.addEventListener('pointermove', onMove);
		grip.addEventListener('pointerup', onUp);
	}
</script>

{#if open}
	<div
		class="absolute inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_-6px_30px_rgba(0,0,0,0.14)] {className}"
		style="height: {height}px; {isDragging ? '' : 'transition: height 0.25s ease-out'}"
		transition:fly={{ y: containerHeight || 600, duration: 280, easing: quintOut }}
	>
		<!-- Drag surface: the grip strip and the whole header act as one handle,
		     so the sheet is easy to grab on touch. Presses on interactive header
		     controls are left alone (see onGripDown), and only the visual grip
		     carries the separator semantics so header content reads normally to
		     assistive tech. -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="shrink-0 cursor-grab touch-none select-none" onpointerdown={onGripDown}>
			<div
				class="flex items-center justify-center pt-2.5 pb-1.5"
				style={gripStyle}
				role="separator"
				aria-orientation="horizontal"
				aria-label="Resize panel"
				tabindex="-1"
			>
				<div class="h-1.5 w-10 rounded-full {gripClass}"></div>
			</div>

			{@render header?.()}
		</div>

		<div bind:this={bodyEl} class="flex-1 min-h-0 overflow-y-auto overscroll-contain">
			{@render children?.()}
		</div>

		{@render footer?.()}
	</div>
{/if}
