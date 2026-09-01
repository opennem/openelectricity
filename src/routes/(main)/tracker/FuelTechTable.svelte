<script>
	import Tooltip from '$lib/components/ui/Tooltip.svelte';
	import FilterSelect from '$lib/components/filters/FilterSelect.svelte';
	import { GROUP_OPTIONS } from '$lib/components/charts/network/groups.js';
	import { DEFAULT_GROUP } from './tracker-model.js';
	import { fuelTechNameMap } from '$lib/fuel_techs.js';
	import { formatPrice } from '$lib/utils/formatters';
	import { formatSI } from '$lib/utils/si-units.js';

	/**
	 * FuelTechTable — the tracker's fuel-tech breakdown table. Four columns:
	 * technology, average power, contribution share and volume-weighted price,
	 * split into Sources/Loads sections in top-down stack order. Rows toggle
	 * the series' visibility in the charts; values are window aggregates
	 * computed upstream in `table-model.js`, so hidden rows keep their numbers.
	 * Outside the Detailed grouping, hovering a row's technology label lists
	 * the underlying fuel techs folded into that group.
	 *
	 * @type {{
	 *   rows: import('./types.js').FuelTechTableRow[],
	 *   valuesPending?: boolean,
	 *   basis?: 'power' | 'energy',
	 *   displayPrefix?: SiPrefix,
	 *   group?: string,
	 *   contributionMode?: import('./types.js').ContributionMode,
	 *   curtailmentRows?: Array<{ id: string, label: string, avPowerMW: number, contributionPct: number | null }>,
	 *   shownCurtailment?: string[],
	 *   curtailmentColours?: Record<string, string>,
	 *   oncurtailmenttoggle?: (id: string, exclusive?: boolean) => void,
	 *   overlaySummary?: { demandAvMW: number | null, renewablesAvMW: number | null, renewablesSharePct: number | null } | null,
	 *   showDemandLine?: boolean,
	 *   showRenewablesLine?: boolean,
	 *   demandLineColour?: string,
	 *   renewablesLineColour?: string,
	 *   ondemandlinetoggle?: (exclusive?: boolean) => void,
	 *   onrenewableslinetoggle?: (exclusive?: boolean) => void,
	 *   ongroupchange?: (group: string) => void,
	 *   oncontributionmodechange?: (mode: import('./types.js').ContributionMode) => void,
	 *   ontoggle?: (series: string, exclusive?: boolean) => void
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
		curtailmentColours = {},
		oncurtailmenttoggle,
		overlaySummary = null,
		showDemandLine = false,
		showRenewablesLine = false,
		demandLineColour = '#C74523',
		renewablesLineColour = '#52A972',
		ondemandlinetoggle,
		onrenewableslinetoggle,
		ongroupchange,
		oncontributionmodechange,
		ontoggle
	} = $props();

	/** Diagonal hatch in the series colour — the curtailment swatch treatment.
	 * @param {string} colour */
	function hatchStyle(colour) {
		return `background: repeating-linear-gradient(45deg, ${colour}, ${colour} 3px, rgba(255,255,255,0.6) 3px, rgba(255,255,255,0.6) 5px); border-color: ${colour};`;
	}

	const CONTRIBUTION_OPTIONS = [
		{ value: 'generation', label: '% generation' },
		{ value: 'demand', label: '% demand' }
	];

	let sourceRows = $derived(rows.filter((row) => !row.isLoad));
	let loadRows = $derived(rows.filter((row) => row.isLoad));
	let powerUnit = $derived(`${displayPrefix}W`);

	/** Dim stale values until the next complete snapshot is ready. */
	let valueCell = $derived(
		`text-right font-mono tabular-nums transition-opacity duration-300 ${
			valuesPending ? 'opacity-40' : ''
		}`
	);

	/**
	 * Underlying fuel techs folded into a group — one label per tooltip line,
	 * limited to the techs actually present in the dataset. Empty when it
	 * would add nothing: the Detailed grouping, or a group that maps 1:1 onto
	 * the fuel tech it is named after (e.g. Pumps).
	 * @param {import('./types.js').FuelTechTableRow} row
	 * @returns {string[]}
	 */
	function underlyingFuelTechs(row) {
		if (group === 'detailed') return [];
		const codes = row.fuelTechs;
		if (codes.length === 0 || (codes.length === 1 && codes[0] === row.id)) return [];
		return codes.map((code) => fuelTechNameMap[/** @type {FuelTechCode} */ (code)] ?? code);
	}

	/** @param {string} label */
	function mainLabel(label) {
		return label.split(' (')[0];
	}

	/** @param {string} label */
	function subLabel(label) {
		const parts = label.split(' (');
		return parts.length > 1 ? `(${parts.slice(1).join(' (')}` : '';
	}

	/** @param {number | null} value */
	function formatPct(value) {
		return value == null ? '—' : `${formatSI(value, { maximumFractionDigits: 1 })}%`;
	}

	/** Convert the table's native MW aggregates to the generation chart's
	 *  selected SI prefix while retaining their average-power meaning.
	 *  @param {number | null} value */
	function formatPower(value) {
		return value == null
			? '—'
			: formatSI(value, {
					fromPrefix: 'M',
					toPrefix: displayPrefix,
					maximumFractionDigits: displayPrefix === 'M' ? 1 : 2
				});
	}

	/** @param {number | null} value */
	function formatPriceCell(value) {
		return value == null ? '—' : formatPrice(value);
	}

	/** @param {KeyboardEvent} event @param {string} series */
	function handleRowKeydown(event, series) {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		ontoggle?.(series, event.metaKey || event.ctrlKey);
	}
