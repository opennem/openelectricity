<script>
	/** @type {import('$lib/types/unit.types').Unit[]} */
	export let data = [];

	const columns = [
		{ header: 'Unit', prop: 'code' },
		{ header: 'Capacity', prop: 'capacity_registered' },
		{ header: 'Emissions Factor', prop: 'emissions_factor_co2' },
		{ header: 'Dispatch Type', prop: 'dispatch_type' },
		{ header: 'Fuel Tech', prop: 'fuel_technology_name' },
		{ header: 'Status', prop: 'status' }
	];

	const propValue =
		/**
		 * @param {Object.<string, *>} d
		 * @param {string} prop
		 */
		(d, prop) => d[prop];

	$: units = data.map((unit) => ({
		...unit,
		code: decodeURIComponent(unit.code)
	}));
</script>

<table class="w-full my-4">
	<thead>
		<tr class="border-b text-left">
			{#each columns as { header }}
				<th class="font-semibold">{header}</th>
			{/each}
		</tr>
	</thead>

	<tbody>
		{#each units as unit}
			<tr class="border-b">
				{#each columns as { prop }}
					<td>{propValue(unit, prop)}</td>
				{/each}
			</tr>
		{/each}
	</tbody>
</table>
