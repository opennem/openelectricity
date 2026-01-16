<script>
	/**
	 * Date Brush Component
	 *
	 * A brush/zoom component for selecting date ranges on charts.
	 * Works with ChartStore to synchronize selections across multiple charts.
	 */
	import { LayerCake, Svg } from 'layercake';
	import { scaleTime } from 'd3-scale';
	import { AxisX, Line } from './elements';

	/**
	 * @typedef {Object} Props
	 * @property {import('./ChartStore.svelte.js').default} chart - The chart store instance
	 * @property {[Date, Date] | undefined} [brushedRange] - Current brush selection
	 * @property {(range: [Date, Date] | undefined) => void} [onbrush] - Callback when brush changes
	 * @property {string} [class] - Additional CSS classes
	 * @property {boolean} [showLine] - Whether to show the line chart
	 * @property {(d: any) => string} [formatTick] - Custom tick formatter
	 * @property {number} [height] - Height of the brush component in pixels
	 */

	/** @type {Props} */
	let {
		chart,
		brushedRange = undefined,
		onbrush,
		class: className = '',
		showLine = true,
		formatTick = (d) => String(d),
		height = 80
	} = $props();

	// Brush state
	let min = $state(/** @type {number | null} */ (null));
	let max = $state(/** @type {number | null} */ (null));
	let brushEl = $state(/** @type {HTMLDivElement | null} */ (null));
	let isDragging = $state(false);
	let isMoving = $state(false);

	// Throttling for performance
	let rafId = $state(/** @type {number | null} */ (null));
	let pendingNotify = $state(false);

	// Calculate left/right percentages for brush display
	let left = $derived(min !== null ? min * 100 : 0);
	let right = $derived(max !== null ? (1 - max) * 100 : 0);

	// Calculate total values for the line chart (sum of all series)
	let chartData = $derived.by(() => {
		if (!chart.seriesData?.length || !chart.seriesNames?.length) return [];

		return chart.seriesData.map((/** @type {any} */ d) => {
			let total = 0;
			for (const name of chart.seriesNames) {
				const val = d[name];
				if (typeof val === 'number' && !isNaN(val)) {
					total += val;
				}
			}
			return {
				date: d.date,
				time: d.time,
				total
			};
		});
	});

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
		if (min !== null && max !== null && chart.seriesData.length > 0) {
			const data = chart.seriesData;
			const startTime = data[0]?.date?.getTime() ?? 0;
			const endTime = data[data.length - 1]?.date?.getTime() ?? 0;
			const range = endTime - startTime;

			const startDate = new Date(startTime + range * min);
			const endDate = new Date(startTime + range * max);

			onbrush?.([startDate, endDate]);
		}
	}

	/**
	 * Throttled notify using requestAnimationFrame
	 * Only updates once per animation frame for smooth performance
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
		}

		function handleUp() {
			isDragging = false;
			window.removeEventListener('mousemove', handleMove);
			window.removeEventListener('mouseup', handleUp);

			// If range is too small, clear it
			if (max !== null && min !== null && max - min < 0.01) {
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
				min = Math.max(0, Math.min(currentP, max - 0.01));
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
				max = Math.min(1, Math.max(currentP, min + 0.01));
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

	// Clear brush when brushedRange is undefined (but not while dragging)
	$effect(() => {
		if (brushedRange === undefined && !isDragging && !isMoving && (min !== null || max !== null)) {
			min = null;
			max = null;
		}
	});
</script>

<div class="relative w-full bg-light-warm-grey rounded-lg overflow-hidden {className}" style="height: {height}px;">
	<!-- Brush interaction layer (on top) -->
	<div
		bind:this={brushEl}
		class="absolute inset-0 z-10 cursor-crosshair"
		onmousedown={handleMouseDown}
		role="slider"
		aria-label="Date range brush"
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
				aria-valuenow={min ?? 0}
				aria-valuemin={0}
				aria-valuemax={1}
				tabindex="0"
			></div>
			<!-- Left resize handle -->
			<div
				class="brush-handle left"
				style="left: {left}%;"
				onmousedown={handleLeftResize}
				role="slider"
				aria-label="Resize left edge"
				aria-valuenow={min ?? 0}
				tabindex="0"
			></div>
			<!-- Right resize handle -->
			<div
				class="brush-handle right"
				style="right: {right}%;"
				onmousedown={handleRightResize}
				role="slider"
				aria-label="Resize right edge"
				aria-valuenow={max ?? 0}
				tabindex="0"
			></div>
		{/if}
	</div>

	<!-- Chart layer (below) -->
	<div class="absolute inset-0">
		<LayerCake
			padding={{ top: 5, right: 0, bottom: 20, left: 0 }}
			x="date"
			y="total"
			data={chartData}
			xScale={scaleTime()}
		>
			<Svg>
				{#if showLine && chartData.length > 0}
					<Line stroke="#999" strokeWidth="1" />
				{/if}

				<AxisX
					ticks={5}
					tickMarks={false}
					gridlines={true}
					yTick={12}
					formatTick={formatTick}
				/>
			</Svg>
		</LayerCake>
	</div>
</div>

<style>
	.brush-inner {
		position: absolute;
		top: 0;
		bottom: 0;
		background: #963f2937;
		border-radius: 4px;
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
		height: 24px;
		background: #963f29;
		border-radius: 2px;
		opacity: 0.8;
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
		background: #963f29;
	}
</style>
