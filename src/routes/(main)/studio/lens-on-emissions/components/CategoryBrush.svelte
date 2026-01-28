<script>
	/**
	 * CategoryBrush Component
	 *
	 * A brush/zoom component for selecting category ranges on charts.
	 * Works with category (FY) data instead of time-series dates.
	 */
	import { LayerCake, Svg } from 'layercake';
	import { scaleLinear } from 'd3-scale';
	import Line from '$lib/components/charts/elements/Line.svelte';
	import Area from '$lib/components/charts/elements/Area.svelte';

	/**
	 * @typedef {import('../helpers/csv-parser.js').EmissionsDataPoint} EmissionsDataPoint
	 */

	/**
	 * @typedef {Object} Props
	 * @property {EmissionsDataPoint[]} data - The chart data
	 * @property {string} xKey - Key for x-axis values (e.g., 'fy' or 'quarter')
	 * @property {[number, number] | undefined} [brushedRange] - Current brush selection as indices [startIdx, endIdx]
	 * @property {(range: [number, number] | undefined) => void} [onbrush] - Callback when brush changes
	 * @property {(d: any) => string} [formatLabel] - Format function for labels
	 * @property {string} [class] - Additional CSS classes
	 * @property {number} [height] - Height of the brush component in pixels
	 */

	/** @type {Props} */
	let {
		data,
		xKey = 'fy',
		brushedRange = undefined,
		onbrush,
		formatLabel = (d) => String(d),
		class: className = '',
		height = 60
	} = $props();

	// Brush state
	let min = $state(/** @type {number | null} */ (null));
	let max = $state(/** @type {number | null} */ (null));
	let brushEl = $state(/** @type {HTMLDivElement | null} */ (null));
	let isDragging = $state(false);
	let isMoving = $state(false);

	// Throttling for smooth updates
	let rafId = $state(/** @type {number | null} */ (null));
	let pendingNotify = $state(false);

	// Calculate left/right percentages for brush display
	let left = $derived(min !== null ? min * 100 : 0);
	let right = $derived(max !== null ? (1 - max) * 100 : 0);

	// Transform data for the mini line chart (show net_total)
	let chartData = $derived(
		data.map((d, index) => ({
			index,
			value: d.net_total || 0
		}))
	);

	/**
	 * Convert position to percentage
	 * @param {number} clientX
	 */
	function toPercent(clientX) {
		if (!brushEl) return 0;
		const rect = brushEl.getBoundingClientRect();
		const p = (clientX - rect.left) / rect.width;
		return Math.max(0, Math.min(1, p));
	}

	/**
	 * Notify parent of brush change (immediate)
	 */
	function notifyBrushChange() {
		if (min !== null && max !== null && data.length > 0) {
			const startIdx = Math.round(min * (data.length - 1));
			const endIdx = Math.round(max * (data.length - 1));
			onbrush?.([startIdx, endIdx]);
		}
	}

	/**
	 * Throttled notify using requestAnimationFrame for smooth dragging
	 */
	function notifyBrushChangeThrottled() {
		if (pendingNotify) return;

		pendingNotify = true;
		rafId = requestAnimationFrame(() => {
			notifyBrushChange();
			pendingNotify = false;
		});
	}

	/**
	 * Cleanup RAF on unmount
	 */
	$effect(() => {
		return () => {
			if (rafId !== null) {
				cancelAnimationFrame(rafId);
			}
		};
	});

	/**
	 * Handle creating a new brush selection
	 * @param {MouseEvent} e
	 */
	function handleMouseDown(e) {
		e.preventDefault();

		isDragging = true;
		const startP = toPercent(e.clientX);
		min = startP;
		max = startP;

		/**
		 * @param {MouseEvent} moveEvent
		 */
		function handleMove(moveEvent) {
			const currentP = toPercent(moveEvent.clientX);
			min = Math.min(startP, currentP);
			max = Math.max(startP, currentP);
			notifyBrushChangeThrottled();
		}

		function handleUp() {
			isDragging = false;
			window.removeEventListener('mousemove', handleMove);
			window.removeEventListener('mouseup', handleUp);

			// If range is too small, clear it
			if (max !== null && min !== null && max - min < 0.02) {
				min = null;
				max = null;
				onbrush?.(undefined);
				return;
			}

			notifyBrushChange();
		}

		window.addEventListener('mousemove', handleMove);
		window.addEventListener('mouseup', handleUp);
	}

	/**
	 * Handle dragging the existing selection to move it
	 * @param {MouseEvent} e
	 */
	function handleSelectionMouseDown(e) {
		e.preventDefault();
		e.stopPropagation();

		if (min === null || max === null) return;

		isMoving = true;
		const startX = toPercent(e.clientX);
		const startMin = min;
		const startMax = max;
		const width = max - min;

		/**
		 * @param {MouseEvent} moveEvent
		 */
		function handleMove(moveEvent) {
			const currentP = toPercent(moveEvent.clientX);
			const delta = currentP - startX;

			let newMin = startMin + delta;
			let newMax = startMax + delta;

			// Clamp to bounds
			if (newMin < 0) {
				newMin = 0;
				newMax = width;
			}
			if (newMax > 1) {
				newMax = 1;
				newMin = 1 - width;
			}

			min = newMin;
			max = newMax;
			notifyBrushChangeThrottled();
		}

		function handleUp() {
			isMoving = false;
			window.removeEventListener('mousemove', handleMove);
			window.removeEventListener('mouseup', handleUp);
			notifyBrushChange();
		}

		window.addEventListener('mousemove', handleMove);
		window.addEventListener('mouseup', handleUp);
	}

	/**
	 * Handle resizing from the left edge
	 * @param {MouseEvent} e
	 */
	function handleLeftResize(e) {
		e.preventDefault();
		e.stopPropagation();

		isDragging = true;

		/**
		 * @param {MouseEvent} moveEvent
		 */
		function handleMove(moveEvent) {
			const currentP = toPercent(moveEvent.clientX);
			if (max !== null) {
				min = Math.max(0, Math.min(currentP, max - 0.02));
				notifyBrushChangeThrottled();
			}
		}

		function handleUp() {
			isDragging = false;
			window.removeEventListener('mousemove', handleMove);
			window.removeEventListener('mouseup', handleUp);
			notifyBrushChange();
		}

		window.addEventListener('mousemove', handleMove);
		window.addEventListener('mouseup', handleUp);
	}

	/**
	 * Handle resizing from the right edge
	 * @param {MouseEvent} e
	 */
	function handleRightResize(e) {
		e.preventDefault();
		e.stopPropagation();

		isDragging = true;

		/**
		 * @param {MouseEvent} moveEvent
		 */
		function handleMove(moveEvent) {
			const currentP = toPercent(moveEvent.clientX);
			if (min !== null) {
				max = Math.min(1, Math.max(currentP, min + 0.02));
				notifyBrushChangeThrottled();
			}
		}

		function handleUp() {
			isDragging = false;
			window.removeEventListener('mousemove', handleMove);
			window.removeEventListener('mouseup', handleUp);
			notifyBrushChange();
		}

		window.addEventListener('mousemove', handleMove);
		window.addEventListener('mouseup', handleUp);
	}

	/**
	 * Clear button handler
	 */
	function clearBrush() {
		min = null;
		max = null;
		onbrush?.(undefined);
	}

	// Clear brush when brushedRange is undefined (but not while dragging)
	$effect(() => {
		if (brushedRange === undefined && !isDragging && !isMoving && (min !== null || max !== null)) {
			min = null;
			max = null;
		}
	});

	// Check if brush is active
	let hasBrush = $derived(min !== null && max !== null);

	// Get labels for selected range
	let startLabel = $derived.by(() => {
		if (!hasBrush || !brushedRange || data.length === 0) return '';
		const startData = data[brushedRange[0]];
		return startData ? formatLabel(startData[xKey]) : '';
	});

	let endLabel = $derived.by(() => {
		if (!hasBrush || !brushedRange || data.length === 0) return '';
		const endData = data[brushedRange[1]];
		return endData ? formatLabel(endData[xKey]) : '';
	});
