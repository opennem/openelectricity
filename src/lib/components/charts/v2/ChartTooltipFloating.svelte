<script>
	/**
	 * ChartTooltipFloating — cursor-following tooltip overlaid on the chart.
	 *
	 * Renders a multi-row card: date header, one row per visible series, and
	 * an optional total footer. The row whose key matches `chart.hoverKey`
	 * gets a subtle background tint so the user can see which series the
	 * pointer is over.
	 *
	 * Reads `chart.hoverTime` (set by InteractionLayer / StackedArea mouse
	 * events) and positions the card at the corresponding x-pixel inside the
	 * chart area, with boundary-aware flipping near the edges.
	 */

	import {
		getActiveData,
		getTotalForRow,
		getFormattedX,
		buildSeriesRows
	} from './tooltip-derivations.js';
	import { computeStepBand } from './elements/step-band.js';

	/**
	 * @typedef {Object} Props
	 * @property {import('./ChartStore.svelte.js').default} chart
	 * @property {number} [dodgeRightPx] - Width of a top-right UI element (e.g. zoom buttons) to dodge. If the tooltip's right edge would land inside the last `dodgeRightPx` pixels of the container, the tooltip drops down to avoid overlap.
	 * @property {number} [insetPx] - Horizontal gap (px) to keep between the tooltip card and both edges of the container. Useful when the chart is rendered full-bleed and you still want the overlay to stand off from the edges.
	 * @property {string} [class]
	 */

	/** @type {Props} */
	let { chart, dodgeRightPx = 0, insetPx = 0, class: className = '' } = $props();

	/** @type {HTMLDivElement | undefined} */
	let wrapperEl = $state(undefined);
	let wrapperWidth = $state(0);
	let wrapperHeight = $state(0);
	let tooltipWidth = $state(0);
	let tooltipHeight = $state(0);
	/** Cursor Y inside the wrapper (null while pointer is outside). */
	let cursorY = $state(/** @type {number | null} */ (null));

	// Track the pointer globally so we can read its position even though the
	// tooltip overlay itself is `pointer-events-none`. Listening on the window
	// and projecting into the wrapper's local coordinates avoids intercepting
	// chart pointer events.
	$effect(() => {
		if (!wrapperEl) return;
		/** @type {HTMLDivElement} */
		const el = wrapperEl;
		/** @param {PointerEvent} e */
		function onMove(e) {
			const rect = el.getBoundingClientRect();
			const y = e.clientY - rect.top;
			cursorY = y >= 0 && y <= rect.height ? y : null;
		}
		function onLeave() {
			cursorY = null;
		}
		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerleave', onLeave);
		return () => {
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerleave', onLeave);
		};
	});

	let activeData = $derived(getActiveData(chart));
	let isStepMode = $derived(chart.chartOptions.selectedCurveType === 'step');
	let formattedDate = $derived(getFormattedX(chart, activeData));
	let rows = $derived(activeData ? buildSeriesRows(chart, activeData) : []);
	let total = $derived(getTotalForRow(chart, activeData));
	let formattedTotal = $derived(chart.convertAndFormatValue(total));
	let displayUnit = $derived(chart.chartOptions.displayUnit ?? '');

	/**
	 * Map a time value to its pixel position inside the chart area, mirroring
	 * LayerCake's xScale. Uses `renderXDomain` (xDomain extended by one
	 * `stepIntervalMs` on the right in step mode) so the conversion matches
	 * the drawn path — otherwise pixels in step mode would be off by the
	 * trailing-interval stretch factor.
	 * @param {number} time
	 * @returns {number | null}
	 */
	function timeToX(time) {
		if (!wrapperWidth) return null;
		const domain = chart.renderXDomain ?? chart.xDomain;
		if (!domain || domain.length !== 2) return null;
		const [xMin, xMax] = domain;
		if (xMax === xMin) return null;
		const pad = chart.chartStyles.chartPadding || { left: 0, right: 0 };
		const drawLeft = pad.left || 0;
		const drawWidth = wrapperWidth - drawLeft - (pad.right || 0);
		if (drawWidth <= 0) return null;
		const ratio = (time - xMin) / (xMax - xMin);
		return drawLeft + ratio * drawWidth;
	}

	// Convert hoverTime → x-pixel in the chart area. In step mode this is the
	// band's left edge (because activeData.time is snapped to the band start).
	let hoverX = $derived(activeData ? timeToX(activeData.time) : null);

	// Right edge of the active band — only meaningful in step mode. Returns
	// null outside step mode so the line-mode placement is unchanged.
	let activeBandRightX = $derived.by(() => {
		if (!isStepMode || !activeData) return null;
		const data = chart.seriesScaledData;
		if (!data?.length) return null;
		const idx = data.findIndex((/** @type {{ time: number }} */ d) => d.time === activeData.time);
		if (idx < 0) return null;
		const band = computeStepBand(idx, data);
		return band ? timeToX(band.endMs) : null;
	});

	// Place the card to the side of the crosshair (not over it) so the column
	// under the cursor stays visible. In line mode the anchor is the data point
	// itself; in step mode the anchor is the band's outer edge — right side for
	// right placement, left side for left — so the card never overlaps the
	// active step's band. Side choice uses the band centre so the decision is
	// stable as the cursor moves within a wide band. Position is clamped inside
	// the container.
	let tooltipLeft = $derived.by(() => {
		if (hoverX === null || !tooltipWidth || !wrapperWidth) return 0;
		const GAP = 12;
		const bandLeftX = hoverX;
		const bandRightX = activeBandRightX ?? hoverX;
		const anchorForSide = (bandLeftX + bandRightX) / 2;
		const placeRight = anchorForSide < wrapperWidth / 2;
		const desired = placeRight ? bandRightX + GAP : bandLeftX - tooltipWidth - GAP;
		return Math.max(insetPx, Math.min(wrapperWidth - tooltipWidth - insetPx, desired));
	});

	// Snap the tooltip to the top or bottom of the chart depending on which
	// half the cursor is in. Cursor in upper half → tooltip at the bottom;
	// cursor in lower half → tooltip at the top (with optional dodge for
	// top-right UI like zoom buttons). Binary placement keeps the card from
	// jittering vertically as the pointer moves; the CSS top/left transition
	// smooths the actual swap.
	let tooltipTop = $derived.by(() => {
		const TOP = 8;
		const DODGE_TOP = 36;
		const BOTTOM_GAP = 8;

		const canSnapBottom =
			cursorY !== null && tooltipHeight > 0 && wrapperHeight > tooltipHeight + BOTTOM_GAP + TOP;

		if (canSnapBottom && cursorY !== null && cursorY < wrapperHeight / 2) {
			return wrapperHeight - tooltipHeight - BOTTOM_GAP;
		}

		if (dodgeRightPx <= 0) return TOP;
		if (hoverX === null || !tooltipWidth || !wrapperWidth) return TOP;
		const tooltipRight = tooltipLeft + tooltipWidth;
		const zoneLeft = wrapperWidth - dodgeRightPx;
		return tooltipRight > zoneLeft ? DODGE_TOP : TOP;
	});
