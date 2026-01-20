<script>
	import Gauge from './Gauge.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {import('$lib/types/chart.types').TimeSeriesData[]} [dataset]
	 * @property {string[]} [keys]
	 * @property {Object.<string, string>} [labelDict]
	 * @property {Object.<string, string>} [colourDict]
	 */

	/** @type {Props} */
	let { dataset = [], keys = [], labelDict = {}, colourDict = {} } = $props();

	const gaugeYears = [2024, 2030, 2050];

	/**
	 * @param {string} key
	 * @returns {number[]}
	 */
	function getMarkerLines(key) {
		return gaugeYears.map((year) => {
			const filtered = dataset.filter((d) => d.date.getFullYear() === year);
			return filtered.length ? filtered[0][key] : 0;
		});
	}

	/**
	 * @param {string} key
	 * @returns {number[]}
	 */
	function getXDomain(key) {
		return [
			/** @type {number} */ (dataset[0][key]),
			/** @type {number} */ (dataset[dataset.length - 1][key])
		];
	}
</script>

<div class="flex flex-wrap justify-center gap-6">
	{#each keys as key}
		<div
			class="p-8 bg-light-warm-grey rounded-lg"
			style="width: calc(100% / {keys.length} - 1.5rem);"
		>
			<h6>{labelDict[key]}</h6>

			<div style="width: 100%; height: 200px;">
				<Gauge
					{dataset}
					xKey={key}
					xDomain={getXDomain(key)}
					markerLines={getMarkerLines(key)}
					fill={colourDict[key]}
				/>
			</div>

			<div>
				{#each gaugeYears as year}
					<div class="flex justify-between">
						<span>{year}</span>
						<span>{dataset.filter((d) => d.date.getFullYear() === year)[0][key].toFixed(2)}</span>
					</div>
				{/each}
			</div>
		</div>
	{/each}
</div>
