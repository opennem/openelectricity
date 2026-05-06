<script>
	import { ExternalLink } from '@lucide/svelte';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import { transformPollutionData } from './transform-pollution.js';
	import { buildNpiFacilityUrl } from './npi-url.js';
	import FacilityPollutionCharts from './FacilityPollutionCharts.svelte';

	/**
	 * Public-facing pollution panel for /facility/[code]. Fetches NPI pollution
	 * data for the given facility on mount (and re-fetches when the facility
	 * code changes), then renders the row-based table via
	 * FacilityPollutionCharts. Card chrome matches the Generation & Market
	 * panel above it (rounded border, header with title + external link).
	 *
	 * @type {{ facility: any | null | undefined }}
	 */
	let { facility } = $props();

	/** @type {any[] | null} */
	let pollutionData = $state(null);
	let loading = $state(false);
	let errored = $state(false);

	let code = $derived(facility?.code ?? null);
	let hasNpi = $derived(Boolean(facility?.npi_id));

	$effect(() => {
		const currentCode = code;
		const npi = hasNpi;

		if (!currentCode || !npi) {
			pollutionData = null;
			loading = false;
			errored = false;
			return;
		}

		const controller = new AbortController();
		loading = true;
		errored = false;
		pollutionData = null;

		fetch(`/api/facilities/${currentCode}/pollution`, { signal: controller.signal })
			.then((r) => r.json())
			.then((json) => {
				const d = json.response?.data;
				pollutionData = d?.length ? d : null;
			})
			.catch((/** @type {unknown} */ err) => {
				if (err instanceof DOMException && err.name === 'AbortError') return;
				errored = true;
			})
			.finally(() => {
				loading = false;
			});

		return () => controller.abort();
	});

	let transformed = $derived(pollutionData ? transformPollutionData(pollutionData) : null);
	let hasPollutants = $derived(transformed ? transformed.pollutants.length > 0 : false);

	let npiHref = $derived(
		buildNpiFacilityUrl({
			npiId: facility?.npi_id,
			networkRegion: facility?.network_region,
			year: transformed?.years[transformed.years.length - 1] ?? null
		})
	);
</script>

<div class="rounded-lg border border-mid-warm-grey/40 bg-white">
	<div
		class="flex items-center justify-between gap-4 px-6 py-3 border-b border-mid-warm-grey/40"
	>
		<h3 class="text-sm font-semibold text-dark-grey m-0">NPI Pollution Data</h3>
	</div>

	<div class="px-6 py-4">
		{#if loading}
			<div class="space-y-2">
				<Skeleton variant="text" class="h-5 w-1/3" />
				<Skeleton variant="text" class="h-4 w-full" />
				<Skeleton variant="text" class="h-4 w-full" />
				<Skeleton variant="text" class="h-4 w-full" />
			</div>
		{:else if errored}
			<p class="text-sm text-mid-grey m-0">Failed to load pollution data.</p>
		{:else if !hasNpi}
			<p class="text-sm text-mid-grey m-0">This facility is not registered with the NPI.</p>
		{:else if !hasPollutants || !transformed}
			<p class="text-sm text-mid-grey m-0">No pollution data available for this facility.</p>
		{:else}
			<FacilityPollutionCharts data={transformed} {npiHref} />
		{/if}
	</div>

	{#if hasNpi && hasPollutants}
		<div
			class="px-6 py-3 border-t border-mid-warm-grey/40 text-xs text-mid-grey"
		>
			Source:
			{#if npiHref}
				<a
					href={npiHref}
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1 text-black underline hover:opacity-70"
				>
					National Pollutant Inventory
					<ExternalLink size={11} />
				</a>
			{:else}
				National Pollutant Inventory
			{/if}
		</div>
	{/if}
</div>
