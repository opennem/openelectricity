<script>
	import {
		TABLE_HEADER_CELL,
		TABLE_ROW,
		TABLE_SWATCH,
		pinnedTableEdge,
		tableValueCell
	} from './table-styles.js';
	import { TABLE_COLUMNS, DEFAULT_TABLE_COLUMNS } from './table-columns.js';
	import Tooltip from '$lib/components/ui/Tooltip.svelte';
	import { getGroup } from '$lib/components/charts/network/groups.js';
	import { fuelTechNameMap } from '$lib/fuel_techs.js';
	import { DEFAULT_GROUP, contributionLabel } from './tracker-model.js';
	import {
		CURTAILMENT_COLOURS,
		DEMAND_LINE_COLOUR,
		RENEWABLES_LINE_COLOUR
	} from './tracker-overlays.js';
	import {
		EMPTY_CELL,
		energyDisplayPrefix,
		formatTableEmissions,
		formatTableEnergy,
		formatTableIntensity,
		formatTablePercentage,
		formatTablePower,
		formatTablePrice,
		splitTableLabel
	} from './table-format.js';

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
	 * @property {string[]} cells - One formatted value per `TABLE_COLUMNS` entry
	 * @property {string[]} [breakdown] - Tooltip lines listing the folded fuel techs
	 * @property {boolean} [dimmed] - Fade the whole row while toggled off
	 * @property {boolean} [summary] - Bold summary treatment for the overlay rows
	 * @property {string} [testId]
	 * @property {boolean} [interpolated]
	 */

	/**
	 * FuelTechTable — the tracker's fuel-tech breakdown table. Technology plus
	 * six selectable value columns: energy, average power, contribution share,
	 * volume-weighted price, emissions and emissions intensity, split into Sources/Loads
	 * sections in top-down stack order, followed by curtailment and the
	 * Demand/Renewables summary rows. Every row toggles its series on the
	 * charts; values are window aggregates or the inspected interval, computed upstream in
	 * `table-model.js`, so hidden rows keep their numbers. Outside the Detailed
	 * grouping, hovering a row's technology label lists the underlying fuel
	 * techs folded into that group. The grouping and contribution basis are
	 * chosen in the options dialog; the headers echo them as sub-labels.
	 *
	 * In narrow panels, Technology pins left while the value columns scroll
	 * horizontally and snap into place. The table fills the panel when its visible columns fit.
	 *
	 * @type {import('./types.js').FuelTechTableControls & {
	 *   rows: FuelTechTableRow[],
	 *   curtailmentRows?: CurtailmentTableRow[],
	 *   overlaySummary?: OverlaySummary | null,
	 *   rooftopInterpolation?: boolean
	 * }}
	 */
	let {
		rows,
		basis = 'power',
		rooftopInterpolation = false,
		displayPrefix = 'M',
		group = DEFAULT_GROUP,
		contributionMode = 'demand',
		tableColumns = DEFAULT_TABLE_COLUMNS,
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

	let visibleColumns = $derived(
		TABLE_COLUMNS.map((column, index) => ({ ...column, index })).filter((column) =>
			tableColumns.includes(column.key)
		)
	);
	let scrollLeft = $state(0);

	/** Av power follows the chart's MW/GW choice while the chart shows power,
	 *  and stays in MW otherwise. Energy always sizes its own prefix from the
	 *  table's largest value, independently of the chart's selected prefix. */
	let powerPrefix = $derived(basis === 'power' ? displayPrefix : 'M');
	let energyPrefix = $derived(
		energyDisplayPrefix(Math.max(0, ...rows.map((row) => row.energyMWh ?? 0)))
	);
	let powerUnit = $derived(`${powerPrefix}W`);
	let energyUnit = $derived(`${energyPrefix}Wh`);
	let groupLabel = $derived(getGroup(group).label);
	let contributionUnit = $derived(contributionLabel(contributionMode));
	let showRooftopNote = $derived(
		rooftopInterpolation && rows.some((row) => row.fuelTechs.includes('solar_rooftop'))
	);

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
				formatTableEnergy(row.energyMWh, energyPrefix),
				formatTablePower(row.avPowerMW, powerPrefix),
				formatTablePercentage(row.contributionPct),
				formatTablePrice(row.vwPrice),
				formatTableEmissions(row.emissionsT),
				formatTableIntensity(row.intensityKgPerMWh)
			],
			breakdown: underlyingFuelTechs(row),
			interpolated: rooftopInterpolation && row.fuelTechs.includes('solar_rooftop'),
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
				formatTableEnergy(row.energyMWh, energyPrefix),
				formatTablePower(row.avPowerMW, powerPrefix),
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
	 * @param {number | null} energyMWh
	 * @param {number | null} avPowerMW
	 * @param {number | null} sharePct
	 * @returns {ToggleRow}
	 */
	function summaryRow(label, active, colour, ontogglerow, energyMWh, avPowerMW, sharePct) {
		return {
			key: label,
			label,
			active,
			activate: (exclusive) => ontogglerow?.(exclusive),
			swatch: { kind: 'line', colour },
			cells: [
				formatTableEnergy(energyMWh, energyPrefix),
				formatTablePower(avPowerMW, powerPrefix),
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
						overlaySummary.demandEnergyMWh,
						overlaySummary.demandAvMW,
						null
					),
					summaryRow(
						'Renewables',
						showRenewablesLine,
						RENEWABLES_LINE_COLOUR,
						onrenewableslinetoggle,
						overlaySummary.renewablesEnergyMWh,
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
	let pinnedEdgeClass = $derived(pinnedTableEdge(scrollLeft));
	let stickyLabelCell = $derived(`${pinnedEdgeClass} bg-white group-hover:bg-light-warm-grey`);
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
			class={TABLE_SWATCH}
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
		aria-describedby={row.interpolated ? 'rooftop-interpolation-note' : undefined}
		class="{TABLE_ROW} {row.summary ? 'font-semibold' : ''} {row.dimmed ? 'opacity-50' : ''}"
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
		{#each visibleColumns as column, index (column.key)}
			{@const cell = row.cells[column.index]}
			<td class={tableValueCell(cell, index === visibleColumns.length - 1, cellPad)}>{cell}</td>
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
				{#if visibleColumns.length}<th
						class="border-b border-warm-grey"
						colspan={visibleColumns.length}
					></th>{/if}
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

<!-- The minimum width follows the selected columns; Technology stays pinned. -->
<div class="[--tech-w:160px]">
	<!-- Horizontal scroller. Snap padding reserves the pinned column, so a
	     snapped value column lands flush against it. The table expands to fill wider panels. -->
	<div
		onscroll={(event) => (scrollLeft = event.currentTarget.scrollLeft)}
		class="overflow-x-auto overscroll-x-contain snap-x snap-mandatory scroll-pl-(--tech-w) scroll-smooth motion-reduce:scroll-auto"
	>
		<!-- border-separate: sticky cells paint over collapsed borders, so the
		     rules live on the cells instead of the row groups. -->
		<table
			aria-label="Fuel technology values"
			style:min-width={`${160 + visibleColumns.length * 100}px`}
			class="w-full table-fixed border-separate border-spacing-0 select-none"
		>
			<thead class="bg-light-warm-grey">
				<tr>
					<th
						class="{pinnedEdgeClass} bg-light-warm-grey px-2 text-left text-sm {TABLE_HEADER_CELL}"
					>
						<div class="ml-2 flex flex-col items-start">
							<span class="text-xs text-dark-grey">Technology</span>
							{@render unitLine(groupLabel)}
						</div>
					</th>
					{#each visibleColumns as column, index (column.key)}
						<th
							class="w-[100px] snap-start text-right {index === visibleColumns.length - 1
								? 'pr-3 pl-2'
								: 'px-2'} {TABLE_HEADER_CELL}"
						>
							<div class="flex flex-col items-end">
								<span class="text-xs">{column.label}</span>
								{#if column.key === 'contribution'}
									{@render unitLine(contributionUnit)}
								{:else if column.key === 'energy'}
									{@render unitLine(energyUnit)}
								{:else if column.key === 'power'}
									{@render unitLine(powerUnit)}
								{:else if column.key === 'price'}
									{@render unitLine('$/MWh')}
								{:else if column.key === 'emissions'}
									{@render unitLine('tCO₂e')}
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
	<footer
		class="m-4 rounded-md border border-dashed border-mid-warm-grey bg-light-warm-grey px-4 py-3 text-[11px] leading-relaxed text-mid-grey"
	>
		<ul class="m-0 list-disc space-y-2 pl-4">
			{#if showRooftopNote}
				<li id="rooftop-interpolation-note">
					Rooftop solar: 5-minute charts use linearly interpolated half-hour readings. Tables,
					metrics, comparisons and exports retain reported values.
				</li>
			{/if}
			<li>
				{#if contributionMode === 'demand'}
					Gross-demand shares may not total 100% due to losses and imports.
				{:else}
					Generation shares exclude loads and imports.
				{/if}
			</li>
			<li>Emissions intensity: each technology's emissions divided by its generation.</li>
		</ul>
	</footer>
</div>
