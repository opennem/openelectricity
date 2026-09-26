<script>
	/**
	 * Inline SVG sparkline. Renders a line + area path across a fixed-size
	 * viewBox; gracefully handles nulls (gaps in line) and a single non-null
	 * point (renders as a centred dot).
	 *
	 * Pass `hoverIndex` to draw a synced hover indicator (vertical line + dot)
	 * at the given index — useful for cross-row sync in small-multiples
	 * layouts. Pointer events on the SVG fire `onhover(idx)` and `onhoverend()`
	 * so the parent can lift hover state.
	 *
	 * @type {{
	 *   values: (number | null)[],
	 *   colour: string,
	 *   width?: number,
	 *   height?: number,
	 *   ariaLabel?: string,
	 *   class?: string,
	 *   hoverIndex?: number | null,
	 *   onhover?: (idx: number) => void,
	 *   onhoverend?: () => void
	 * }}
	 */
	let {
		values,
		colour,
		width = 80,
		height = 20,
		ariaLabel = 'Trend',
		class: className = '',
		hoverIndex = null,
		onhover,
		onhoverend
	} = $props();

	/** @type {SVGSVGElement | null} */
	let svgEl = $state(null);

	let geometry = $derived.by(() => buildSparkline(values, width, height));

	let hoverPoint = $derived.by(() => {
		if (hoverIndex == null) return null;
		const p = geometry.points?.[hoverIndex];
		return p ?? null;
	});

	let hoverX = $derived.by(() => {
		if (hoverIndex == null || !values?.length) return null;
		if (values.length === 1) return width / 2;
		return hoverIndex * (width / (values.length - 1));
	});

	/**
	 * @param {(number | null)[]} vals
	 * @param {number} w
	 * @param {number} h
	 * @returns {{
	 *   points: ({ x: number, y: number, value: number } | null)[],
	 *   linePath: string,
	 *   areaPath: string,
	 *   singlePoint: { x: number, y: number } | null
	 * }}
	 */
	function buildSparkline(vals, w, h) {
		if (!vals?.length) {
			return { points: [], linePath: '', areaPath: '', singlePoint: null };
		}

		const validEntries = vals.map((v, i) => ({ v, i })).filter((d) => d.v != null);

		if (validEntries.length === 0) {
			return {
				points: vals.map(() => null),
				linePath: '',
				areaPath: '',
				singlePoint: null
			};
		}

		const xStep = vals.length > 1 ? w / (vals.length - 1) : 0;

		if (validEntries.length === 1) {
			const entry = validEntries[0];
			const points = vals.map((v, i) =>
				v == null ? null : { x: i * xStep, y: h / 2, value: /** @type {number} */ (v) }
			);
			const single = vals.length > 1 ? { x: entry.i * xStep, y: h / 2 } : { x: w / 2, y: h / 2 };
			return { points, linePath: '', areaPath: '', singlePoint: single };
		}

		const numericValues = /** @type {number[]} */ (vals.filter((v) => v != null));
		const min = Math.min(...numericValues);
		const max = Math.max(...numericValues);
		const range = max - min || 1;
		const padding = 2;
		const plotHeight = h - padding * 2;

		const points = vals.map((v, i) =>
			v == null
				? null
				: {
						x: i * xStep,
						y: padding + plotHeight - ((v - min) / range) * plotHeight,
						value: /** @type {number} */ (v)
					}
		);

		/** @type {string[]} */
		const lineSegments = [];
		/** @type {string[]} */
		const areaSegments = [];

		let inSegment = false;
		/** @type {{ x: number, y: number }[]} */
		let currentSegment = [];

		for (const pt of points) {
			if (pt) {
				if (!inSegment) {
					lineSegments.push(`M${pt.x},${pt.y}`);
					currentSegment = [pt];
					inSegment = true;
				} else {
					lineSegments.push(`L${pt.x},${pt.y}`);
					currentSegment.push(pt);
				}
			} else {
				if (currentSegment.length > 1) {
					areaSegments.push(buildAreaSegment(currentSegment, h));
				}
				inSegment = false;
				currentSegment = [];
			}
		}

		if (currentSegment.length > 1) {
			areaSegments.push(buildAreaSegment(currentSegment, h));
		}

		return {
			points,
			linePath: lineSegments.join(''),
			areaPath: areaSegments.join(''),
			singlePoint: null
		};
	}

	/**
	 * @param {{ x: number, y: number }[]} points
	 * @param {number} h
	 */
	function buildAreaSegment(points, h) {
		if (points.length < 2) return '';
		let d = `M${points[0].x},${h}`;
		for (const pt of points) d += `L${pt.x},${pt.y}`;
		d += `L${points[points.length - 1].x},${h}Z`;
		return d;
	}

	/** @param {PointerEvent} e */
	function handleMove(e) {
		if (!onhover || !svgEl || !values?.length) return;
		const rect = svgEl.getBoundingClientRect();
		if (rect.width === 0) return;
		const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
		const idx = Math.round(fraction * (values.length - 1));
		onhover(idx);
	}

	function handleLeave() {
		onhoverend?.();
	}
</script>

<svg
	bind:this={svgEl}
	{width}
	{height}
	class="block {className}"
	aria-label={ariaLabel}
	role="img"
	onpointermove={handleMove}
	onpointerleave={handleLeave}
>
	{#if geometry.areaPath}
		<path d={geometry.areaPath} fill={colour} fill-opacity="0.2" />
	{/if}
	{#if geometry.linePath}
		<path d={geometry.linePath} fill="none" stroke={colour} stroke-width="1.5" />
	{/if}
	{#if geometry.singlePoint}
		<circle cx={geometry.singlePoint.x} cy={geometry.singlePoint.y} r="2.5" fill={colour} />
	{/if}
	{#if hoverX != null}
		<line
			x1={hoverX}
			y1="0"
			x2={hoverX}
			y2={height}
			stroke={colour}
			stroke-opacity="0.4"
			stroke-width="0.5"
		/>
	{/if}
	{#if hoverPoint}
		<circle
			cx={hoverPoint.x}
			cy={hoverPoint.y}
			r="3"
			fill={colour}
			stroke="white"
			stroke-width="1"
		/>
	{/if}
</svg>
