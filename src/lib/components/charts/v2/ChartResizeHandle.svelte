<script>
	/**
	 * ChartResizeHandle — vertical resize handle that sits below a chart and
	 * drives `chart.chartStyles.chartHeightPx`.
	 *
	 * On devices with a fine pointer (mouse), the handle grip is hidden until
	 * hover/drag. On coarse pointers (touch), the grip is always visible so it
	 * can be targeted without hover.
	 *
	 * Persists height via localStorage when `storageKey` is provided.
	 */

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

<div
	bind:this={handleEl}
	class="chart-resize-handle"
	class:chart-resize-handle--dragging={isDragging}
	onpointerdown={start}
	role="separator"
	aria-orientation="horizontal"
	aria-label="Resize chart height"
>
	<span class="chart-resize-handle__grip"></span>
</div>

<style>
	.chart-resize-handle {
		position: relative;
		height: 12px;
		cursor: ns-resize;
		touch-action: none;
		user-select: none;
	}

	.chart-resize-handle__grip {
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		width: 32px;
		height: 4px;
		border-radius: 999px;
		background-color: var(--color-mid-warm-grey, #b8ad9b);
		opacity: 0;
		transition:
			opacity 120ms ease,
			background-color 120ms ease;
		pointer-events: none;
	}

	/* Fine pointer (mouse): grip fades in on hover / during drag */
	@media (hover: hover) and (pointer: fine) {
		.chart-resize-handle:hover .chart-resize-handle__grip {
			opacity: 1;
			background-color: var(--color-mid-grey, #6b6b6b);
		}
	}

	/* Coarse pointer (touch): always show grip */
	@media (hover: none), (pointer: coarse) {
		.chart-resize-handle__grip {
			opacity: 0.7;
		}
	}

	/* While actively dragging, always show */
	.chart-resize-handle--dragging .chart-resize-handle__grip {
		opacity: 1;
		background-color: var(--color-mid-grey, #6b6b6b);
	}
</style>
