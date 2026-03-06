<script>
	import { getNumberFormat } from '$lib/utils/formatters';

	/**
	 * @type {{
	 *   profile: Array<{ hour: number, total: number }>,
	 *   colour: string,
	 *   label?: string
	 * }}
	 */
	let { profile, colour, label = 'Daily Profile' } = $props();

	const fmtMW = getNumberFormat(0);

	const SVG_HEIGHT = 80;
	const PADDING_TOP = 14;
	const PADDING_BOTTOM = 16;
	const CHART_HEIGHT = SVG_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

	/** X-axis tick labels */
	const xTicks = [0, 6, 12, 18];

	/**
	 * Whether the profile has any non-zero data to render.
	 */
	let hasData = $derived(profile?.length > 0 && profile.some((d) => d.total > 0));

	/**
	 * Maximum total value across all hours.
	 */
	let maxTotal = $derived.by(() => {
		if (!hasData) return 0;
		let max = 0;
		for (const d of profile) {
			if (d.total > max) max = d.total;
		}
		return max;
	});

	/**
	 * Index of the peak hour entry.
	 */
	let peakIndex = $derived.by(() => {
		if (!hasData) return 0;
		let idx = 0;
		let max = 0;
		for (let i = 0; i < profile.length; i++) {
			if (profile[i].total > max) {
				max = profile[i].total;
				idx = i;
			}
		}
		return idx;
	});

	/**
	 * Computed SVG path for the area fill and the line stroke.
	 * Uses a viewBox of 0 0 200 SVG_HEIGHT so x coordinates map 0-23 to 0-200.
	 *
	 * @type {{ area: string, line: string, peakX: number, peakY: number }}
	 */
	let paths = $derived.by(() => {
		if (!hasData || maxTotal === 0) {
			return { area: '', line: '', peakX: 0, peakY: 0 };
		}

		const points = profile.map((d) => {
			const x = (d.hour / 23) * 200;
			const y = PADDING_TOP + CHART_HEIGHT - (d.total / maxTotal) * CHART_HEIGHT;
			return { x, y };
		});

		// Build line path
		let linePath = `M ${points[0].x} ${points[0].y}`;
		for (let i = 1; i < points.length; i++) {
			linePath += ` L ${points[i].x} ${points[i].y}`;
		}

		// Build area path (line + close along bottom)
		const bottomY = PADDING_TOP + CHART_HEIGHT;
		const areaPath = `${linePath} L ${points[points.length - 1].x} ${bottomY} L ${points[0].x} ${bottomY} Z`;

		return {
			area: areaPath,
			line: linePath,
			peakX: points[peakIndex].x,
			peakY: points[peakIndex].y
		};
	});
</script>

{#if hasData}
	<div class="border-t border-warm-grey pt-3">
		<span class="text-xxs font-medium uppercase tracking-wider text-mid-grey">{label}</span>

		<div class="mt-1.5" style="max-width: 280px;">
			<svg
				viewBox="0 0 200 {SVG_HEIGHT}"
				preserveAspectRatio="xMidYMid meet"
				class="w-full"
			>
				<!-- Area fill -->
				<path d={paths.area} fill={colour} fill-opacity="0.2" />

				<!-- Line stroke -->
				<path
					d={paths.line}
					fill="none"
					stroke={colour}
					stroke-width="1.5"
					vector-effect="non-scaling-stroke"
				/>

				<!-- Peak annotation -->
				<circle
					cx={paths.peakX}
					cy={paths.peakY}
					r="1.5"
					fill={colour}
					vector-effect="non-scaling-stroke"
				/>
				<text
					x={paths.peakX}
					y={paths.peakY - 3}
					text-anchor="middle"
					class="fill-dark-grey"
					style="font-size: 6px; font-family: var(--font-mono, monospace);"
				>
					{fmtMW.format(maxTotal)} MW
				</text>

				<!-- X-axis tick labels -->
				{#each xTicks as hour (hour)}
					<text
						x={(hour / 23) * 200}
						y={SVG_HEIGHT - 2}
						text-anchor="middle"
						class="fill-mid-grey"
						style="font-size: 5px; font-family: var(--font-mono, monospace);"
					>
						{hour}:00
					</text>
				{/each}
			</svg>
		</div>
	</div>
{/if}
