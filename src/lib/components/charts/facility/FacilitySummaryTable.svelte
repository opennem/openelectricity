<script>
	/**
	 * FacilitySummaryTable - Per-unit summary statistics for the visible time range
	 *
	 * Shows aggregated energy, capacity factor, market value, and average value
	 * for each unit in the facility, plus a totals row.
	 */

	import { getNumberFormat } from '$lib/utils/formatters';

	const formatter0 = getNumberFormat(0);
	const formatter1 = getNumberFormat(1);
	const formatter2 = getNumberFormat(2);

	/**
	 * @typedef {Object} Props
	 * @property {any} facility - Facility object with `units` array (each unit has `code`, `fueltech_id`, `capacity_registered`)
	 * @property {Array<Record<string, any>>} mvData - Array of market_value rows
	 * @property {Array<Record<string, any>>} energyData - Array of energy rows
	 * @property {string[]} mvSeriesNames - Market value series keys
	 * @property {string[]} energySeriesNames - Energy series keys
	 * @property {Record<string, string>} unitColours - Mapping of unit code to hex colour
	 * @property {string} timeZone - Timezone offset string like '+10:00'
	 * @property {import('$lib/components/charts/v2/ChartStore.svelte.js').default} mvChartStore - Market value chart store for value formatting
	 */

	/** @type {Props} */
	let {
		facility,
		mvData,
		energyData,
		mvSeriesNames,
		energySeriesNames,
		unitColours,
		timeZone,
		mvChartStore
	} = $props();

	/**
	 * Extract unit code from a series name by stripping the metric prefix
	 * @param {string} seriesName
	 * @param {string} prefix
	 * @returns {string}
	 */
	function extractUnitCode(seriesName, prefix) {
		return seriesName.startsWith(prefix) ? seriesName.slice(prefix.length) : seriesName;
	}

	/**
	 * Sum all numeric values for a given key across an array of rows
	 * @param {Array<Record<string, any>>} rows
	 * @param {string} key
	 * @returns {number}
	 */
	function sumSeries(rows, key) {
		let total = 0;
		for (const row of rows) {
			const val = row[key];
			if (typeof val === 'number' && !isNaN(val)) total += val;
		}
		return total;
	}

	/**
	 * Calculate the number of hours spanned by the data range
	 * @param {Array<Record<string, any>>} rows
	 * @returns {number}
	 */
	function getHoursInRange(rows) {
		if (!rows.length) return 0;
		const firstTime = rows[0].time;
		const lastTime = rows[rows.length - 1].time;
		return (lastTime - firstTime) / 3_600_000;
	}

	let hoursInRange = $derived(getHoursInRange(energyData));

	/** Map from unit code to facility unit object */
	let unitMap = $derived.by(() => {
		/** @type {Record<string, any>} */
		const map = {};
		for (const unit of facility?.units || []) {
			map[unit.code] = unit;
		}
		return map;
	});

	let unitCodes = $derived(energySeriesNames.map((name) => extractUnitCode(name, 'energy_')));

	/**
	 * @typedef {Object} UnitSummary
	 * @property {string} code
	 * @property {number} regCap
	 * @property {number} energy
	 * @property {number} capFactor
	 * @property {number} marketValue
	 * @property {number} avgValue
	 * @property {string} colour
	 */

	/** @type {UnitSummary[]} */
	let unitSummaries = $derived.by(() => {
		return unitCodes.map((code) => {
			const unit = unitMap[code];
			const regCap = unit?.capacity_registered ?? 0;

			const energy = sumSeries(energyData, `energy_${code}`);
			const marketValue = sumSeries(mvData, `market_value_${code}`);

			const capFactor =
				regCap > 0 && hoursInRange > 0 ? (energy / (regCap * hoursInRange)) * 100 : 0;
			const avgValue = energy !== 0 ? marketValue / energy : 0;
			const colour = unitColours[code] || '#888888';

			return { code, regCap, energy, capFactor, marketValue, avgValue, colour };
		});
	});

	let totals = $derived.by(() => {
		let regCap = 0;
		let energy = 0;
		let marketValue = 0;

		for (const s of unitSummaries) {
			regCap += s.regCap;
			energy += s.energy;
			marketValue += s.marketValue;
		}

		const capFactor =
			regCap > 0 && hoursInRange > 0 ? (energy / (regCap * hoursInRange)) * 100 : 0;
		const avgValue = energy !== 0 ? marketValue / energy : 0;

		return { regCap, energy, capFactor, marketValue, avgValue };
	});

	/** Display unit from chart store (e.g. 'k$') */
	let mvDisplayUnit = $derived(mvChartStore?.chartOptions?.displayUnit ?? '$');

	/**
	 * Format market value using chart store's SI conversion
	 * Produces $x,xxxk format
	 * @param {number} value
	 * @returns {string}
	 */
	function formatMarketValue(value) {
		if (isNaN(value)) return '—';
		return '$' + mvChartStore.convertAndFormatValue(value) + mvChartStore.chartOptions.displayPrefix;
	}

	/**
	 * Format price/average value in $/MWh
	 * Produces $x,xxx format
	 * @param {number} value
	 * @returns {string}
	 */
	function formatPrice(value) {
		if (isNaN(value)) return '—';
		return '$' + formatter0.format(value);
	}
