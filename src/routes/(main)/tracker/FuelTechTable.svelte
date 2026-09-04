<script>
	import Tooltip from '$lib/components/ui/Tooltip.svelte';
	import { GROUP_OPTIONS } from '$lib/components/charts/network/groups.js';
	import { fuelTechNameMap } from '$lib/fuel_techs.js';
	import { DEFAULT_GROUP } from './tracker-model.js';
	import {
		CURTAILMENT_COLOURS,
		DEMAND_LINE_COLOUR,
		RENEWABLES_LINE_COLOUR
	} from './tracker-overlays.js';
	import {
		EMPTY_CELL,
		emissionsDisplayPrefix,
		formatTableEmissions,
		formatTableIntensity,
		formatTablePercentage,
		formatTablePower,
		formatTablePrice,
		splitTableLabel
	} from './table-format.js';
	import { scrollTargetFor, visibleValueColumns } from './table-columns.js';

	/** @typedef {import('./types.js').FuelTechTableRow} FuelTechTableRow */
	/** @typedef {import('./types.js').CurtailmentTableRow} CurtailmentTableRow */
	/** @typedef {import('./types.js').OverlaySummary} OverlaySummary */

	/**
	 * Row indicator: a solid fuel-tech square, a hatched curtailment square or
	 * an overlay line stub — hollow/grey when the row is toggled off.
	 * @typedef {{ kind: 'solid' | 'hatch' | 'line', colour: string }} Swatch
	 */

	/**
	 * One toggleable table row, whatever section it lives in.
	 * @typedef {Object} ToggleRow
	 * @property {string} key
	 * @property {string} label
	 * @property {boolean} active - Drawn on the charts
	 * @property {(exclusive: boolean) => void} activate - ⌘/Ctrl solos the row
	 * @property {Swatch} swatch
	 * @property {string[]} cells - One formatted value per `VALUE_COLUMNS` entry
	 * @property {string[]} [breakdown] - Tooltip lines listing the folded fuel techs
	 * @property {boolean} [dimmed] - Fade the whole row while toggled off
	 * @property {boolean} [summary] - Bold summary treatment for the overlay rows
	 * @property {string} [testId]
	 */

	/**
	 * FuelTechTable — the tracker's fuel-tech breakdown table. Technology plus
	 * five value columns: average power, contribution share, volume-weighted
	 * price, window emissions and emissions intensity, split into Sources/Loads
	 * sections in top-down stack order, followed by curtailment and the
	 * Demand/Renewables summary rows. Every row toggles its series on the
	 * charts; values are window aggregates computed upstream in
	 * `table-model.js`, so hidden rows keep their numbers. Outside the Detailed
	 * grouping, hovering a row's technology label lists the underlying fuel
	 * techs folded into that group. The grouping and contribution basis are
	 * chosen in the page's options menu; the headers echo them as sub-labels.
	 *
	 * Below the carousel breakpoint the Technology column pins to the left and
	 * the value columns become a horizontal scroll-snap carousel; a tab strip
	 * above the table names them, highlights the ones in view and scrolls a
	 * column into place on tap (`table-columns.js`). The layout is driven by a
	 * CSS container query, so it follows the panel width, not the viewport.
	 *
	 * @type {import('./types.js').FuelTechTableControls & {
	 *   rows: FuelTechTableRow[],
	 *   valuesPending?: boolean,
	 *   curtailmentRows?: CurtailmentTableRow[],
	 *   overlaySummary?: OverlaySummary | null
	 * }}
	 */
	let {
		rows,
		valuesPending = false,
		basis = 'power',
		displayPrefix = 'M',
		group = DEFAULT_GROUP,
		contributionMode = 'generation',
		curtailmentRows = [],
		shownCurtailment = [],
		overlaySummary = null,
		showDemandLine = false,
		showRenewablesLine = false,
		ontoggle,
		oncurtailmenttoggle,
		ondemandlinetoggle,
		onrenewableslinetoggle
	} = $props();

	// Value columns and their carousel widths. The container-query breakpoint
	// (660px, spelt out in the `@min-[660px]:` classes below) is the sum of the
	// narrow widths: Technology 160 + 5 × 100 — equal to the natural table
	// width, so there is never a band where the strip shows but nothing scrolls.
	// The value widths also hold in the wide layout, where Technology takes
	// whatever remains.
	const VALUE_COLUMNS = [
		{ key: 'power', label: 'Av power', widthClass: 'w-[100px]' },
		{ key: 'contribution', label: 'Contribution', widthClass: 'w-[100px]' },
		{ key: 'price', label: 'Av price', widthClass: 'w-[100px]' },
		{ key: 'emissions', label: 'Emissions', widthClass: 'w-[100px]' },
		{ key: 'intensity', label: 'Intensity', widthClass: 'w-[100px]' }
	];
	const LAST_COLUMN = VALUE_COLUMNS.length - 1;

	/** @type {HTMLDivElement | undefined} */
	let scroller = $state();
	/** @type {HTMLTableCellElement | undefined} */
	let techHeader = $state();
	/** @type {Array<HTMLTableCellElement | undefined>} */
	let valueHeaders = $state([]);
	let scrollLeft = $state(0);
	let scrollerWidth = $state(0);

	/** Value columns currently inside the visible value region. The layout
	 *  reads are keyed on `scrollLeft` and `scrollerWidth`: header geometry
	 *  only changes with the scroller's width, which `bind:clientWidth` tracks. */
	let inView = $derived.by(() => {
		const headers = VALUE_COLUMNS.map((_, index) => valueHeaders[index]);
		if (!techHeader || headers.some((header) => !header)) {
			return VALUE_COLUMNS.map((_, index) => index === 0);
		}
		return visibleValueColumns({
			scrollLeft,
			viewportWidth: scrollerWidth,
			techWidth: techHeader.offsetWidth,
			columns: headers.map((header) => ({
				offsetLeft: /** @type {HTMLTableCellElement} */ (header).offsetLeft,
				width: /** @type {HTMLTableCellElement} */ (header).offsetWidth
			}))
		});
	});

	/** Scroll a value column to the left edge of the value region. Smoothness
	 *  comes from CSS (`scroll-smooth motion-reduce:scroll-auto`).
	 *  @param {number} index */
	function scrollToColumn(index) {
		const column = valueHeaders[index];
		if (!scroller || !techHeader || !column) return;
		scroller.scrollTo({
			left: scrollTargetFor(
				{ offsetLeft: column.offsetLeft, width: column.offsetWidth },
				{
					techWidth: techHeader.offsetWidth,
					viewportWidth: scroller.clientWidth,
					tableWidth: scroller.scrollWidth
				}
			)
		});
	}

	let powerUnit = $derived(`${displayPrefix}W`);
	let groupLabel = $derived(GROUP_OPTIONS.find((option) => option.value === group)?.label ?? '');
	let contributionUnit = $derived(contributionMode === 'demand' ? '% demand' : '% generation');
	/** One emissions unit for the whole column, sized to its largest value. */
	let emissionsPrefix = $derived(
		emissionsDisplayPrefix(Math.max(0, ...rows.map((row) => row.emissionsT ?? 0)))
	);
	let emissionsUnit = $derived(`${emissionsPrefix}tCO₂e`);

	/**
	 * Underlying fuel techs folded into a group — one label per tooltip line,
	 * limited to the techs actually present in the dataset. Empty when it
	 * would add nothing: the Detailed grouping, or a group that maps 1:1 onto
	 * the fuel tech it is named after (e.g. Pumps).
	 * @param {FuelTechTableRow} row
	 * @returns {string[]}
	 */
	function underlyingFuelTechs(row) {
		if (group === 'detailed') return [];
		const codes = row.fuelTechs;
		if (codes.length === 0 || (codes.length === 1 && codes[0] === row.id)) return [];
		return codes.map((code) => fuelTechNameMap[/** @type {FuelTechCode} */ (code)] ?? code);
	}

	/** @param {FuelTechTableRow} row @returns {ToggleRow} */
	function fuelTechRow(row) {
		return {
			key: row.id,
			label: row.label,
			active: !row.hidden,
			activate: (exclusive) => ontoggle?.(row.id, exclusive),
			swatch: { kind: 'solid', colour: row.colour },
			cells: [
				formatTablePower(row.avPowerMW, displayPrefix),
				formatTablePercentage(row.contributionPct),
				formatTablePrice(row.vwPrice),
				formatTableEmissions(row.emissionsT, emissionsPrefix),
				formatTableIntensity(row.intensityKgPerMWh)
			],
			breakdown: underlyingFuelTechs(row),
			dimmed: row.hidden,
			testId: 'fuel-tech-row'
		};
	}

	/** @param {CurtailmentTableRow} row @returns {ToggleRow} */
	function curtailmentRow(row) {
		return {
			key: row.id,
			label: row.label,
			active: shownCurtailment.includes(row.id),
			activate: (exclusive) => oncurtailmenttoggle?.(row.id, exclusive),
			swatch: { kind: 'hatch', colour: CURTAILMENT_COLOURS[row.id] ?? '#888' },
			cells: [
				formatTablePower(row.avPowerMW, displayPrefix),
				formatTablePercentage(row.contributionPct),
				EMPTY_CELL,
				EMPTY_CELL,
				EMPTY_CELL
			]
		};
	}

	/**
	 * @param {string} label
	 * @param {boolean} active
	 * @param {string} colour
	 * @param {((exclusive?: boolean) => void) | undefined} ontogglerow
	 * @param {number | null} avPowerMW
	 * @param {number | null} sharePct
	 * @returns {ToggleRow}
	 */
	function summaryRow(label, active, colour, ontogglerow, avPowerMW, sharePct) {
		return {
			key: label,
			label,
			active,
			activate: (exclusive) => ontogglerow?.(exclusive),
			swatch: { kind: 'line', colour },
			cells: [
				formatTablePower(avPowerMW, displayPrefix),
				formatTablePercentage(sharePct),
				EMPTY_CELL,
				EMPTY_CELL,
				EMPTY_CELL
			],
			summary: true
		};
	}

	let sourceRows = $derived(rows.filter((row) => !row.isLoad).map(fuelTechRow));
	let loadRows = $derived(rows.filter((row) => row.isLoad).map(fuelTechRow));
	let curtailmentToggleRows = $derived(curtailmentRows.map(curtailmentRow));
	let summaryRows = $derived(
		overlaySummary
			? [
					summaryRow(
						'Demand',
						showDemandLine,
						DEMAND_LINE_COLOUR,
						ondemandlinetoggle,
						overlaySummary.demandAvMW,
						null
					),
					summaryRow(
						'Renewables',
						showRenewablesLine,
						RENEWABLES_LINE_COLOUR,
						onrenewableslinetoggle,
						overlaySummary.renewablesAvMW,
						overlaySummary.renewablesSharePct
					)
				]
			: []
	);

	/** ⌘/Ctrl-activation solos a row instead of toggling it.
	 *  @param {MouseEvent | KeyboardEvent} event */
	function isExclusive(event) {
		return event.metaKey || event.ctrlKey;
	}

	/** @param {KeyboardEvent} event @param {ToggleRow} row */
	function activateOnKey(event, row) {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		row.activate(isExclusive(event));
	}

	/** Value cells dim while stale and mute the em dash for missing values.
	 *  The last column carries the table's right gutter.
	 *  @param {string} text @param {number} index @param {string} cellPad */
	function valueCellClass(text, index, cellPad) {
		return `${index === LAST_COLUMN ? 'pr-3 pl-2' : 'px-2'} ${cellPad} whitespace-nowrap text-right font-mono tabular-nums transition-opacity duration-300 ${
			text === EMPTY_CELL ? 'text-mid-grey' : 'text-dark-grey'
		} ${valuesPending ? 'opacity-40' : ''}`;
	}

	/** Diagonal hatch in the series colour — the curtailment swatch treatment.
	 * CSS gradient angles describe the gradient axis rather than the stripe,
	 * so -45deg matches OverlayArea's vertical SVG line rotated by 45deg.
	 * @param {string} colour */
	function hatchStyle(colour) {
		return `background: repeating-linear-gradient(-45deg, ${colour}, ${colour} 3px, rgba(255,255,255,0.6) 3px, rgba(255,255,255,0.6) 5px); border-color: ${colour};`;
	}

	// Sticky label cells need an opaque background so value cells slide under
	// them; the row hover has to be re-applied on the cell for the same reason.
	// A right rule separates the pinned column, and once the value columns have
	// scrolled behind it a soft shadow on that edge shows they continue. The
	// shadow is a flat horizontal gradient strip (not a box-shadow, which would
	// fade at each cell's top and bottom), so the cells' strips join into one
	// continuous band down the column. The sticky cell is positioned, so the
	// strip anchors to it and paints above the value cells sliding under.
	const PINNED_EDGE =
		'sticky left-0 z-[1] border-r border-warm-grey after:pointer-events-none after:absolute after:inset-y-0 after:left-full after:w-6 after:bg-linear-to-r after:from-black/5 after:to-transparent after:transition-opacity after:duration-200';
	let pinnedEdgeClass = $derived(
		`${PINNED_EDGE} ${scrollLeft > 0 ? 'after:opacity-100' : 'after:opacity-0'}`
	);
	let stickyLabelCell = $derived(`${pinnedEdgeClass} bg-white group-hover:bg-light-warm-grey`);
	const HEADER_CELL = 'border-b border-warm-grey py-3 align-top font-medium';
