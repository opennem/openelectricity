<script>
	import { untrack } from 'svelte';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import { transformPollutionData } from './transform-pollution.js';
	import FacilityPollutionCharts from './FacilityPollutionCharts.svelte';

	/**
	 * Public-facing pollution panel for /facility/[code]. Fetches NPI pollution
	 * data for the given facility on mount (and re-fetches when the facility
	 * code changes), then renders the small-multiples chart view via
	 * FacilityPollutionCharts.
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
			untrack(() => {
				pollutionData = null;
				loading = false;
				errored = false;
			});
			return;
		}

		const controller = new AbortController();

		untrack(() => {
			loading = true;
			errored = false;
			pollutionData = null;
		});

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
</script>

<div class="group relative rounded-lg p-4 bg-white">
	<div
		class="text-[10px] text-mid-grey uppercase tracking-widest mb-3 pb-1 border-b border-dark-grey"
	>
		NPI Pollution Data
	</div>

	{#if loading}
		<div class="space-y-2">
			<Skeleton variant="text" class="h-5 w-1/3" />
			<Skeleton variant="text" class="h-4 w-full" />
			<Skeleton variant="text" class="h-4 w-full" />
			<Skeleton variant="text" class="h-4 w-full" />
		</div>
	{:else if errored}
		<p class="text-sm text-mid-grey">Failed to load pollution data.</p>
	{:else if !hasNpi}
		<p class="text-sm text-mid-grey">This facility is not registered with the NPI.</p>
	{:else if !hasPollutants}
		<p class="text-sm text-mid-grey">No pollution data available for this facility.</p>
	{:else}
		<FacilityPollutionCharts data={transformed} />
	{/if}
</div>
