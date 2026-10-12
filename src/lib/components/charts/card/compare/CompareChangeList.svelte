<script>
	import { deltaExtent, formatComparePercent } from './chart-compare.js';
	import { splitTableLabel } from '../cell-format.js';

	/**
	 * CompareChangeList — a compare panel's change list: a row per series
	 * (technology or region) with its A and B values, a horizontal bar of its
	 * change about a centre zero line, the change and, for relative changes,
	 * the percentage. Bars share one scale, the largest change filling half
	 * the bar column, so their lengths compare across rows.
	 *
	 * A composition leads with its net total; its loads (charging, pumping)
	 * read as consumption, signs inverted and tagged "load", so they rank and
	 * compare alongside the sources. `colourOf` adds each value's shade on
	 * the heatmap's scale as a chip just right of it, in the A and B columns.
	 * Narrow lists drop the A and B values (the chips stay). Hovering a row reports
	 * its series (`onhover`), and the hovered series stands out while the
	 * others recede.
	 *
	 * One SVG (`data-png-layer`), so PNG export captures it; the panel's
	 * visually hidden table carries the values for assistive technology.
	 *
	 * @type {{
	 *   rows: import('./chart-compare.js').CompareRow[],
	 *   source: import('../types.js').CompareSource,
	 *   total?: ReturnType<typeof import('./chart-compare.js').compareTotals> | null,
	 *   totalLabel?: string,
	 *   hovered?: string,
	 *   onhover?: (id: string | undefined) => void
	 * }}
	 */
	let { rows, source, total = null, totalLabel = 'Net total', hovered, onhover } = $props();

	const ROW_H = 26;
	const HEAD_H = 22;
	const SWATCH = 10;
	const CHAR_PX = 6.6;

	let width = $state(0);
	let wide = $derived(width >= 560);
	let chips = $derived(!!source.colourOf);
	/** A chip's side; a value stands clear of its chip by this and a gap. */
	const CHIP = 12;
	let valueInset = $derived(chips ? CHIP + 6 : 0);
	let showPercent = $derived(source.deltaMode === 'relative');
	let extent = $derived(deltaExtent(rows));

	let columns = $derived.by(() => {
		// As wide as the longest label needs, within bounds.
		const longest = Math.max(0, ...rows.map((row) => row.label.length)) * CHAR_PX + SWATCH + 12;
		const label = wide
			? Math.round(Math.min(240, Math.max(140, longest)))
			: Math.min(140, Math.round(width * 0.36));
		const value = wide ? (chips ? 96 : 84) : chips ? 22 : 0;
		const delta = source.deltaMode === 'rank' ? 64 : 84;
		const percent = showPercent ? 62 : 0;
		const bar = Math.max(40, width - label - 2 * value - delta - percent - 16);
		const barX = label + 2 * value + 12;
		return {
			label,
			a: label + value,
			b: label + 2 * value,
			barX,
			bar,
			zero: barX + bar / 2,
			delta: barX + bar + 4 + delta,
			percent: barX + bar + 4 + delta + percent
		};
	});

	/** @typedef {{kind: 'total', y: number}
	 *   | {kind: 'row', y: number, row: import('./chart-compare.js').CompareRow}} Line */
	let lines = $derived.by(() => {
		/** @type {Line[]} */
		const out = [];
		let y = HEAD_H;
		if (total) {
			out.push({ kind: 'total', y });
			y += ROW_H + 6;
		}
		for (const row of rows) {
			out.push({ kind: 'row', y, row });
			y += ROW_H;
		}
		return { out, height: y + 4 };
	});

	/** @param {number | null} delta */
	function barRect(delta) {
		if (delta === null || !extent) return null;
		const length = Math.max(delta === 0 ? 0 : 1.5, (Math.abs(delta) / extent) * (columns.bar / 2));
		return { x: delta >= 0 ? columns.zero : columns.zero - length, width: length };
	}

	/** @param {string} text @param {number} px */
	function fit(text, px) {
		const max = Math.max(3, Math.floor(px / CHAR_PX));
		return text.length > max ? `${text.slice(0, max - 1)}…` : text;
	}

	/** @param {number | null} value */
	const chipColour = (value) => source.colourOf?.(value) ?? 'transparent';
</script>