</script>

{#snippet swatch(/** @type {Swatch} */ { kind, colour }, /** @type {boolean} */ active)}
	{#if kind === 'line'}
		<!-- Line indicator — coloured when the overlay is on the chart. -->
		<span
			class="h-1 w-5 shrink-0 rounded-full transition-colors"
			style:background-color={active ? colour : '#d5d4d1'}
		></span>
	{:else if active}
		<!-- Solid in the series colour, or hatched for a curtailment band. -->
		<span
			class="size-5 shrink-0 rounded-sm border"
			style={kind === 'hatch'
				? hatchStyle(colour)
				: `background-color: ${colour}; border-color: ${colour};`}
		></span>
	{:else}
		<!-- Hollow when toggled off. -->
		<span
			class="size-5 shrink-0 rounded-sm border border-mid-warm-grey group-hover:border-mid-grey {kind ===
			'hatch'
				? 'bg-white'
				: 'bg-transparent'}"
		></span>
	{/if}
{/snippet}

{#snippet rowLabel(/** @type {ToggleRow} */ row)}
	{@const { main, sub } = splitTableLabel(row.label)}
	{@render swatch(row.swatch, row.active)}
	<span class="min-w-0 truncate text-dark-grey">
		{main}
		<span class="text-mid-grey">{sub}</span>
	</span>
{/snippet}

{#snippet toggleRow(/** @type {ToggleRow} */ row)}
	{@const cellPad = row.summary ? 'py-2' : 'py-1.5'}
	<tr
		data-testid={row.testId}
		onclick={(event) => row.activate(isExclusive(event))}
		onkeydown={(event) => activateOnKey(event, row)}
		role="button"
		tabindex="0"
		aria-pressed={row.active}
		class="group cursor-pointer text-sm hover:bg-light-warm-grey {row.summary
			? 'font-semibold'
			: ''} {row.dimmed ? 'opacity-50' : ''}"
	>
		<td class="{stickyLabelCell} px-2 {cellPad}">
			{#if row.breakdown?.length}
				<Tooltip lines={row.breakdown} side="left" class="ml-2 flex items-center gap-2.5">
					{@render rowLabel(row)}
				</Tooltip>
			{:else}
				<div class="ml-2 flex items-center gap-2.5">
					{@render rowLabel(row)}
				</div>
			{/if}
		</td>
		{#each row.cells as cell, index (index)}
			<td class={valueCellClass(cell, index, cellPad)}>{cell}</td>
		{/each}
	</tr>
{/snippet}

{#snippet section(/** @type {string} */ label, /** @type {ToggleRow[]} */ items)}
	{#if items.length}
		<thead>
			<tr>
				<th
					class="{pinnedEdgeClass} border-b border-warm-grey bg-white px-2 pb-1 pt-4 text-left text-sm font-medium"
				>
					<span class="ml-2">{label}</span>
				</th>
				<th class="border-b border-warm-grey" colspan={VALUE_COLUMNS.length}></th>
			</tr>
		</thead>
		<tbody>
			{#each items as row (row.key)}
				{@render toggleRow(row)}
			{/each}
		</tbody>
	{/if}
{/snippet}

{#snippet unitLine(/** @type {string} */ unit)}
	<span class="font-mono text-xxs font-light text-mid-grey">{unit}</span>
{/snippet}

<!-- Container-query root. `--tech-w` feeds both the pinned column's width and
     the scroller's snap padding so the two can never drift apart. -->
<div class="@container [--tech-w:160px]">
	<!-- Column tabs: the switcher and the scroll-position indicator in one.
	     Sticky so it survives vertical scrolling of the panel body; gone once
	     every column fits. -->
	<div
		role="group"
		aria-label="Table columns"
		class="sticky top-0 z-[2] flex justify-end border-b border-warm-grey bg-white px-2 py-1.5 @min-[660px]:hidden"
	>
		<div
			class="inline-flex items-center gap-0.5 rounded-md border border-mid-warm-grey/40 bg-light-warm-grey p-0.5"
		>
			{#each VALUE_COLUMNS as column, index (column.key)}
				<button
					type="button"
					aria-pressed={inView[index]}
					onclick={() => scrollToColumn(index)}
					class="cursor-pointer rounded px-2 py-1 font-space text-xxs text-mid-grey transition-colors hover:text-dark-grey aria-pressed:bg-white aria-pressed:text-dark-grey aria-pressed:shadow-sm"
				>
					{column.label}
				</button>
			{/each}
		</div>
	</div>

	<!-- Horizontal scroller. Snap padding reserves the pinned column, so a
	     snapped value column lands flush against it. Wide containers drop the
	     overflow, which also makes the sticky cells inert. -->
	<div
		bind:this={scroller}
		bind:clientWidth={scrollerWidth}
		onscroll={() => (scrollLeft = scroller?.scrollLeft ?? 0)}
		class="overflow-x-auto overscroll-x-contain snap-x snap-mandatory scroll-pl-(--tech-w) scroll-smooth motion-reduce:scroll-auto @min-[660px]:overflow-x-visible @min-[660px]:snap-none"
	>
		<!-- border-separate: sticky cells paint over collapsed borders, so the
		     rules live on the cells instead of the row groups. -->
		<table class="w-full table-fixed border-separate border-spacing-0 select-none">
			<thead class="bg-light-warm-grey">
				<tr>
					<th
						bind:this={techHeader}
						class="{pinnedEdgeClass} w-(--tech-w) bg-light-warm-grey px-2 text-left text-sm @min-[660px]:w-auto {HEADER_CELL}"
					>
						<div class="ml-2 flex flex-col items-start">
							<span class="text-xs text-dark-grey">Technology</span>
							{@render unitLine(groupLabel)}
						</div>
					</th>
					{#each VALUE_COLUMNS as column, index (column.key)}
						<th
							bind:this={valueHeaders[index]}
							class="{column.widthClass} snap-start text-right {index === LAST_COLUMN
								? 'pr-3 pl-2'
								: 'px-2'} {HEADER_CELL}"
						>
							<div class="flex flex-col items-end">
								<span class="text-xs">{column.label}</span>
								{#if column.key === 'contribution'}
									{@render unitLine(contributionUnit)}
								{:else if column.key === 'power'}
									{@render unitLine(powerUnit)}
								{:else if column.key === 'price'}
									{@render unitLine('$/MWh')}
								{:else if column.key === 'emissions'}
									{@render unitLine(emissionsUnit)}
								{:else}
									{@render unitLine('kgCO₂e/MWh')}
								{/if}
							</div>
						</th>
					{/each}
				</tr>
			</thead>

			{@render section('Sources', sourceRows)}
			{@render section('Loads', loadRows)}
			{@render section('Curtailment', curtailmentToggleRows)}

			{#if summaryRows.length}
				<tbody class="[&>tr:first-child>td]:border-t-2 [&>tr:first-child>td]:border-t-dark-grey">
					{#each summaryRows as row (row.key)}
						{@render toggleRow(row)}
					{/each}
				</tbody>
			{/if}
		</table>
	</div>

	<!-- Outside the table: a colspan footnote would scroll with the strip. -->
	<p class="m-0 px-4 py-3 text-[11px] leading-4 text-mid-grey">
		{#if contributionMode === 'demand'}
			Shares of gross demand needn't sum to 100% — losses and imports sit outside
			{basis === 'energy' ? 'generated energy' : 'generated power'}.
		{:else}
			Shares of source generation. Loads and imports are excluded from the base.
		{/if}
		Emissions intensity divides each technology's window emissions by its own generation.
	</p>
</div>
