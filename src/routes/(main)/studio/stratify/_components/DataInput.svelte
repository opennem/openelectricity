<script>
	import { format } from 'date-fns';
	import { getStratifyContext } from '../_state/context.js';

	const project = getStratifyContext();

	let previewRows = $derived(project.parsedData.data.slice(0, 5));
	let hasMore = $derived(project.parsedData.data.length > 5);
</script>

<div class="space-y-3">
	<div>
		<label
			for="data-input"
			class="block text-xs font-semibold mb-1 text-mid-grey uppercase tracking-wider">Data</label
		>
		<textarea
			id="data-input"
			bind:value={project.csvText}
			rows="10"
			class="bg-light-warm-grey border border-mid-warm-grey rounded-lg p-3 text-xs font-mono w-full focus:outline-none focus:border-dark-grey resize-y"
			placeholder={'Date,Solar,Wind,Coal\n2024-01-01,150,200,300\n2024-01-02,160,180,290\n2024-01-03,170,210,280'}
		></textarea>
	</div>

	{#if project.parsedData.errors.length > 0}
		<div class="space-y-1">
			{#each project.parsedData.errors as error, i (i)}
				<p class="text-xs text-dark-red">{error}</p>
			{/each}
		</div>
	{/if}

	{#if previewRows.length > 0}
		<div class="overflow-x-auto">
			<table class="w-full text-xs">
				<thead>
					<tr class="border-b border-mid-warm-grey">
						<th class="text-left py-1 px-2 font-semibold text-mid-grey">Date</th>
						{#each project.parsedData.seriesNames as name (name)}
							<th class="text-right py-1 px-2 font-semibold text-mid-grey"
								>{project.parsedData.seriesLabels[name] || name}</th
							>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each previewRows as row (row.time)}
						<tr class="border-b border-light-warm-grey">
							<td class="py-1 px-2 text-mid-grey">{format(row.date, 'dd MMM yyyy')}</td>
							{#each project.parsedData.seriesNames as name (name)}
								<td class="text-right py-1 px-2"
									>{row[name] != null ? row[name].toLocaleString() : '—'}</td
								>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
			{#if hasMore}
				<p class="text-xs text-mid-grey mt-1">{project.parsedData.data.length} rows total</p>
			{/if}
		</div>
	{/if}
</div>
