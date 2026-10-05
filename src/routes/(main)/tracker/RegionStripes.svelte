<script>
	import { onDestroy } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { createViewportGestures } from '$lib/components/charts/v2/viewport-gestures.js';
	import {
		classifyWheelIntent,
		wheelPanDeltaMs
	} from '$lib/components/charts/v2/wheel-interaction.js';
	import StaticZoomButtons from '$lib/components/charts/v2/StaticZoomButtons.svelte';
	import { comparisonMetric, formatComparisonCell } from './comparison-metrics.js';
	import { inspectionStep } from './comparison-inspection.js';
	import { stripeCells, stripeLegendItems, stripePeriodAt } from './comparison-stripes.js';
	import {
		COMPARISON_MIN_SPAN_MS,
		COMPARISON_REGIONS,
		comparisonChartRows,
		comparisonPeriod,
		comparisonTickLabel,
		comparisonTicks,
		nextPeriodStart,
		visibleComparisonRows
	} from './region-comparison.js';

	/**
	 * Stripes for one comparison metric: a row of colour cells per region,
	 * one cell per period, over the same viewport as the line chart. The
	 * cells are painted to a canvas (one `fillRect` per visible cell, a
	 * millisecond or so per frame however many there are); labels, axis,
	 * highlight and the pointer overlay stay in an SVG above it, so PNG
	 * export composes the canvas raster under the SVG chrome. Pointer
	 * geometry is pure maths on the rows, so nothing is hit-tested in the DOM.
	 * @type {{data: Record<string, any[]>, regions: string[], metric: string,
	 *   basis: 'demand' | 'generation', interval: string, months: number,
	 *   viewport: {start: number, end: number}, bounds: {start: number, end: number},
	 *   scale: import('./comparison-stripes.js').StripeScale, tooltip: boolean,
	 *   onhoverregion: (region: string | null) => void,
	 *   hover: number | null, focus: number | null,
	 *   onhover: (time: number | null) => void, onfocus: (time: number | null) => void,
	 *   onviewport: (start: number, end: number, settled: boolean) => void}} */
	let {
		data,
		regions,
		metric,
		basis,
		interval,
		months,
		viewport,
		bounds,
		scale,
		tooltip,
		onhoverregion,
		hover,
		focus,
		onhover,
		onfocus,
		onviewport
	} = $props();

	const TOP = 8;
	const GAP = 2;
	const AXIS_HEIGHT = 24;
	const DRAG_THRESHOLD_PX = 3;
	/** Labels that fit the narrow gutter below `sm`. */
	const NARROW_LABELS = /** @type {Record<string, string>} */ ({ au: 'All' });
	const inspectionHintId = $props.id();
	const clipId = `${inspectionHintId}-plot`;
	const sm = new MediaQuery('(min-width: 640px)');
	let rowHeight = $derived(sm.current ? 36 : 28);
	let labelWidth = $derived(sm.current ? 96 : 64);
	/** @param {string} id */
	const regionLabel = (id) => {
		const region = COMPARISON_REGIONS.find((r) => r.value === id);
		return (!sm.current && NARROW_LABELS[id]) || region?.shortLabel || id;
	};
	let width = $state(0);
	let plotWidth = $derived(Math.max(0, width - labelWidth));
	let definition = $derived(comparisonMetric(metric));
	let rows = $derived(comparisonChartRows(data, regions, metric, basis, months));
	let byTime = $derived(new Map(rows.map((row) => [row.time, row])));
	let visibleRows = $derived(visibleComparisonRows(rows, viewport));
	let span = $derived(viewport.end - viewport.start);
	let pxPerMs = $derived(span > 0 ? plotWidth / span : 0);
	let rowsHeight = $derived(Math.max(0, regions.length * (rowHeight + GAP) - GAP));
	let height = $derived(TOP + rowsHeight + AXIS_HEIGHT);
	/** @param {number} time */
	const x = (time) => labelWidth + (time - viewport.start) * pxPerMs;
	/** @param {number} index */
	const rowY = (index) => TOP + index * (rowHeight + GAP);
	/** Axis labels at the shared calendar-anchored ticks. */
	let axis = $derived(
		comparisonTicks(visibleRows, months).map((date) => {
			const time = date.getTime();
			return { time, x: x(time), label: comparisonTickLabel(time, viewport) };
		})
	);
	let inspected = $derived(hover ?? focus);
	let highlight = $derived(
		inspected == null
			? null
			: {
					x: x(inspected),
					width: (nextPeriodStart(inspected, months) - inspected) * pxPerMs
				}
	);
	/** Pointer position inside the wrapper, for the tooltip and hovered row. */
	let pointer = $state(/** @type {{x: number, y: number} | null} */ (null));
	/** @param {{x: number, y: number} | null} point */
	const regionAt = (point) =>
		point ? (regions[Math.floor((point.y - TOP) / (rowHeight + GAP))] ?? null) : null;
	let hoveredRegion = $derived(regionAt(pointer));
	/** Move (or clear) the pointer, naming the row under it to the Regions table.
	 * @param {{x: number, y: number} | null} point */
	function setPointer(point) {
		pointer = point;
		onhoverregion(regionAt(point));
	}
	let tooltipRows = $derived(
		!tooltip || inspected == null
			? []
			: regions.map((id) => {
					const region = COMPARISON_REGIONS.find((r) => r.value === id);
					return {
						id,
						label: region?.shortLabel ?? id,
						colour: region?.colour ?? '#333333',
						value: formatComparisonCell(byTime.get(inspected)?.[id], metric, {}),
						hovered: id === hoveredRegion
					};
				})
	);
	let tooltipWidth = $state(0);
	let tooltipHeight = $state(0);
	let tooltipStyle = $derived.by(() => {
		if (!highlight) return '';
		const anchorX = pointer?.x ?? highlight.x + highlight.width / 2;
		const anchorY = pointer?.y ?? TOP;
		let left = anchorX + 12;
		if (left + tooltipWidth > width) left = Math.max(0, anchorX - 12 - tooltipWidth);
		let top = anchorY + 12;
		if (top + tooltipHeight > height) top = Math.max(0, anchorY - 12 - tooltipHeight);
		return `left: ${left}px; top: ${top}px;`;
	});
	let imageMetadata = $derived(
		JSON.stringify({
			hasData: visibleRows.length > 0,
			title: definition.shortLabel,
			unit: scale.unit,
			transform: '',
			legend: stripeLegendItems(scale)
		})
	);

	/** Paint the visible cells (plus the one straddling the left edge). Cell
	 * edges are rounded to whole pixels so neighbours share an edge with no
	 * seam; the fill style is only changed when the colour changes.
	 * @param {HTMLCanvasElement} canvas */
	function paint(canvas) {
		const dpr = window.devicePixelRatio || 1;
		const pixelWidth = Math.round(plotWidth * dpr);
		const pixelHeight = Math.round(rowsHeight * dpr);
		if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
		if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
		const context = canvas.getContext('2d');
		if (!context || !plotWidth || !rowsHeight) return;
		context.setTransform(dpr, 0, 0, dpr, 0, 0);
		context.clearRect(0, 0, plotWidth, rowsHeight);
		const drawn = rows.filter(
			(row) => row.time < viewport.end && nextPeriodStart(row.time, months) > viewport.start
		);
		const cells = stripeCells(drawn, months, viewport.start, pxPerMs);
		let fill = '';
		regions.forEach((id, index) => {
			const y = index * (rowHeight + GAP);
			cells.forEach((cell, cellIndex) => {
				const colour = scale.colour(drawn[cellIndex][id]);
				if (colour !== fill) {
					fill = colour;
					context.fillStyle = colour;
				}
				const left = Math.round(cell.x);
				const right = Math.round(cell.x + cell.width);
				context.fillRect(left, y, Math.max(1, right - left), rowHeight);
			});
		});
	}
	/** Repaint whenever anything the picture depends on changes; a pan frame
	 * repaints once, after Svelte's flush.
	 * @param {HTMLCanvasElement} canvas */
	function cells(canvas) {
		$effect(() => {
			paint(canvas);
		});
	}

	const gestures = createViewportGestures({
		viewport: () => viewport,
		apply: (start, end) => onviewport(start, end, false),
		minDateMs: () => bounds.start,
		minDurationMs: () => COMPARISON_MIN_SPAN_MS,
		maxDurationMs: () => bounds.end - bounds.start,
		onGestureStart: () => {
			setPointer(null);
			onhover(null);
		},
		onSettle: (start, end) => onviewport(start, end, true)
	});
	onDestroy(gestures.dispose);

	// Pointer and wheel deltas are accumulated and applied once per animation
	// frame: trackpads and mice report far above the refresh rate, and each
	// applied pan is a full reactive update.
	let pendingMs = 0;
	/** @type {number | null} */
	let frame = null;
	function flushPan() {
		frame = null;
		const deltaMs = pendingMs;
		pendingMs = 0;
		if (deltaMs) gestures.handlePan(deltaMs);
	}
	/** @param {number} deltaMs */
	function queuePan(deltaMs) {
		pendingMs += deltaMs;
		frame ??= requestAnimationFrame(flushPan);
	}
	onDestroy(() => {
		if (frame !== null) cancelAnimationFrame(frame);
	});

	/** @type {{startX: number, lastX: number, moved: boolean} | null} */
	let drag = null;
	/** Pointer position relative to the SVG, which fills the wrapper.
	 * @param {PointerEvent} event */
	function localPoint(event) {
		const rect = /** @type {SVGRectElement} */ (
			event.currentTarget
		).ownerSVGElement?.getBoundingClientRect();
		return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) };
	}
	/** The visible period under a wrapper x, if any. @param {number} px */
	function periodAt(px) {
		if (!pxPerMs) return null;
		const period = stripePeriodAt(rows, months, viewport.start + (px - labelWidth) / pxPerMs);
		return period != null && period >= viewport.start && period < viewport.end ? period : null;
	}
	/** @param {PointerEvent} event */
	function handlePointerDown(event) {
		if (event.pointerType !== 'mouse' || event.button !== 0) return;
		const point = localPoint(event);
		drag = { startX: point.x, lastX: point.x, moved: false };
		/** @type {SVGRectElement} */ (event.currentTarget).setPointerCapture(event.pointerId);
	}
	/** @param {PointerEvent} event */
	function handlePointerMove(event) {
		const point = localPoint(event);
		if (drag && event.buttons & 1) {
			const dx = point.x - drag.lastX;
			drag.lastX = point.x;
			if (!drag.moved && Math.abs(point.x - drag.startX) > DRAG_THRESHOLD_PX) {
				drag.moved = true;
				gestures.handlePanStart();
			}
			if (drag.moved && pxPerMs) queuePan(dx / pxPerMs);
			return;
		}
		setPointer(point);
		onhover(periodAt(point.x));
	}
	/** @param {PointerEvent} event */
	function handlePointerUp(event) {
		const active = drag;
		drag = null;
		if (active?.moved) {
			if (frame !== null) {
				cancelAnimationFrame(frame);
				flushPan();
			}
			gestures.handlePanEnd();
			return;
		}
		if (event.button !== 0) return;
		const period = periodAt(localPoint(event).x);
		if (period != null) onfocus(focus === period ? null : period);
	}
	function handlePointerLeave() {
		if (drag?.moved) return;
		setPointer(null);
		onhover(null);
	}
	/** Horizontal wheel slides the window (and must not trigger the browser's
	 * back-swipe); vertical wheel keeps scrolling the page. An attachment
	 * because Svelte's wheel attributes are passive.
	 * @param {Element} element */
	function wheelPan(element) {
		/** @param {Event} event */
		const handleWheel = (event) => {
			const { deltaX, deltaY } = /** @type {WheelEvent} */ (event);
			if (classifyWheelIntent(deltaX, deltaY) !== 'pan') return;
			event.preventDefault();
			if (pointer) {
				setPointer(null);
				onhover(null);
			}
			queuePan(wheelPanDeltaMs(deltaX, plotWidth, span));
		};
		element.addEventListener('wheel', handleWheel, { passive: false });
		return () => element.removeEventListener('wheel', handleWheel);
	}
	/** @param {KeyboardEvent} event */
	function inspect(event) {
		if (event.target !== event.currentTarget) return;
		const step = inspectionStep(event.key, visibleRows, hover, focus);
		if (!step) return;
		if (event.key !== 'Escape') event.preventDefault();
		setPointer(null);
		if ('hover' in step) onhover(step.hover ?? null);
		if ('focus' in step) onfocus(step.focus ?? null);
	}