</script>

<div>
	<table class="w-full text-xs border-collapse">
		<thead class="sticky top-0 z-10 bg-white">
			<tr class="border-b border-mid-warm-grey">
				<th class="text-left font-medium text-mid-grey px-2 py-1.5 whitespace-nowrap">Unit</th>
				<th class="text-right font-medium text-mid-grey px-2 py-1.5 whitespace-nowrap">
					Reg. Cap (MW)
				</th>
				<th class="text-right font-medium text-mid-grey px-2 py-1.5 whitespace-nowrap">
					Energy (MWh)
				</th>
				<th class="text-right font-medium text-mid-grey px-2 py-1.5 whitespace-nowrap">
					Cap. Factor
				</th>
				<th class="text-right font-medium text-mid-grey px-2 py-1.5 whitespace-nowrap">
					Market Value ({mvDisplayUnit})
				</th>
				<th class="text-right font-medium text-mid-grey px-2 py-1.5 whitespace-nowrap">
					Av. Value ($/MWh)
				</th>
			</tr>
		</thead>

		<tbody>
			{#each unitSummaries as row (row.code)}
				<tr class="border-b border-light-warm-grey hover:bg-light-warm-grey/30 transition-colors">
					<td class="px-2 py-1 whitespace-nowrap">
						<span class="inline-flex items-center gap-1.5">
							<span
								class="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
								style="background-color: {row.colour};"
							></span>
							<span class="font-mono text-dark-grey">{row.code}</span>
						</span>
					</td>
					<td class="px-2 py-1 text-right text-dark-grey tabular-nums whitespace-nowrap">
						{formatter0.format(row.regCap)}
					</td>
					<td class="px-2 py-1 text-right text-dark-grey tabular-nums whitespace-nowrap">
						{formatter0.format(row.energy)}
					</td>
					<td class="px-2 py-1 text-right text-dark-grey tabular-nums whitespace-nowrap">
						{formatter1.format(row.capFactor)}%
					</td>
					<td class="px-2 py-1 text-right text-dark-grey tabular-nums whitespace-nowrap">
						{formatMarketValue(row.marketValue)}
					</td>
					<td class="px-2 py-1 text-right text-dark-grey tabular-nums whitespace-nowrap">
						{formatPrice(row.avgValue)}
					</td>
				</tr>
			{/each}
		</tbody>

		<tfoot>
			<tr class="border-t border-mid-warm-grey bg-light-warm-grey/50 font-medium">
				<td class="px-2 py-1.5 text-mid-grey whitespace-nowrap">Total</td>
				<td class="px-2 py-1.5 text-right text-dark-grey tabular-nums whitespace-nowrap">
					{formatter0.format(totals.regCap)}
				</td>
				<td class="px-2 py-1.5 text-right text-dark-grey tabular-nums whitespace-nowrap">
					{formatter0.format(totals.energy)}
				</td>
				<td class="px-2 py-1.5 text-right text-dark-grey tabular-nums whitespace-nowrap">
					{formatter1.format(totals.capFactor)}%
				</td>
				<td class="px-2 py-1.5 text-right text-dark-grey tabular-nums whitespace-nowrap">
					{formatMarketValue(totals.marketValue)}
				</td>
				<td class="px-2 py-1.5 text-right text-dark-grey tabular-nums whitespace-nowrap">
					{formatPrice(totals.avgValue)}
				</td>
			</tr>
		</tfoot>
	</table>
</div>
