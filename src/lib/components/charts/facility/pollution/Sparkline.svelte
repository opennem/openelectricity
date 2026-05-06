<script>
	/**
	 * Inline SVG sparkline. Renders a line + area path across a fixed-size
	 * viewBox; gracefully handles nulls (gaps in line) and a single non-null
	 * point (renders as a centred dot).
	 *
	 * @type {{
	 *   values: (number | null)[],
	 *   colour: string,
	 *   width?: number,
	 *   height?: number,
	 *   ariaLabel?: string,
	 *   class?: string
	 * }}
	 */
	let {
		values,
		colour,
		width = 80,
		height = 20,
		ariaLabel = 'Trend',
		class: className = ''
	} = $props();

	let geometry = $derived.by(() => buildSparkline(values, width, height));

	/**
	 * @param {(number | null)[]} vals
	 * @param {number} w
	 * @param {number} h
	 * @returns {{ linePath: string, areaPath: string, singlePoint: { x: number, y: number } | null }}
	 */
	function buildSparkline(vals, w, h) {
		const validEntries = vals
			.map((v, i) => ({ v, i }))
			.filter((d) => d.v != null);

		if (validEntries.length === 0) {
			return { linePath: '', areaPath: '', singlePoint: null };
		}

		if (validEntries.length === 1) {
			const entry = validEntries[0];
			const x = vals.length > 1 ? entry.i * (w / (vals.length - 1)) : w / 2;
			return { linePath: '', areaPath: '', singlePoint: { x, y: h / 2 } };
		}

		const numericValues = /** @type {number[]} */ (vals.filter((v) => v != null));
		const min = Math.min(...numericValues);
		const max = Math.max(...numericValues);
		const range = max - min || 1;
		const padding = 2;
		const plotHeight = h - padding * 2;
		const xStep = w / (vals.length - 1);

		/**
		 * @param {number} index
		 * @param {number} value
		 */
		function toPoint(index, value) {
			return {
				x: index * xStep,
				y: padding + plotHeight - ((value - min) / range) * plotHeight
			};
		}

		/** @type {string[]} */
		const lineSegments = [];
		/** @type {string[]} */
		const areaSegments = [];

		let inSegment = false;
		/** @type {{ x: number, y: number }[]} */
		let currentSegment = [];

		for (let i = 0; i < vals.length; i++) {
			if (vals[i] != null) {
				const pt = toPoint(i, /** @type {number} */ (vals[i]));
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
</script>

<svg
	{width}
	{height}
	class="block {className}"
	aria-label={ariaLabel}
	role="img"
>
	{#if geometry.areaPath}
		<path d={geometry.areaPath} fill={colour} fill-opacity="0.2" />
	{/if}
	{#if geometry.linePath}
		<path d={geometry.linePath} fill="none" stroke={colour} stroke-width="1.5" />
	{/if}
	{#if geometry.singlePoint}
		<circle
			cx={geometry.singlePoint.x}
			cy={geometry.singlePoint.y}
			r="2.5"
			fill={colour}
		/>
	{/if}
</svg>