</script>

{#snippet rowLabel(/** @type {(typeof rows)[number]} */ row)}
	<span
		class="size-5 shrink-0 rounded-sm border {row.hidden
			? 'border-mid-warm-grey bg-transparent group-hover:border-mid-grey'
			: ''}"
		style:background-color={row.hidden ? undefined : row.colour}
		style:border-color={row.hidden ? undefined : row.colour}
	></span>
	<span class="min-w-0 truncate text-dark-grey">
		{mainLabel(row.label)}
		<span class="text-mid-grey">{subLabel(row.label)}</span>
	</span>
{/snippet}

{#snippet tableRows(/** @type {typeof rows} */ items)}
	{#each items as row (row.id)}
		{@const breakdown = underlyingFuelTechs(row)}
		<tr
			data-testid="fuel-tech-row"
			onclick={(event) => ontoggle?.(row.id, event.metaKey || event.ctrlKey)}
			onkeydown={(event) => handleRowKeydown(event, row.id)}
			role="button"
			tabindex="0"
			aria-pressed={!row.hidden}
			class="group cursor-pointer text-sm hover:bg-light-warm-grey {row.hidden ? 'opacity-50' : ''}"
		>
			<td class="px-2 py-1.5">
				{#if breakdown.length}
					<Tooltip lines={breakdown} side="left" class="ml-2 flex items-center gap-2.5">
						{@render rowLabel(row)}
					</Tooltip>
				{:else}
					<div class="ml-2 flex items-center gap-2.5">
						{@render rowLabel(row)}
					</div>
				{/if}
			</td>
			<td class="px-2 py-1.5 text-dark-grey {valueCell}">
				{formatPower(row.avPowerMW)}
			</td>
			<td class="px-2 py-1.5 text-dark-grey {valueCell}">
				{formatPct(row.contributionPct)}
			</td>
			<td class="pr-3 pl-2 py-1.5 text-dark-grey {valueCell}">
				{formatPriceCell(row.vwPrice)}
			</td>
		</tr>
	{/each}
{/snippet}

{#snippet overlayRow(
	/** @type {string} */ label,
	/** @type {boolean} */ active,
	/** @type {string} */ colour,
	/** @type {((exclusive?: boolean) => void) | undefined} */ ontogglerow,
	/** @type {string} */ value,
	/** @type {string} */ pct
)}
	<tr
		onclick={(event) => ontogglerow?.(event.metaKey || event.ctrlKey)}
		onkeydown={(event) => {
			if (event.key !== 'Enter' && event.key !== ' ') return;
			event.preventDefault();
			ontogglerow?.(event.metaKey || event.ctrlKey);
		}}
		role="button"
		tabindex="0"
		aria-pressed={active}
		class="group cursor-pointer text-sm font-semibold hover:bg-light-warm-grey"
	>
		<td class="px-2 py-2">
			<div class="ml-2 flex items-center gap-2.5">
				<!-- Line indicator — coloured when the overlay is on the chart. -->
				<span
					class="h-1 w-5 shrink-0 rounded-full transition-colors"
					style:background-color={active ? colour : '#d5d4d1'}
				></span>
				<span class="text-dark-grey">{label}</span>
			</div>
		</td>
		<td class="px-2 py-2 text-dark-grey {valueCell}">{value}</td>
		<td class="px-2 py-2 text-dark-grey {valueCell}">{pct}</td>
		<td class="py-2 pr-3 pl-2 text-mid-grey {valueCell}">—</td>
	</tr>
{/snippet}

{#snippet sectionHead(/** @type {string} */ label)}
	<thead>
		<tr>
			<th class="border-b border-warm-grey px-2 pb-1 pt-4 text-left text-sm font-medium">
				<span class="ml-2">{label}</span>
			</th>
			<th class="border-b border-warm-grey" colspan="3"></th>
		</tr>
	</thead>
{/snippet}

<table class="w-full table-fixed select-none">
	<thead class="border-b border-warm-grey bg-light-warm-grey">
		<tr>
			<th class="w-[40%] px-2 py-3 text-left align-top text-sm font-medium">
				<div class="ml-2 flex flex-col items-start gap-1.5">
					<span class="text-dark-grey">Technology</span>
					<FilterSelect
						selected={group}
						options={GROUP_OPTIONS}
						listLabel="Fuel tech grouping"
						defaultValue={DEFAULT_GROUP}
						compact
						onchange={(value) => ongroupchange?.(value)}
					/>
				</div>
			</th>
			<th class="px-2 py-3 text-right align-top font-medium">
				<div class="flex flex-col items-end">
					<span class="text-xs">Av power</span>
					<span class="font-mono text-xxs font-light text-mid-grey">{powerUnit}</span>
				</div>
			</th>
			<th class="px-2 py-3 text-right align-top font-medium">
				<div class="flex flex-col items-end gap-1.5">
					<span class="text-xs">Contribution</span>
					<FilterSelect
						selected={contributionMode}
						options={CONTRIBUTION_OPTIONS}
						listLabel="Contribution basis"
						defaultValue="generation"
						compact
						onchange={(value) =>
							oncontributionmodechange?.(
								/** @type {import('./types.js').ContributionMode} */ (value)
							)}
					/>
				</div>
			</th>
			<th class="pr-3 pl-2 py-3 text-right align-top font-medium">
				<div class="flex flex-col items-end">
					<span class="text-xs">Av price</span>
					<span class="font-mono text-xxs font-light text-mid-grey">$/MWh</span>
				</div>
			</th>
		</tr>
	</thead>

	{#if sourceRows.length}
		{@render sectionHead('Sources')}
		<tbody>{@render tableRows(sourceRows)}</tbody>
	{/if}

	{#if loadRows.length}
		{@render sectionHead('Loads')}
		<tbody>{@render tableRows(loadRows)}</tbody>
	{/if}

	{#if curtailmentRows.length}
		{@render sectionHead('Curtailment')}
		<tbody>
			{#each curtailmentRows as row (row.id)}
				{@const shown = shownCurtailment.includes(row.id)}
				<tr
					onclick={(event) => oncurtailmenttoggle?.(row.id, event.metaKey || event.ctrlKey)}
					onkeydown={(event) => {
						if (event.key !== 'Enter' && event.key !== ' ') return;
						event.preventDefault();
						oncurtailmenttoggle?.(row.id, event.metaKey || event.ctrlKey);
					}}
					role="button"
					tabindex="0"
					aria-pressed={shown}
					class="group cursor-pointer text-sm hover:bg-light-warm-grey"
				>
					<td class="px-2 py-1.5">
						<div class="ml-2 flex items-center gap-2.5">
							<!-- Hollow when off; hatched in the series colour when the band
							     is shown on the generation chart. -->
							<span
								class="size-5 shrink-0 rounded-sm border {shown
									? ''
									: 'border-mid-warm-grey bg-white group-hover:border-mid-grey'}"
								style={shown ? hatchStyle(curtailmentColours[row.id] ?? '#888') : undefined}
							></span>
							<span class="min-w-0 truncate text-dark-grey">
								{mainLabel(row.label)}
								<span class="text-mid-grey">{subLabel(row.label)}</span>
							</span>
						</div>
					</td>
					<td class="px-2 py-1.5 text-dark-grey {valueCell}">
						{formatPower(row.avPowerMW)}
					</td>
					<td class="px-2 py-1.5 text-dark-grey {valueCell}">
						{formatPct(row.contributionPct)}
					</td>
					<td class="py-1.5 pr-3 pl-2 text-mid-grey {valueCell}">—</td>
				</tr>
			{/each}
		</tbody>
	{/if}

	{#if overlaySummary}
		<tbody class="border-t-2 border-dark-grey">
			{@render overlayRow(
				'Demand',
				showDemandLine,
				demandLineColour,
				ondemandlinetoggle,
				formatPower(overlaySummary.demandAvMW),
				'—'
			)}
			{@render overlayRow(
				'Renewables',
				showRenewablesLine,
				renewablesLineColour,
				onrenewableslinetoggle,
				formatPower(overlaySummary.renewablesAvMW),
				formatPct(overlaySummary.renewablesSharePct)
			)}
		</tbody>
	{/if}
	<tfoot>
		<tr>
			<td colspan="4" class="px-4 py-3 text-[11px] leading-4 text-mid-grey">
				{#if contributionMode === 'demand'}
					Shares of gross demand needn't sum to 100% — losses and imports sit outside
					{basis === 'energy' ? 'generated energy' : 'generated power'}.
				{:else}
					Shares of source generation. Loads and imports are excluded from the base.
				{/if}
			</td>
		</tr>
	</tfoot>
</table>