<div class="w-full" bind:clientWidth={width}>
	{#if width}
		<svg
			data-png-layer
			{width}
			height={lines.height}
			viewBox="0 0 {width} {lines.height}"
			class="block overflow-visible text-dark-grey"
			font-size="12"
			aria-hidden="true"
			role="presentation"
			onpointerleave={() => onhover?.(undefined)}
		>
			<!-- Column heads -->
			<g fill="#6A6A6A" font-size="10">
				<!-- Over the values, or over the chips alone on narrow lists. -->
				{#if wide || chips}
					<text
						x={columns.a - (wide ? valueInset : CHIP / 2)}
						y="12"
						text-anchor={wide ? 'end' : 'middle'}>A</text
					>
					<text
						x={columns.b - (wide ? valueInset : CHIP / 2)}
						y="12"
						text-anchor={wide ? 'end' : 'middle'}>B</text
					>
				{/if}
				<text x={columns.zero} y="12" text-anchor="middle"
					>{source.deltaMode === 'rank' ? 'Places moved' : 'Change B − A'}</text
				>
				<text x={columns.delta} y="12" text-anchor="end"
					>{source.deltaMode === 'rank'
						? ''
						: source.deltaMode === 'points'
							? 'pp'
							: source.unit}</text
				>
				{#if showPercent}<text x={columns.percent} y="12" text-anchor="end">%</text>{/if}
			</g>

			<line
				x1={columns.zero}
				x2={columns.zero}
				y1={HEAD_H - 4}
				y2={lines.height - 4}
				stroke="#C6C6C6"
				stroke-width="1"
			/>

			{#each lines.out as line, index (line.kind === 'row' ? line.row.id : `${line.kind}-${index}`)}
				{#if line.kind === 'total' && total}
					{@const mid = line.y + ROW_H / 2}
					<g font-weight="600">
						<text x="0" y={mid} dy="0.35em">{totalLabel}</text>
						{#if wide}
							<text x={columns.a} y={mid} dy="0.35em" text-anchor="end" class="tabular-nums"
								>{source.format(total.a)}</text
							>
							<text x={columns.b} y={mid} dy="0.35em" text-anchor="end" class="tabular-nums"
								>{source.format(total.b)}</text
							>
						{/if}
						<text x={columns.delta} y={mid} dy="0.35em" text-anchor="end" class="tabular-nums"
							>{source.formatDelta(total.delta)}</text
						>
						{#if showPercent}
							<text x={columns.percent} y={mid} dy="0.35em" text-anchor="end" class="tabular-nums"
								>{formatComparePercent(total.percent)}</text
							>
						{/if}
					</g>
					<line
						x1="0"
						x2={width}
						y1={line.y + ROW_H + 3}
						y2={line.y + ROW_H + 3}
						stroke="#C6C6C6"
					/>
				{:else if line.kind === 'row'}
					{@const row = line.row}
					{@const mid = line.y + ROW_H / 2}
					{@const bar = barRect(row.delta)}
					{@const label = splitTableLabel(row.label)}
					{@const faded = hovered !== undefined && hovered !== row.id}
					<g
						opacity={faded ? 0.4 : 1}
						role="presentation"
						onpointerenter={() => onhover?.(row.id)}
						data-testid="compare-row"
						data-row={row.id}
					>
						{#if hovered === row.id}
							<rect
								data-png-exclude
								x="-6"
								y={line.y}
								width={width + 12}
								height={ROW_H}
								rx="4"
								fill="#F1F0ED"
							/>
						{:else}
							<!-- The row's hit area: gaps between marks still report it. -->
							<rect x="-6" y={line.y} width={width + 12} height={ROW_H} fill="transparent" />
						{/if}
						{#if row.dashed}
							<line
								x1="0"
								x2={SWATCH}
								y1={mid}
								y2={mid}
								stroke={row.colour}
								stroke-width="2"
								stroke-dasharray="3 2"
							/>
						{:else}
							<rect
								x="0"
								y={mid - SWATCH / 2}
								width={SWATCH}
								height={SWATCH}
								rx="2"
								fill={row.colour}
							/>
						{/if}
						<text x={SWATCH + 6} y={mid} dy="0.35em"
							>{fit(label.main, columns.label - SWATCH - 10)}{#if label.sub && wide}<tspan
									fill="#6A6A6A"
									dx="4">{label.sub}</tspan
								>{/if}{#if row.isLoad}<tspan fill="#6A6A6A" font-size="10" dx="6">load</tspan
								>{/if}</text
						>
						{#if chips}
							<!-- Each value's shade on the heatmap's scale, a chip just right
							     of it, closing its column. -->
							{#each [{ x: columns.a, value: row.a }, { x: columns.b, value: row.b }] as cell (cell.x)}
								<rect
									x={cell.x - CHIP}
									y={mid - CHIP / 2}
									width={CHIP}
									height={CHIP}
									rx="2"
									fill={chipColour(cell.value)}
									stroke="#C6C6C6"
									stroke-width="0.5"
								/>
							{/each}
						{/if}
						{#if wide}
							<!-- Right-aligned, clear of their chips when there are chips. -->
							<text
								x={columns.a - valueInset}
								y={mid}
								dy="0.35em"
								text-anchor="end"
								class="tabular-nums"
								fill="#6A6A6A">{source.format(row.a)}</text
							>
							<text
								x={columns.b - valueInset}
								y={mid}
								dy="0.35em"
								text-anchor="end"
								class="tabular-nums">{source.format(row.b)}</text
							>
						{/if}
						{#if bar}
							<rect
								x={bar.x}
								y={mid - 6}
								width={bar.width}
								height="12"
								rx="2"
								fill={row.colour}
								opacity={row.dashed ? 0.5 : 0.9}
							/>
						{/if}
						<text
							x={columns.delta}
							y={mid}
							dy="0.35em"
							text-anchor="end"
							font-weight="600"
							class="tabular-nums">{source.formatDelta(row.delta)}</text
						>
						{#if showPercent}
							<text
								x={columns.percent}
								y={mid}
								dy="0.35em"
								text-anchor="end"
								fill="#6A6A6A"
								class="tabular-nums">{formatComparePercent(row.percent)}</text
							>
						{/if}
					</g>
				{/if}
			{/each}
		</svg>
	{/if}
</div>