</script>

<div
	bind:this={wrapperEl}
	bind:clientWidth={wrapperWidth}
	bind:clientHeight={wrapperHeight}
	class="absolute inset-0 pointer-events-none z-20 {className}"
>
	{#if activeData}
		<!-- Tooltip card -->
		<div
			bind:clientWidth={tooltipWidth}
			bind:clientHeight={tooltipHeight}
			class="absolute min-w-[180px] flex flex-col bg-white/70 backdrop-blur-md backdrop-saturate-150 rounded-md shadow-sm border border-warm-grey text-xs whitespace-nowrap transition-[top,left] duration-150 px-3 py-2"
			style:left="{tooltipLeft}px"
			style:top="{tooltipTop}px"
		>
			<!-- Date header -->
			{#if formattedDate}
				<div class="text-mid-grey font-light pb-1.5 mb-1.5 border-b border-warm-grey/60">
					{formattedDate}
				</div>
			{/if}

			<!-- One row per visible series -->
			<div class="flex flex-col gap-1">
				{#each rows as row (row.key)}
					<div
						class="flex items-center gap-3 justify-between rounded-sm {row.isHovered
							? '-mx-2 px-2 py-0.5 bg-light-warm-grey/60'
							: ''}"
					>
						<span class="flex items-center gap-1.5 min-w-0">
							<span class="w-2 h-2 rounded-full shrink-0" style:background-color={row.colour}
							></span>
							<span class="text-dark-grey truncate">{row.label}</span>
						</span>
						<span class="font-mono font-medium text-dark-grey tabular-nums">
							{#if row.formattedValue}
								{row.formattedValue}{#if displayUnit}&nbsp;{displayUnit}{/if}
							{:else}
								—
							{/if}
						</span>
					</div>
				{/each}
			</div>

			<!-- Optional total footer -->
			{#if chart.chartTooltips.showTotal}
				<div
					class="flex items-center gap-3 justify-between pt-1.5 mt-1.5 border-t border-warm-grey/60"
				>
					<span class="text-mid-grey">Total</span>
					<span class="font-mono font-semibold text-dark-grey tabular-nums">
						{formattedTotal}{#if displayUnit}&nbsp;{displayUnit}{/if}
					</span>
				</div>
			{/if}
		</div>
	{/if}
</div>
