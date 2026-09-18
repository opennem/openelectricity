<script>
	import { onDestroy } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { createViewportGestures } from '$lib/components/charts/v2/viewport-gestures.js';
	import {
		classifyWheelIntent,
		wheelPanDeltaMs
	} from '$lib/components/charts/v2/wheel-interaction.js';
	import StaticZoomButtons from '$lib/components/charts/v2/StaticZoomButtons.svelte';
	import { comparisonMetric, formatComparisonValue } from './comparison-metrics.js';
	import { inspectionStep } from './comparison-inspection.js';
	import { stripeCells, stripeLegendItems, stripePeriodAt } from './comparison-stripes.js';
	import { windowStartingAtMonth } from './comparison-navigation.js';
	import {
		COMPARISON_MIN_SPAN_MS,
		COMPARISON_REGIONS,
		DAILY_WINDOW_MS,
		comparisonChartRows,
		comparisonPeriod,
		comparisonTickLabel,
		comparisonTicks,
		monthStart,
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
	 *   basis: 'demand' | 'generation', interval: string,
	 *   viewport: {start: number, end: number}, bounds: {start: number, end: number},
	 *   scale: import('./comparison-stripes.js').StripeScale,
	 *   hover: number | null, focus: number | null,
	 *   onhover: (time: number | null) => void, onfocus: (time: number | null) => void,
	 *   onviewport: (start: number, end: number, settled: boolean) => void}} */
	let {
		data,
		regions,
		metric,
		basis,
		interval,
		viewport,
		bounds,
		scale,
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
	const NARROW_LABELS = /** @type {Record<string, string>} */ ({ wem: 'WA', au: 'All' });
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
	let rows = $derived(comparisonChartRows(data, regions, metric, basis, interval));
	let byTime = $derived(new Map(rows.map((row) => [row.time, row])));
	let visibleRows = $derived(visibleComparisonRows(rows, viewport));
	let span = $derived(viewport.end - viewport.start);
	let pxPerMs = $derived(span > 0 ? plotWidth / span : 0);
	let rowsHeight = $derived(Math.max(0, regions.length * (rowHeight + GAP) - GAP));
	let height = $derived(TOP + rowsHeight + AXIS_HEIGHT);
	let fixedWindow = $derived(interval === '1d');
	/** @param {number} time */
	const x = (time) => labelWidth + (time - viewport.start) * pxPerMs;
	/** @param {number} index */
	const rowY = (index) => TOP + index * (rowHeight + GAP);
	let ticks = $derived(comparisonTicks(visibleRows, interval).map((date) => date.getTime()));
	/** Daily axes are month cells that jump the window, anchored to month
	 * starts (the first may begin left of the viewport and is clipped) so a
	 * label keeps its place as the window slides; other intervals label the
	 * shared calendar-anchored ticks. */
	let axis = $derived.by(() => {
		const first = monthStart(viewport.start);
		const starts = fixedWindow ? [first, ...ticks.filter((time) => time > first)] : ticks;
		return starts.map((time, index) => {
			const next = fixedWindow ? (starts[index + 1] ?? viewport.end) : time;
			const date = new Date(time);
			return {
				time,
				x: x(time),
				width: (next - time) * pxPerMs,
				label: comparisonTickLabel(time, interval, viewport),
				year: date.getUTCFullYear(),
				month: date.getUTCMonth() + 1,
				january: date.getUTCMonth() === 0 && date.getUTCDate() === 1
			};
		});
	});
	let inspected = $derived(hover ?? focus);
	let highlight = $derived(
		inspected == null
			? null
			: { x: x(inspected), width: (nextPeriodStart(inspected, interval) - inspected) * pxPerMs }
	);
	/** Pointer position inside the wrapper, for the tooltip and hovered row. */
	let pointer = $state(/** @type {{x: number, y: number} | null} */ (null));
	let hoveredRegion = $derived(
		pointer ? (regions[Math.floor((pointer.y - TOP) / (rowHeight + GAP))] ?? null) : null
	);
	let tooltipRows = $derived(
		inspected == null
			? []
			: regions.map((id) => {
					const region = COMPARISON_REGIONS.find((r) => r.value === id);
					return {
						id,
						label: region?.shortLabel ?? id,
						colour: region?.colour ?? '#333333',
						value: formatComparisonValue(byTime.get(inspected)?.[id], metric),
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
			(row) => row.time < viewport.end && nextPeriodStart(row.time, interval) > viewport.start
		);
		const cells = stripeCells(drawn, interval, viewport.start, pxPerMs);
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
		minDurationMs: () => (fixedWindow ? DAILY_WINDOW_MS : COMPARISON_MIN_SPAN_MS),
		maxDurationMs: () => (fixedWindow ? DAILY_WINDOW_MS : bounds.end - bounds.start),
		onGestureStart: () => {
			pointer = null;
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
		const period = stripePeriodAt(rows, interval, viewport.start + (px - labelWidth) / pxPerMs);
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
		pointer = point;
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
		pointer = null;
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
				pointer = null;
				onhover(null);
			}
			queuePan(wheelPanDeltaMs(deltaX, plotWidth, span));
		};
		element.addEventListener('wheel', handleWheel, { passive: false });
		return () => element.removeEventListener('wheel', handleWheel);
	}
	/** Slide the window so a month is its first month. @param {number} year @param {number} month */
	function jumpToMonth(year, month) {
		const next = windowStartingAtMonth(year, month, bounds);
		onviewport(next.start, next.end, true);
	}
	/** @param {KeyboardEvent} event */
	function inspect(event) {
		if (event.target !== event.currentTarget) return;
		const step = inspectionStep(event.key, visibleRows, hover, focus);
		if (!step) return;
		if (event.key !== 'Escape') event.preventDefault();
		pointer = null;
		if ('hover' in step) onhover(step.hover ?? null);
		if ('focus' in step) onfocus(step.focus ?? null);
	}
</script>

<div
	role="group"
	aria-label={`${definition.label} stripes`}
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
				{#if fixedWindow}
					{#each axis as cell (cell.time)}
						{#if cell.january}
							<line
								data-png-exclude
								x1={cell.x}
								x2={cell.x}
								y1={TOP}
								y2={TOP + rowsHeight}
								class="stroke-dark-grey/60"
								stroke="currentColor"
								stroke-dasharray="2 3"
							/>
						{/if}
					{/each}
				{/if}
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
					{#if fixedWindow}
						<g
							role="button"
							tabindex="-1"
							class="cursor-pointer [&:hover>rect]:fill-warm-grey"
							onclick={() => jumpToMonth(cell.year, cell.month)}
							onkeydown={(event) => {
								if (event.key === 'Enter' || event.key === ' ') jumpToMonth(cell.year, cell.month);
							}}
						>
							<title>Show the year from {cell.label}</title>
							<rect
								data-png-exclude
								x={cell.x}
								y="0"
								width={Math.max(0, cell.width)}
								height={AXIS_HEIGHT}
								fill="transparent"
							/>
							<line
								x1={cell.x}
								x2={cell.x}
								y1="0"
								y2={cell.january ? 14 : 6}
								class={cell.january ? 'stroke-dark-grey' : 'stroke-mid-warm-grey'}
								stroke="currentColor"
							/>
							{#if cell.width > 20}
								<!-- Narrow months keep the month; January drops its year when it cannot fit. -->
								<text
									x={cell.x + 4}
									y="16"
									class="text-xxs font-light {cell.january ? 'fill-dark-grey' : 'fill-mid-grey'}"
									fill="currentColor"
									>{cell.width > 52 ? cell.label : cell.label.split(' ')[0]}</text
								>
							{/if}
						</g>
					{:else}
						<line
							x1={cell.x}
							x2={cell.x}
							y1="0"
							y2="6"
							class="stroke-mid-warm-grey"
							stroke="currentColor"
						/>
						<text
							x={cell.x + 4}
							y="16"
							class="fill-mid-grey text-xxs font-light"
							fill="currentColor">{cell.label}</text
						>
					{/if}
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
	{#if !fixedWindow}
		<div class="flex items-center justify-end gap-0.5 px-2" data-png-exclude>
			<StaticZoomButtons
				onzoomin={gestures.zoomIn}
				onzoomout={gestures.zoomOut}
				isAtMinZoom={span <= COMPARISON_MIN_SPAN_MS}
				isAtMaxZoom={viewport.start <= bounds.start && viewport.end >= bounds.end}
			/>
		</div>
	{/if}
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
