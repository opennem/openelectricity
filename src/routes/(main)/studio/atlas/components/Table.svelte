<script>
	/**
	 * @type {{ state: import('../stores/facilities.svelte.js').FacilitiesState }}
	 */
	let { state } = $props();
</script>

<table>
	<thead>
		<tr>
			<th>Code</th>
			<th>Name</th>
			<th>Network ID</th>
			<th>Network Region</th>
			<th>Description</th>
			<th>Units</th>
			<th>Has Data Seen</th>
		</tr>
	</thead>
	<tbody>
		{#each state.facilitiesWithDataSeen as facility (facility.code)}
			<tr>
				<td>{facility.code}</td>
				<td>
					<a href={`/studio/atlas/${facility.network_id}/${facility.code}`}>{facility.name}</a>
				</td>
				<td>{facility.network_id}</td>
				<td>{facility.network_region}</td>
				<td>{facility.description?.length}</td>
				<td>
					<div class="flex gap-2 flex-wrap">
						{#each facility.units as unit}
							<span class="bg-dark-grey text-white px-2 py-1 rounded-md">{unit.code}</span>
						{/each}
					</div>
				</td>
				<td>{facility.hasDataSeen}</td>
			</tr>
		{/each}
	</tbody>
</table>
