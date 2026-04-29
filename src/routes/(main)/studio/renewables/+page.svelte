<script>
	import { browser } from '$app/environment';
	import { colourReducer } from '$lib/stores/theme';
	import Select from '$lib/components/form-elements/Select.svelte';
	import Chart from '$lib/components/info-graphics/fossil-fuels-renewables/Chart.svelte';
	import {
		calculateRenewables,
		RENEWABLE_MODES,
		RENEWABLE_SMOOTHING_OPTIONS,
		RENEWABLE_VALUE_TYPE_OPTIONS
	} from '$lib/oe-api/calculate-renewables';

	/** @type {{ data: import('./$types').PageData }} */
	let { data } = $props();

	let renewablesInput = $derived(data.renewablesInput?.data ?? null);
	let renewablesRawPayloads = $derived(data.renewablesInput?.rawPayloads ?? null);

	$effect(() => {
		if (!browser || !renewablesRawPayloads) return;
		/** @param {string} label @param {{ call: any, response: any }} entry */
		function logCall(label, entry) {
			const { method, network, metrics, options, url, via } = entry.call;
			const args = network
				? [
						JSON.stringify(network),
						JSON.stringify(metrics),
						JSON.stringify(options)
					].join(', ')
				: `${JSON.stringify(url)}${via ? ` → ${via}` : ''}`;
			console.log(`[OE API] ${label} — client.${method}(${args})`, entry.response);
		}
		logCall('fueltech energy', renewablesRawPayloads.fueltechEnergy);
		logCall('generation_renewable_energy', renewablesRawPayloads.generationRenewableEnergy);
		logCall('demand_gross_energy', renewablesRawPayloads.demandGrossEnergy);
		logCall('energy by renewable grouping', renewablesRawPayloads.renewableGrouping);
		logCall('legacy OpenNEM JSON', renewablesRawPayloads.legacyOpenNem);
	});

	/** @type {import('$lib/oe-api/calculate-renewables').RenewableSmoothing} */
	let selectedSmoothing = $state('monthly');

	/** @type {import('$lib/oe-api/calculate-renewables').RenewableValueType} */
	let selectedValueType = $state('raw');

	/** Shared hover time across all charts so hovering one highlights the same x in all. */
	/** @type {number | undefined} */
	let sharedHoverTime = $state(undefined);

	const smoothingOptions = RENEWABLE_SMOOTHING_OPTIONS.map((s) => ({
		label: s.label,
		value: s.id,
		description: s.description
	}));

	const valueTypeOptions = RENEWABLE_VALUE_TYPE_OPTIONS.map((v) => ({
		label: v.label,
		value: v.id,
		description: v.description
	}));

	const UNIT_SUFFIX = {
		'percentage:rolling12mth': '(%)',
		'percentage:monthly': '(%)',
		'raw:rolling12mth': '(GWh, 12-mth sum)',
		'raw:monthly': '(GWh, monthly)'
	};
	let unitSuffix = $derived(UNIT_SUFFIX[`${selectedValueType}:${selectedSmoothing}`]);

	/** @param {import('$lib/oe-api/calculate-renewables').RenewableMode} mode */
	function calc(mode) {
		if (!renewablesInput) return null;
		return calculateRenewables(
			renewablesInput,
			mode,
			$colourReducer,
			selectedSmoothing,
			selectedValueType
		);
	}
</script>

<svelte:head>
	<title>Renewables comparison · Studio</title>
</svelte:head>

<div class="px-6 py-8">
	<header class="mb-6">
		<h1 class="text-2xl md:text-3xl font-space mb-2">Renewables — calculation method comparison</h1>
		<p class="text-sm text-mid-grey max-w-2xl">
			Side-by-side renewable share for every supported data source &amp; calculation method. The
			filters apply to all charts at once.
		</p>
	</header>

	<!-- Shared filters -->
	<div class="flex items-center gap-4 mb-6 whitespace-nowrap justify-start text-base md:text-lg">
		<span class="text-sm md:text-base text-mid-grey uppercase font-space">View:</span>
		<Select
			selected={smoothingOptions.find((o) => o.value === selectedSmoothing)}
			options={smoothingOptions}
			align="left"
			paddingY="py-2"
			paddingX="px-3"
			widthClass="w-auto"
			onchange={(opt) => {
				selectedSmoothing =
					/** @type {import('$lib/oe-api/calculate-renewables').RenewableSmoothing} */ (
						opt.value
					);
			}}
		/>
		<Select
			selected={valueTypeOptions.find((o) => o.value === selectedValueType)}
			options={valueTypeOptions}
			align="left"
			paddingY="py-2"
			paddingX="px-3"
			widthClass="w-auto"
			onchange={(opt) => {
				selectedValueType =
					/** @type {import('$lib/oe-api/calculate-renewables').RenewableValueType} */ (
						opt.value
					);
			}}
		/>
	</div>

	{#if !renewablesInput}
		<p class="text-mid-grey">Loading renewables data…</p>
	{:else}
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			{#each RENEWABLE_MODES as mode (mode.id)}
				{@const result = calc(mode.id)}
				<section class="relative border border-warm-grey rounded-lg p-4 pb-32 bg-white">
					<header class="mb-3">
						<h2 class="text-base font-space font-semibold leading-tight">{mode.label}</h2>
						<p class="text-xs text-mid-grey leading-snug mt-2">{mode.description}</p>
						<dl class="text-xs text-mid-grey leading-snug mt-3 space-y-1">
							<div class="flex gap-2">
								<dt class="font-semibold text-dark-grey shrink-0">Renewables =</dt>
								<dd>{mode.numerator}</dd>
							</div>
							<div class="flex gap-2">
								<dt class="font-semibold text-dark-grey shrink-0">Fossils =</dt>
								<dd>{mode.fossilNumerator}</dd>
							</div>
							<div class="flex gap-2">
								<dt class="font-semibold text-dark-grey shrink-0">Denominator =</dt>
								<dd>{mode.denominator}</dd>
							</div>
							<div class="flex gap-2">
								<dt class="font-semibold text-dark-grey shrink-0">% =</dt>
								<dd>(series ÷ Denominator) × 100</dd>
							</div>
						</dl>
					</header>

					<p class="text-xs text-mid-grey mb-1 font-space uppercase">{unitSuffix}</p>

					{#if result && result.dataset.length > 0}
						<Chart
							title=""
							description=""
							chartLabel=""
							valueType={selectedValueType}
							dataset={result.dataset}
							seriesNames={result.seriesNames}
							seriesColours={result.seriesColours}
							seriesLabels={result.seriesLabels}
							skipAnimation={true}
							historicalDataset={result.statsDatasets}
							containerClass="chart-container h-[350px]"
							externalHoverTime={sharedHoverTime}
							onHoverTimeChange={(t) => (sharedHoverTime = t)}
							annotationPlacement={false}
						/>
					{:else}
						<div class="h-[350px] flex items-center justify-center text-sm text-mid-grey">
							No data for this mode
						</div>
					{/if}
				</section>
			{/each}
		</div>
	{/if}
</div>
