<script>
	import { formatComparePercent } from './chart-compare.js';

	/**
	 * CompareValueTiles — a single line's comparison (spot or volume-weighted
	 * price, emissions intensity): A and B as value tiles either side of the
	 * change, then a range strip placing both within the visible window, from
	 * its low to its high, with the window's reference (its mean, or the
	 * ratio of its sums) marked between.
	 *
	 * One SVG (`data-png-layer`), so PNG export captures it.
	 *
	 * @type {{
	 *   row: import('./chart-compare.js').CompareRow,
	 *   source: import('../types.js').CompareSource,
	 *   labels: {a: string, b: string}
	 * }}
	 */
	let { row, source, labels } = $props();

	const TILE_H = 72;
	const GAP = 16;
	const STRIP_TOP = TILE_H + 24;
	const STRIP_H = 52;
	const DARK = '#353535';
	const MUTED = '#6A6A6A';

	let width = $state(0);
	let narrow = $derived(width < 440);
	let middle = $derived(narrow ? 76 : 112);
	let tileW = $derived(Math.max(0, (width - middle - 2 * GAP) / 2));
	let range = $derived(source.window ?? null);
	let height = $derived(range ? STRIP_TOP + STRIP_H : TILE_H + 4);

	/** Where a value sits on the strip, clamped to its ends. @param {number} value */
	function stripX(value) {
		if (!range) return 0;
		const span = range.max - range.min;
		const fraction = span > 0 ? (value - range.min) / span : 0.5;
		return 8 + Math.min(1, Math.max(0, fraction)) * (width - 16);
	}

	let tiles = $derived([
		{ slot: 'A', x: 0, value: row.a, label: labels.a },
		{ slot: 'B', x: tileW + middle + 2 * GAP, value: row.b, label: labels.b }
	]);
	let dots = $derived(
		[
			{ slot: 'A', value: row.a },
			{ slot: 'B', value: row.b }
		].filter((dot) => dot.value !== null)
	);
</script>

<div class="w-full" bind:clientWidth={width}>
	{#if width}
		<svg
			data-png-layer
			{width}
			{height}
			viewBox="0 0 {width} {height}"
			class="block text-dark-grey"
			aria-hidden="true"
			role="presentation"
		>
			{#each tiles as tile (tile.slot)}
				<g transform="translate({tile.x}, 0)" data-testid="compare-tile">
					<rect width={tileW} height={TILE_H} rx="6" fill="#FAF9F6" stroke="#E5E4E0" />
					<rect x="12" y="12" width="16" height="15" rx="3" fill={DARK} />
					<text
						x="20"
						y="19.5"
						dy="0.35em"
						text-anchor="middle"
						fill="white"
						font-size="10"
						font-weight="600">{tile.slot}</text
					>
					<text x="36" y="19.5" dy="0.35em" font-size="11" fill={MUTED}>{tile.label}</text>
					<text x="12" y="52" font-size={narrow ? 18 : 22} font-weight="600" class="tabular-nums"
						>{source.format(tile.value)}<tspan font-size="11" font-weight="400" fill={MUTED} dx="4"
							>{source.unit}</tspan
						></text
					>
				</g>
			{/each}

			<!-- The change between the tiles -->
			<g transform="translate({tileW + GAP}, 0)">
				<line x1="6" x2={middle - 6} y1="30" y2="30" stroke="#C6C6C6" stroke-width="1.5" />
				<path
					d="M{middle - 12} 25 L{middle - 6} 30 L{middle - 12} 35"
					fill="none"
					stroke="#C6C6C6"
					stroke-width="1.5"
				/>
				<text
					x={middle / 2}
					y="18"
					text-anchor="middle"
					font-size="12"
					font-weight="600"
					class="tabular-nums">{source.formatDelta(row.delta)}</text
				>
				{#if source.deltaMode === 'relative'}
					<text
						x={middle / 2}
						y="50"
						text-anchor="middle"
						font-size="11"
						fill={MUTED}
						class="tabular-nums">{formatComparePercent(row.percent)}</text
					>
				{/if}
			</g>

			{#if range}
				{@const y = STRIP_TOP + 22}
				<g data-testid="compare-range">
					<text x="0" y={STRIP_TOP} font-size="10" fill={MUTED}>In view</text>
					<line
						x1="8"
						x2={width - 8}
						y1={y}
						y2={y}
						stroke="#E5E4E0"
						stroke-width="6"
						stroke-linecap="round"
					/>
					<text x="8" y={y + 22} font-size="10" fill={MUTED} class="tabular-nums"
						>Low {source.format(range.min)}</text
					>
					<text
						x={width - 8}
						y={y + 22}
						text-anchor="end"
						font-size="10"
						fill={MUTED}
						class="tabular-nums">High {source.format(range.max)}</text
					>
					{#if range.reference !== null}
						{@const x = stripX(range.reference)}
						<line x1={x} x2={x} y1={y - 7} y2={y + 7} stroke={MUTED} stroke-width="1.5" />
						<!-- Named unless it would collide with the Low / High labels. -->
						{#if x > 90 && x < width - 90}
							<text
								{x}
								y={y + 22}
								text-anchor="middle"
								font-size="10"
								fill={MUTED}
								class="tabular-nums">{range.referenceLabel} {source.format(range.reference)}</text
							>
						{/if}
					{/if}
					{#each dots as dot (dot.slot)}
						{@const x = stripX(/** @type {number} */ (dot.value))}
						<circle cx={x} cy={y} r="8" fill={DARK} stroke="white" stroke-width="1.5" />
						<text
							{x}
							{y}
							dy="0.35em"
							text-anchor="middle"
							fill="white"
							font-size="9"
							font-weight="600">{dot.slot}</text
						>
					{/each}
				</g>
			{/if}
		</svg>
	{/if}
</div>
