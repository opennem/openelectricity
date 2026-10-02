<script>
	import {
		TABLE_HEADER_CELL,
		TABLE_ROW,
		TABLE_SWATCH,
		focusEdges,
		pinnedTableEdge,
		tableValueCell
	} from './table-styles.js';
	import { TABLE_COLUMNS, DEFAULT_TABLE_COLUMNS } from './table-columns.js';
	import { ChevronDown } from '@lucide/svelte';
	import Tooltip from '$lib/components/ui/Tooltip.svelte';
	import FilterSelect from '$lib/components/filters/FilterSelect.svelte';
	import { getGroup, GROUP_OPTIONS } from '$lib/components/charts/network/groups.js';
	import { fuelTechNameMap } from '$lib/fuel_techs.js';
	import { CONTRIBUTION_OPTIONS, DEFAULT_GROUP, contributionLabel } from './tracker-model.js';
	import { TABLE_UNIT_CYCLES, nextTableUnitPrefix } from './table-units.js';
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
	/** @typedef {import('./types.js').ContributionMode} ContributionMode */
	/** @typedef {import('./table-units.js').TableUnitKey} TableUnitKey */

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
	 * @property {string[]} cells - One formatted value per column: each
	 *   `TABLE_COLUMNS` entry, or each `powerColumns` entry when given
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
	 * techs folded into that group. The headers echo the grouping, contribution
	 * basis and units as sub-labels and change them in place: Technology opens
	 * the grouping menu, Contribution toggles its basis, and the scalable value
	 * columns step through their SI prefixes (`table-units.js`). Price has a
	 * single unit, so its header is static. The options dialog offers the
	 * grouping and basis too.
	 *
	 * A view can replace the window columns with its own average-power columns
	 * (`powerColumns`, filled from each row's `powerValues` in the Av power
	 * unit): the Profile's percentile range, or the day-by-day styles' days. A view can
	 * also highlight one row (`focusRow`) as if hovered: the technology whose
	 * Profile breakdown card is under the pointer, and its columns
	 * (`focusColumns`): the hovered day, or a percentile band's bounds. Focused
	 * rows and columns are outlined, and the cells where they meet read white
	 * on OE red.
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
		powerColumns = undefined,
		focusColumns = [],
		focusRow = undefined,
		notes = [],
		tableUnits = {},
		curtailmentRows = [],
		shownCurtailment = [],
		overlaySummary = null,
		showDemandLine = false,
		showRenewablesLine = false,
		ontoggle,
		ongroupchange,
		oncontributionchange,
		onunitchange,
		oncurtailmenttoggle,
		ondemandlinetoggle,
		onrenewableslinetoggle
	} = $props();

	let scrollLeft = $state(0);
	let scroller = $state(/** @type {HTMLDivElement | undefined} */ (undefined));
	// Bring the focused columns (a hovered day, or a percentile band's bounds)
	// into view beside the pinned Technology column: a DOM side effect, so an
	// effect. The scroller's own snapping and `scroll-smooth` (off under
	// reduced motion) do the rest.
	$effect(() => {
		const keys = focusColumns;
		if (!keys.length || !scroller) return;
		/** @param {string} key */
		const headerFor = (key) => scroller?.querySelector(`th[data-column="${CSS.escape(key)}"]`);
		const first = headerFor(keys[0]);
		const last = headerFor(keys[keys.length - 1]);
		const pinned = scroller.querySelector('th');
		if (
			!(first instanceof HTMLElement) ||
			!(last instanceof HTMLElement) ||
			!(pinned instanceof HTMLElement)
		)
			return;
		const left = first.offsetLeft - pinned.offsetWidth;
		const right = last.offsetLeft + last.offsetWidth;
		if (left < scroller.scrollLeft || right > scroller.scrollLeft + scroller.clientWidth)
			scroller.scrollTo({ left });
	});

	/** The prefix each scalable column renders in: the header's choice, else
	 *  its default. Av power follows the chart's MW/GW choice while the chart
	 *  shows power, and stays in MW otherwise. Energy sizes its own prefix from
	 *  the table's largest value, independently of the chart's selected prefix.
	 *  @type {Record<TableUnitKey, SiPrefix>} */
	let prefixes = $derived({
		energy:
			tableUnits.energy ??
			energyDisplayPrefix(Math.max(0, ...rows.map((row) => row.energyMWh ?? 0))),
		power: tableUnits.power ?? (basis === 'power' ? displayPrefix : 'M'),
		emissions: tableUnits.emissions ?? '',
		intensity: tableUnits.intensity ?? 'k'
	});
	let groupLabel = $derived(getGroup(group).label);

	/**
	 * A value column's header sub-label and, when the header cycles, the label
	 * it moves to and how. Without the matching callback the header is static.
	 * @param {string} key
	 * @returns {{ unit: string, nextUnit?: string, cycle?: () => void }}
	 */
	function columnHeader(key) {
		if (key === 'price') return { unit: '$/MWh' };
		if (key === 'contribution') {
			const index = CONTRIBUTION_OPTIONS.findIndex((option) => option.value === contributionMode);
			const next = /** @type {ContributionMode} */ (
				CONTRIBUTION_OPTIONS[(index + 1) % CONTRIBUTION_OPTIONS.length].value
			);
			return {
				unit: contributionLabel(contributionMode),
				nextUnit: contributionLabel(next),
				cycle: oncontributionchange && (() => oncontributionchange(next))
			};
		}
		const unitKey = /** @type {TableUnitKey} */ (key);
		const { label } = TABLE_UNIT_CYCLES[unitKey];
		const next = nextTableUnitPrefix(unitKey, prefixes[unitKey]);
		return {
			unit: label(prefixes[unitKey]),
			nextUnit: label(next),
			cycle: onunitchange && (() => onunitchange(unitKey, next))
		};
	}

	/** The viewer-selectable window columns `tableColumns` picks from, or a
	 *  view's own average-power columns, which share Av power's unit and cycle. */
	let visibleColumns = $derived(
		powerColumns
			? powerColumns.map((column, index) => ({ ...column, index, ...columnHeader('power') }))
			: TABLE_COLUMNS.map((column, index) => ({
					...column,
					index,
					...columnHeader(column.key)
				})).filter((column) => tableColumns.includes(column.key))
	);
	/**
	 * Each visible column's place in the focus: whether it is focused, and
	 * whether the outline closes on its left or right — adjacent focused
	 * columns (a percentile band's two bounds) outline as one block.
	 */
	let columnFocus = $derived(
		visibleColumns.map((_, index) => {
			/** @param {number} i */
			const on = (i) => i >= 0 && focusColumns.includes(visibleColumns[i]?.key);
			const focused = on(index);
			return { focused, left: focused && !on(index - 1), right: focused && !on(index + 1) };
		})
	);
	/** Cells for a row the view's own columns have no value for. */
	let emptyCells = $derived((powerColumns ?? TABLE_COLUMNS).map(() => EMPTY_CELL));
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
			cells: powerColumns
				? powerColumns.map(({ key }) =>
						formatTablePower(row.powerValues?.[key] ?? null, prefixes.power)
					)
				: [
						formatTableEnergy(row.energyMWh, prefixes.energy),
						formatTablePower(row.avPowerMW, prefixes.power),
						formatTablePercentage(row.contributionPct),
						formatTablePrice(row.vwPrice),
						formatTableEmissions(row.emissionsT, prefixes.emissions),
						formatTableIntensity(row.intensityKgPerMWh, prefixes.intensity)
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
			cells: powerColumns
				? emptyCells
				: [
						formatTableEnergy(row.energyMWh, prefixes.energy),
						formatTablePower(row.avPowerMW, prefixes.power),
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
			cells: powerColumns
				? emptyCells
				: [
						formatTableEnergy(energyMWh, prefixes.energy),
						formatTablePower(avPowerMW, prefixes.power),
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

	/** The table's bottom row, where a focused column's outline closes. */
	let lastRowKey = $derived(
		[...sourceRows, ...loadRows, ...curtailmentToggleRows, ...summaryRows].at(-1)?.key
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

	/** Header controls keep their text where the static labels sit: the
	 *  negative margins cancel the hover padding. */
	const HEADER_BUTTON =
		'-my-1 inline-flex cursor-pointer rounded-md px-1.5 py-1 transition-colors hover:bg-warm-grey focus-visible:outline focus-visible:outline-2 focus-visible:outline-dark-grey motion-reduce:transition-none';
	/** @param {boolean} focused */
	const stickyLabelCell = (focused) =>
		`${pinnedEdgeClass} ${focused ? 'bg-light-warm-grey' : 'bg-white group-hover:bg-light-warm-grey'}`;
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
	{@const focused = row.key === focusRow}
	<tr
		data-testid={row.testId}
		onclick={(event) => row.activate(isExclusive(event))}
		onkeydown={(event) => activateOnKey(event, row)}
		role="button"
		tabindex="0"
		aria-pressed={row.active}
		aria-describedby={row.interpolated ? 'rooftop-interpolation-note' : undefined}
		class="{TABLE_ROW} {row.summary ? 'font-semibold' : ''} {row.dimmed
			? 'opacity-50'
			: ''} {focused ? 'bg-light-warm-grey' : ''}"
	>
		<td
			class="{stickyLabelCell(focused)} px-2 {cellPad}"
			style:box-shadow={focusEdges({
				top: focused,
				bottom: focused,
				left: focused,
				right: focused && !visibleColumns.length
			})}
		>
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
			{@const columnFocused = columnFocus[index]}
			{@const last = index === visibleColumns.length - 1}
			<td
				class="{tableValueCell(
					cell,
					last,
					cellPad,
					columnFocused.focused && focused
				)} {columnFocused.focused && !focused ? 'bg-light-warm-grey' : ''}"
				style:box-shadow={focusEdges({
					top: focused,
					bottom: focused || (columnFocused.focused && row.key === lastRowKey),
					left: columnFocused.left,
					right: columnFocused.right || (focused && last)
				})}
			>
				{cell}
			</td>
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
				<!-- One cell per column, so a focused column's outline runs through. -->
				{#each visibleColumns as column, index (column.key)}
					<th
						class="border-b border-warm-grey"
						style:box-shadow={focusEdges({
							left: columnFocus[index].left,
							right: columnFocus[index].right
						})}
					></th>
				{/each}
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

{#snippet technologyHeading()}
	<span class="text-xs text-dark-grey">Technology</span>
	{@render unitLine(groupLabel)}
{/snippet}

<!-- The minimum width follows the selected columns; Technology stays pinned. -->
<div class="[--tech-w:160px]">
	<!-- Horizontal scroller. Snap padding reserves the pinned column, so a
	     snapped value column lands flush against it. The table expands to fill wider panels. -->
	<div
		bind:this={scroller}
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
						{#if ongroupchange}
							<FilterSelect
								selected={group}
								options={GROUP_OPTIONS}
								listLabel="Fuel tech grouping"
								onchange={ongroupchange}
							>
								{#snippet trigger({ open, toggle })}
									<button
										type="button"
										onclick={toggle}
										aria-haspopup="listbox"
										aria-expanded={open}
										title="Change fuel tech grouping"
										class="{HEADER_BUTTON} ml-0.5 items-start gap-1"
									>
										<span class="flex flex-col items-start">{@render technologyHeading()}</span>
										<ChevronDown
											class="mt-0.5 size-3 text-mid-grey transition-transform motion-reduce:transition-none {open
												? 'rotate-180'
												: ''}"
											aria-hidden="true"
										/>
									</button>
								{/snippet}
							</FilterSelect>
						{:else}
							<div class="ml-2 flex flex-col items-start">{@render technologyHeading()}</div>
						{/if}
					</th>
					{#each visibleColumns as column, index (column.key)}
						<th
							data-column={column.key}
							class="w-[100px] snap-start text-right transition-colors {index ===
							visibleColumns.length - 1
								? 'pr-3 pl-2'
								: 'px-2'} {columnFocus[index].focused ? 'bg-warm-grey' : ''} {TABLE_HEADER_CELL}"
							style:box-shadow={focusEdges({
								top: columnFocus[index].focused,
								left: columnFocus[index].left,
								right: columnFocus[index].right
							})}
						>
							{#if column.cycle}
								<button
									type="button"
									onclick={column.cycle}
									title={`Show ${column.nextUnit}`}
									class="{HEADER_BUTTON} -mr-1.5 flex-col items-end"
								>
									<span class="text-xs">{column.label}</span>
									{@render unitLine(column.unit)}
								</button>
							{:else}
								<div class="flex flex-col items-end">
									<span class="text-xs">{column.label}</span>
									{@render unitLine(column.unit)}
								</div>
							{/if}
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
			{#each notes as note (note)}
				<li>{note}</li>
			{/each}
		</ul>
	</footer>
</div>