</script>

<div
	role="group"
	aria-label={`${definition.label} heatmap`}
	class="relative"
	data-chart-image={imageMetadata}
>
	<div data-chart-area class="relative" bind:clientWidth={width}>
		<canvas
			data-png-layer
			{@attach cells}
			class="absolute"
			style={`left: ${labelWidth}px; top: ${TOP}px; width: ${plotWidth}px; height: ${rowsHeight}px;`}
			aria-hidden="true"
		></canvas>
		<svg
			data-png-layer
			{width}
			{height}
			class="relative block select-none"
			style="touch-action: pan-y;"
			role="img"
			aria-label={`${definition.label} by region, one cell per period`}
		>
			<defs>
				<clipPath id={clipId}>
					<rect x={labelWidth} y="0" width={plotWidth} {height} />
				</clipPath>
			</defs>
			{#each regions as id, index (id)}
				{@const region = COMPARISON_REGIONS.find((r) => r.value === id)}
				<circle cx="10" cy={rowY(index) + rowHeight / 2} r="4" fill={region?.colour ?? '#333333'} />
				<text
					x="20"
					y={rowY(index) + rowHeight / 2}
					dominant-baseline="central"
					class="fill-dark-grey text-xs"
					fill="currentColor">{regionLabel(id)}</text
				>
			{/each}
			<g clip-path={`url(#${clipId})`}>
				{#if highlight}
					<rect
						data-png-exclude
						x={highlight.x}
						y={TOP}
						width={Math.max(1, highlight.width)}
						height={rowsHeight}
						fill="none"
						stroke="#353535"
						stroke-width="1"
						pointer-events="none"
					/>
				{/if}
			</g>
			<g transform={`translate(0 ${TOP + rowsHeight})`} clip-path={`url(#${clipId})`}>
				{#each axis as cell (cell.time)}
					<line
						x1={cell.x}
						x2={cell.x}
						y1="0"
						y2="6"
						class="stroke-mid-warm-grey"
						stroke="currentColor"
					/>
					<text x={cell.x + 4} y="16" class="fill-mid-grey text-xxs font-light" fill="currentColor"
						>{cell.label}</text
					>
				{/each}
			</g>
			<!-- Pointer-only overlay; keyboard inspection is the button below. -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<rect
				data-png-exclude
				{@attach wheelPan}
				x={labelWidth}
				y={TOP}
				width={plotWidth}
				height={rowsHeight}
				fill="transparent"
				class="cursor-crosshair"
				onpointerdown={handlePointerDown}
				onpointermove={handlePointerMove}
				onpointerup={handlePointerUp}
				onpointerleave={handlePointerLeave}
				onpointercancel={handlePointerLeave}
			/>
		</svg>
		{#if highlight && tooltipRows.length}
			<div
				class="pointer-events-none absolute z-20 flex min-w-[160px] flex-col rounded-md border border-warm-grey bg-white/70 px-3 py-2 text-xs whitespace-nowrap shadow-sm backdrop-blur-md backdrop-saturate-150"
				style={tooltipStyle}
				bind:clientWidth={tooltipWidth}
				bind:clientHeight={tooltipHeight}
				data-testid="chart-floating-tooltip"
			>
				<div
					class="mb-1.5 flex items-baseline justify-between gap-3 border-b border-warm-grey/60 pb-1.5 font-light text-mid-grey"
				>
					<span>{comparisonPeriod(inspected ?? 0, interval)}</span>
					<span class="text-right font-mono">{scale.unit}</span>
				</div>
				<div class="flex flex-col gap-1">
					{#each tooltipRows as row (row.id)}
						<div
							class="flex items-center justify-between gap-3 rounded-sm {row.hovered
								? 'bg-warm-grey/60'
								: ''}"
						>
							<span class="flex min-w-0 items-center gap-1.5">
								<span class="size-2 shrink-0 rounded-full" style:background-color={row.colour}
								></span>
								<span class="truncate {row.hovered ? 'font-semibold text-black' : 'text-dark-grey'}"
									>{row.label}</span
								>
							</span>
							<span
								class="text-right font-mono tabular-nums {row.hovered
									? 'font-semibold text-black'
									: 'font-medium text-dark-grey'}">{row.value}</span
							>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
	<div class="flex items-center justify-end gap-0.5 px-2" data-png-exclude>
		<StaticZoomButtons
			onzoomin={gestures.zoomIn}
			onzoomout={gestures.zoomOut}
			isAtMinZoom={span <= COMPARISON_MIN_SPAN_MS}
			isAtMaxZoom={viewport.start <= bounds.start && viewport.end >= bounds.end}
		/>
	</div>
	<button
		type="button"
		class="sr-only focus:not-sr-only focus:absolute focus:bottom-2 focus:left-2 focus:z-30 rounded border border-mid-warm-grey bg-white px-3 py-2 text-xs focus:outline focus:outline-dark-grey"
		onkeydown={inspect}
		onclick={() => onhover(visibleRows.at(-1)?.time ?? null)}
		aria-label={`Inspect ${definition.label.toLowerCase()} values`}
		aria-describedby={inspectionHintId}>Inspect values</button
	>
	<span id={inspectionHintId} class="sr-only"
		>Use left and right arrows to inspect a period, Enter to pin it, and Escape to clear it.</span
	>
</div>
