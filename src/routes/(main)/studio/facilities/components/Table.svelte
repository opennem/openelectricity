<script>
	/**
	 * @type {{ facilityStore: import('../stores/facilities.svelte.js').FacilitiesState }}
	 */
	let { facilityStore } = $props();

	let facilitiesWithDataSeen = $derived(facilityStore.facilitiesWithDataSeen);
	$inspect('facilitiesWithDataSeen', facilitiesWithDataSeen);

	/** @type {string} */
	let searchQuery = $state('');

	let filteredFacilities = $derived(
		!searchQuery.trim()
			? facilitiesWithDataSeen
			: facilitiesWithDataSeen.filter((facility) => {
					const query = searchQuery.toLowerCase().trim();

					// Search in code
					if (facility.code?.toLowerCase().includes(query)) return true;

					// Search in name
					if (facility.name?.toLowerCase().includes(query)) return true;

					// Search in network_id
					if (facility.network_id?.toLowerCase().includes(query)) return true;

					// Search in network_region
					if (facility.network_region?.toLowerCase().includes(query)) return true;

					// Search in units (only code since Unit doesn't have name property)
					if (facility.units?.some((unit) => unit.code?.toLowerCase().includes(query))) return true;

					return false;
				})
	);
</script>

<!-- Search Input -->
<div class="mb-4">
	<div class="relative">
		<input
			type="text"
			bind:value={searchQuery}
			placeholder="Search by code, name, network ID, region, or units..."
			class="w-full px-4 py-2 pl-10 pr-4 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors duration-150"
		/>
		<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
			<svg class="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
				/>
			</svg>
		</div>
		{#if searchQuery}
			<button
				onclick={() => (searchQuery = '')}
				class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors duration-150"
			>
				clear
			</button>
		{/if}
	</div>
	{#if searchQuery && filteredFacilities.length !== facilitiesWithDataSeen.length}
		<p class="mt-2 text-sm text-slate-600">
			Showing {filteredFacilities.length} of {facilitiesWithDataSeen.length} facilities
		</p>
	{/if}
</div>

<div class="overflow-x-auto overflow-y-auto">
	<table class="w-full border-collapse bg-white rounded-lg shadow-sm overflow-hidden">
		<thead>
			<tr class="bg-slate-50 border-b border-slate-200">
				<th>Name</th>
				<th>Code</th>
				<th>Network ID / Region</th>
				<!-- <th>Description</th> -->
				<th>Units</th>
			</tr>
		</thead>
		<tbody class="divide-y divide-slate-100">
			{#each filteredFacilities as facility (facility.code)}
				<tr class="hover:bg-slate-50 transition-colors duration-150">
					<td class="px-4 py-2.5 text-sm whitespace-nowrap font-medium">
						<a
							href={`/studio/facilities/${facility.network_id}/${facility.code}`}
							class="text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors duration-150"
						>
							{facility.name}
						</a>
					</td>
					<td class="px-4 py-2.5 text-sm font-mono text-slate-900">{facility.code}</td>

					<td class="px-4 py-2.5 text-sm text-slate-600 font-mono whitespace-nowrap">
						{facility.network_id} / {facility.network_region}
					</td>
					<!-- <td class="px-4 py-2.5 text-sm text-slate-500">
						{@html facility.description}
					</td> -->
					<td class="px-4 py-2.5">
						<div class="flex flex-wrap gap-1">
							{#each facility.units as unit}
								<span
									class="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
								>
									{unit.code}
								</span>
							{/each}
						</div>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	thead th {
		@apply px-4 py-3 text-left text-xxs font-semibold text-mid-grey uppercase tracking-wide;
	}
</style>
