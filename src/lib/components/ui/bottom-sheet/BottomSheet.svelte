<script>
	import { fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	/**
	 * Mobile bottom sheet — a drag-resizable panel anchored to the bottom of its
	 * (relatively-positioned) container. There is deliberately no backdrop: the
	 * map / list behind stays visible and interactive. Drag the grip to snap
	 * between a peek and a full height, or drag down past the dismiss threshold to
	 * close. The body scrolls within the current height, so content is reachable
	 * even at the peek snap.
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

	let snap = $state(/** @type {'peek' | 'full'} */ ('peek'));
	/** Live height while dragging; null when settled (height comes from `snap`). */
	let dragHeight = $state(/** @type {number | null} */ (null));
	let isDragging = $state(false);

	// Each fresh open starts at the peek snap.
	$effect(() => {
		if (open) {
			snap = 'peek';
			dragHeight = null;
		}
	});

	let height = $derived(dragHeight ?? (snap === 'full' ? fullPx : peekPx));

	/** @param {PointerEvent} e */
	function onGripDown(e) {
		if (!containerHeight) return;
		e.preventDefault();
		const startY = e.clientY;
		const startH = height;
		const grip = /** @type {HTMLElement} */ (e.currentTarget);
		grip.setPointerCapture(e.pointerId);
		isDragging = true;

		/** @param {PointerEvent} ev */
		function onMove(ev) {
			const delta = startY - ev.clientY; // drag up → taller
			dragHeight = Math.max(0, Math.min(fullPx, startH + delta));
		}
		function onUp() {
			grip.removeEventListener('pointermove', onMove);
			grip.removeEventListener('pointerup', onUp);
			const settled = dragHeight ?? startH;
			isDragging = false;
			dragHeight = null;
			// Dragged below the dismiss line → close.
			if (settled < dismissPx) {
				onclose?.();
				return;
			}
			// Otherwise snap to the nearer of peek / full.
			snap = Math.abs(settled - fullPx) <= Math.abs(settled - peekPx) ? 'full' : 'peek';
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
		<!-- Drag grip -->
		<div
			class="shrink-0 flex items-center justify-center pt-2.5 pb-1.5 cursor-grab touch-none select-none"
			style={gripStyle}
			onpointerdown={onGripDown}
			role="separator"
			aria-orientation="horizontal"
			aria-label="Resize panel"
			tabindex="-1"
		>
			<div class="h-1.5 w-10 rounded-full {gripClass}"></div>
		</div>

		{@render header?.()}

		<div class="flex-1 min-h-0 overflow-y-auto overscroll-contain">
			{@render children?.()}
		</div>

		{@render footer?.()}
	</div>
{/if}