</script>

<div class="relative {className}">
	<!-- Reset button (top right) -->
	{#if hasBrush}
		<button
			onclick={clearBrush}
			class="absolute top-1 right-1 z-20 px-2 py-0.5 text-xs font-medium text-mid-warm-grey hover:text-dark-grey bg-white/90 border border-light-warm-grey rounded transition-colors"
		>
			Reset
		</button>
	{/if}

	<!-- Range labels -->
	{#if hasBrush && startLabel && endLabel}
		<div class="absolute top-1 left-2 z-20 text-xs text-dark-grey font-medium">
			{startLabel} — {endLabel}
		</div>
	{/if}

	<div
		class="relative bg-light-warm-grey rounded-lg overflow-hidden"
		style="height: {height}px;"
	>
		<!-- Brush interaction layer (on top) -->
		<div
			bind:this={brushEl}
			class="absolute inset-0 z-10 cursor-crosshair"
			onmousedown={handleMouseDown}
			role="slider"
			aria-label="Category range brush"
			aria-valuenow={min ?? 0}
			aria-valuemin={0}
			aria-valuemax={1}
			tabindex="0"
		>
			{#if min !== null && max !== null}
				<!-- Brush selection area (draggable) -->
				<div
					class="brush-inner"
					style="left: {left}%; right: {right}%;"
					onmousedown={handleSelectionMouseDown}
					role="slider"
					aria-label="Drag to move selection"
					aria-valuenow={(min ?? 0) * 100}
					aria-valuemin={0}
					aria-valuemax={100}
					tabindex="0"
				></div>
				<!-- Left resize handle -->
				<div
					class="brush-handle left"
					style="left: {left}%;"
					onmousedown={handleLeftResize}
					role="slider"
					aria-label="Resize left edge"
					aria-valuenow={(min ?? 0) * 100}
					aria-valuemin={0}
					aria-valuemax={100}
					tabindex="0"
				></div>
				<!-- Right resize handle -->
				<div
					class="brush-handle right"
					style="right: {right}%;"
					onmousedown={handleRightResize}
					role="slider"
					aria-label="Resize right edge"
					aria-valuenow={(max ?? 0) * 100}
					aria-valuemin={0}
					aria-valuemax={100}
					tabindex="0"
				></div>
			{/if}
		</div>

		<!-- Chart layer (below) -->
		<div class="absolute inset-0">
			{#if chartData.length > 0}
				<LayerCake
					padding={{ top: 5, right: 5, bottom: 5, left: 5 }}
					x="index"
					y="value"
					data={chartData}
					xScale={scaleLinear()}
					xDomain={[0, chartData.length - 1]}
				>
					<Svg>
						<Area fill="#999" fillOpacity={0.1} />
						<Line stroke="#999" strokeWidth="1px" />
					</Svg>
				</LayerCake>
			{/if}
		</div>
	</div>
</div>

<style>
	.brush-inner {
		position: absolute;
		top: 0;
		bottom: 0;
		background: rgba(100, 100, 100, 0.15);
		border-left: 2px solid rgba(100, 100, 100, 0.4);
		border-right: 2px solid rgba(100, 100, 100, 0.4);
		cursor: move;
	}

	.brush-handle {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 12px;
		cursor: ew-resize;
		background: transparent;
	}

	.brush-handle::before {
		content: '';
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		width: 4px;
		height: 20px;
		background: #666;
		border-radius: 2px;
		opacity: 0.7;
	}

	.brush-handle.left {
		margin-left: -6px;
	}

	.brush-handle.left::before {
		right: 2px;
	}

	.brush-handle.right {
		margin-left: -6px;
	}

	.brush-handle.right::before {
		left: 2px;
	}

	.brush-handle:hover::before {
		opacity: 1;
	}
</style>
