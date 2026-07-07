<script>
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { colourReducer } from '$lib/stores/theme';
	import Checkbox from '$lib/components/form-elements/Checkbox.svelte';
	import Select from '$lib/components/form-elements/Select.svelte';
	import Chart from '$lib/components/info-graphics/fossil-fuels-renewables/Chart.svelte';
	import { displayXTicks } from '$lib/components/info-graphics/fossil-fuels-renewables/helpers';
	import StudioAnnotations from './_components/StudioAnnotations.svelte';
	import StudioDataTable from './_components/StudioDataTable.svelte';
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
				? [JSON.stringify(network), JSON.stringify(metrics), JSON.stringify(options)].join(', ')
				: `${JSON.stringify(url)}${via ? ` → ${via}` : ''}`;
			console.log(`[OE API] ${label} — client.${method}(${args})`, entry.response);
		}
		logCall('generation_renewable_energy', renewablesRawPayloads.generationRenewableEnergy);
		logCall('demand_gross_energy', renewablesRawPayloads.demandGrossEnergy);
		logCall('energy by renewable grouping', renewablesRawPayloads.renewableGrouping);
		logCall('energy by fueltech grouping', renewablesRawPayloads.fueltechEnergy);
		logCall('legacy OpenNEM JSON', renewablesRawPayloads.legacyOpenNem);
	});

	// Filter state is mirrored to query params (?smoothing=…&value=…&view=…&demand=…)
	// so a configured view can be shared by pasting the URL. Defaults are omitted.
	const URL_DEFAULTS = {
		smoothing: 'rolling12mth',
		value: 'percentage',
		view: 'chart',
		demand: 'true'
	};

	/**
	 * Read a query param, falling back to its default when absent or invalid.
	 * @param {keyof typeof URL_DEFAULTS} key
	 * @param {string[]} valid
	 */
	function paramOrDefault(key, valid) {
		const value = page.url.searchParams.get(key);
		return value && valid.includes(value) ? value : URL_DEFAULTS[key];
	}

	/** @type {import('$lib/oe-api/calculate-renewables').RenewableSmoothing} */
	let selectedSmoothing = $state(
		/** @type {import('$lib/oe-api/calculate-renewables').RenewableSmoothing} */ (
			paramOrDefault(
				'smoothing',
				RENEWABLE_SMOOTHING_OPTIONS.map((s) => s.id)
			)
		)
	);

	/** @type {import('$lib/oe-api/calculate-renewables').RenewableValueType} */
	let selectedValueType = $state(
		/** @type {import('$lib/oe-api/calculate-renewables').RenewableValueType} */ (
			paramOrDefault(
				'value',
				RENEWABLE_VALUE_TYPE_OPTIONS.map((v) => v.id)
			)
		)
	);

	/** Shared hover time across all charts so hovering one highlights the same x in all. */
	/** @type {number | undefined} */
	let sharedHoverTime = $state(undefined);

	/** @type {'chart' | 'table'} */
	let viewMode = $state(
		/** @type {'chart' | 'table'} */ (paramOrDefault('view', ['chart', 'table']))
	);

	/** Show the denominator (gross demand) line. On by default; ?demand=false turns it off. */
	let showDemand = $state(paramOrDefault('demand', ['true', 'false']) === 'true');

	function syncUrl() {
		const url = new URL(page.url);
		const params = {
			smoothing: selectedSmoothing,
			value: selectedValueType,
			view: viewMode,
			demand: String(showDemand)
		};
		for (const [key, value] of Object.entries(params)) {
			if (value === URL_DEFAULTS[/** @type {keyof typeof URL_DEFAULTS} */ (key)]) {
				url.searchParams.delete(key);
			} else {
				url.searchParams.set(key, value);
			}
		}
		goto(url, { replaceState: true, keepFocus: true, noScroll: true });
	}

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

	// Studio x-axis: Jan 1999 (full series history, unlike the homepage's 2000
	// start) through to the end of the current year (the homepage default runs
	// 10 years into the future). Default 5-yearly ticks filtered to fit.
	const STUDIO_X_DOMAIN = [
		new Date(1999, 0, 1).getTime(),
		new Date(new Date().getFullYear() + 1, 0, 1).getTime()
	];
	const studioXTicks = displayXTicks.filter((d) => d.getTime() <= STUDIO_X_DOMAIN[1]);

	const UNIT_SUFFIX = {
		'percentage:rolling12mth': '(%)',
		'percentage:monthly': '(%)',
		'raw:rolling12mth': '(GWh, 12-mth sum)',
		'raw:monthly': '(GWh, monthly)'
	};
	let unitSuffix = $derived(UNIT_SUFFIX[`${selectedValueType}:${selectedSmoothing}`]);
	let unitLabel = $derived(selectedValueType === 'percentage' ? '%' : 'GWh');

	/** @param {import('$lib/oe-api/calculate-renewables').RenewableMode} mode */
	function calc(mode) {
		if (!renewablesInput) return null;
		return calculateRenewables(
			renewablesInput,
			mode,
			$colourReducer,
			selectedSmoothing,
			selectedValueType,
			showDemand
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
	<div
		class="flex flex-wrap items-center gap-x-4 gap-y-2 mb-6 whitespace-nowrap justify-start text-base md:text-lg"
	>
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
					/** @type {import('$lib/oe-api/calculate-renewables').RenewableSmoothing} */ (opt.value);
				syncUrl();
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
					/** @type {import('$lib/oe-api/calculate-renewables').RenewableValueType} */ (opt.value);
				syncUrl();
			}}
		/>
		<Checkbox
			label="Gross demand"
			checked={showDemand}
			class="text-sm"
			onchange={(checked) => {
				showDemand = checked;
				syncUrl();
			}}
		/>
		<div
			class="ml-auto inline-flex rounded-md border border-warm-grey overflow-hidden text-xs md:text-sm font-space"
			role="group"
			aria-label="View mode"
		>
			<button
				type="button"
				class="px-3 py-2 transition-colors {viewMode === 'chart'
					? 'bg-dark-grey text-white'
					: 'bg-white text-mid-grey hover:bg-light-warm-grey'}"
				aria-pressed={viewMode === 'chart'}
				onclick={() => {
					viewMode = 'chart';
					syncUrl();
				}}
			>
				Chart
			</button>
			<button
				type="button"
				class="px-3 py-2 transition-colors border-l border-warm-grey {viewMode === 'table'
					? 'bg-dark-grey text-white'
					: 'bg-white text-mid-grey hover:bg-light-warm-grey'}"
				aria-pressed={viewMode === 'table'}
				onclick={() => {
					viewMode = 'table';
					syncUrl();
				}}
			>
				Table
			</button>
		</div>
	</div>

	{#if !renewablesInput}
		<p class="text-mid-grey">Loading renewables data…</p>
	{:else}
		<div class="flex flex-col gap-6">
			{#each RENEWABLE_MODES as mode (mode.id)}
				{@const result = calc(mode.id)}
				{@const isReference = mode.id === 'legacy_opennem'}
				<section
					class="relative border border-warm-grey rounded-lg p-4 bg-white"
					class:opacity-50={isReference}
				>
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
							{#if mode.fossilFueltechNumerator}
								<div class="flex gap-2">
									<dt class="font-semibold text-dark-grey shrink-0">Fossils (fueltech) =</dt>
									<dd>{mode.fossilFueltechNumerator}</dd>
								</div>
							{/if}
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
						{#if viewMode === 'chart'}
							<div class="flex flex-col md:flex-row gap-4 md:items-stretch">
								<div class="flex-1 min-w-0">
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
										containerClass="chart-container h-[300px] md:h-[350px]"
										strokeWidth="2px"
										xDomain={STUDIO_X_DOMAIN}
										xTicks={studioXTicks}
										externalHoverTime={sharedHoverTime}
										onHoverTimeChange={(t) => (sharedHoverTime = t)}
										showAnnotations={false}
									/>
								</div>
								<div class="w-full md:w-[350px] md:shrink-0">
									<StudioAnnotations
										dataset={result.dataset}
										seriesNames={result.seriesNames}
										seriesColours={result.seriesColours}
										seriesLabels={result.seriesLabels}
										hoverTime={sharedHoverTime}
										unit={unitLabel}
									/>
								</div>
							</div>
						{:else}
							<StudioDataTable
								dataset={result.dataset}
								seriesNames={result.seriesNames}
								seriesColours={result.seriesColours}
								seriesLabels={result.seriesLabels}
								unit={unitLabel}
							/>
						{/if}
					{:else}
						<div
							class="h-[300px] md:h-[350px] flex items-center justify-center text-sm text-mid-grey"
						>
							No data for this mode
						</div>
					{/if}
				</section>
			{/each}
		</div>
	{/if}
</div>
