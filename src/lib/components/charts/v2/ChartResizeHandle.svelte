<script>
	/**
	 * ChartResizeHandle — vertical resize handle that sits below a chart and
	 * drives `chart.chartStyles.chartHeightPx`. Renders the shared five-dot
	 * DragHandle strip so chart resizing matches the app's panel dividers.
	 *
	 * Persists height via localStorage when `storageKey` is provided.
	 */

	import DragHandle from '$lib/components/ui/panel/drag-handle.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {import('./ChartStore.svelte.js').default} chart
	 * @property {string} [storageKey]
	 * @property {number} [minHeight]
	 * @property {number} [maxHeight]
	 * @property {(height: number) => void} [onresize]
	 * @property {(height: number) => void} [onresizeend]
	 */

	/** @type {Props} */
	let { chart, storageKey, minHeight = 120, maxHeight = 800, onresize, onresizeend } = $props();

	let isDragging = $state(false);

	/** @type {HTMLDivElement | undefined} */
	let handleEl = $state(undefined);

	// On mount: restore persisted height
	$effect(() => {
		if (!storageKey) return;
		if (typeof localStorage === 'undefined') return;
		const saved = localStorage.getItem(storageKey);
		if (!saved) return;
		const v = parseInt(saved, 10);
		if (!Number.isFinite(v)) return;
		const clamped = Math.min(maxHeight, Math.max(minHeight, v));
		chart.chartStyles.chartHeightPx = clamped;
	});

	/**
	 * Starting height for a drag: use the explicit `chartHeightPx` if set,
	 * otherwise measure the sibling chart element from the DOM.
	 */
	function getStartingHeight() {
		const current = chart.chartStyles.chartHeightPx;
		if (current && current > 0) return current;
		// Previous sibling is the chart's outer wrapper
		const prev = handleEl?.previousElementSibling;
		if (prev instanceof HTMLElement) {
			const rect = prev.getBoundingClientRect();
			if (rect.height > 0) return rect.height;
		}
		return 300;
	}

	/** @param {PointerEvent} e */
	function start(e) {
		e.preventDefault();
		isDragging = true;
		const startY = e.clientY;
		const startHeight = getStartingHeight();

		/** @param {PointerEvent} moveEvent */
		function onMove(moveEvent) {
			const delta = moveEvent.clientY - startY;
			const next = Math.min(maxHeight, Math.max(minHeight, startHeight + delta));
			chart.chartStyles.chartHeightPx = next;
			onresize?.(next);
		}

		function onUp() {
			isDragging = false;
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
			window.removeEventListener('pointercancel', onUp);

			const finalHeight = chart.chartStyles.chartHeightPx;
			if (storageKey && typeof localStorage !== 'undefined') {
				try {
					localStorage.setItem(storageKey, String(finalHeight));
				} catch {
					// ignore quota/availability errors
				}
			}
			onresizeend?.(finalHeight);
		}

		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
		window.addEventListener('pointercancel', onUp);
	}
</script>

<DragHandle
	bind:el={handleEl}
	axis="y"
	onstart={start}
	active={isDragging}
	role="separator"
	aria-orientation="horizontal"
	aria-label="Resize chart height"
/>
