<script>
	import { getStratifyContext } from '../_state/context.js';

	const project = getStratifyContext();

	let hasData = $derived(project.parsedData.data.length > 0);

	/** @type {'csv' | 'parsed'} */
	let activeTab = $state('csv');

	const textareaBase =
		'bg-warm-grey/50 rounded-lg p-3 text-xs font-mono w-full border border-warm-grey outline-none focus:bg-warm-grey resize-y';
	let textareaClass = $derived(
		hasData ? `${textareaBase} rounded-t-none` : textareaBase
	);

	/**
	 * Update a cell in the CSV text by line and column index.
	 * @param {number} lineIndex - Line index in the trimmed CSV (1-based, 0 is header)
	 * @param {number} colIndex - Column index (0 = first col, 1+ = series)
	 * @param {string} newValue - New cell value
	 */
	function handleCellEdit(lineIndex, colIndex, newValue) {
		const lines = project.csvText.trim().split('\n');
		if (lineIndex < 0 || lineIndex >= lines.length) return;
		const firstLine = lines[0] || '';
		const delimiter = firstLine.includes('\t') ? '\t' : firstLine.includes(',') ? ',' : ';';
		const cells = lines[lineIndex].split(delimiter);
		cells[colIndex] = newValue;
		lines[lineIndex] = cells.join(delimiter);
		project.csvText = lines.join('\n');
	}
</script>

<div class="space-y-3">
	<div>
		{#if project.parsedData.errors.length > 0}
			<div class="space-y-1 mb-3">
				{#each project.parsedData.errors as error, i (i)}
					<p class="text-xs text-dark-red">{error}</p>
				{/each}
			</div>
		{/if}

		{#if hasData}
			<div class="flex gap-0.5 mb-0">
				<button
					type="button"
					class="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide cursor-pointer transition-colors rounded-t-lg
						{activeTab === 'csv'
						? 'text-dark-grey bg-warm-grey/50'
						: 'text-mid-grey hover:text-dark-grey'}"
					onclick={() => (activeTab = 'csv')}
				>
					CSV
				</button>
				<button
					type="button"
					class="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide cursor-pointer transition-colors rounded-t-lg
						{activeTab === 'parsed'
						? 'text-dark-grey bg-warm-grey/50'
						: 'text-mid-grey hover:text-dark-grey'}"
					onclick={() => (activeTab = 'parsed')}
				>
					Parsed
				</button>
			</div>
		{/if}

		{#if !hasData || activeTab === 'csv'}
			<textarea
				id="data-input"
				bind:value={project.csvText}
				rows="10"
				class={textareaClass}
				placeholder="Date,Solar,Wind,Coal&#10;2024-01-01,150,200,300&#10;2024-01-02,160,180,290&#10;2024-01-03,170,210,280"
			></textarea>
		{:else}
			<div
				class="max-h-[400px] overflow-y-auto overflow-x-auto bg-warm-grey/50 rounded-b-lg"
			>
				<table class="w-full text-[11px] font-mono border-collapse">
					<thead class="sticky top-0 z-10">
						<tr class="bg-mid-warm-grey/30">
							<th
								class="text-left py-1.5 px-2.5 font-medium text-dark-grey whitespace-nowrap"
								>{project.isCategory ? 'Category' : 'Date'}</th
							>
							{#each project.parsedData.seriesNames as name, idx (name)}
								<th
									class="text-right py-1.5 px-2.5 font-medium text-dark-grey whitespace-nowrap"
									>{project.parsedData.seriesLabels[name] || name}</th
								>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each project.parsedData.data as row, i (i)}
							<tr>
								<td class="p-0">
									<input
										type="text"
										value={project.isCategory ? row.category : (row._dateStr ?? '')}
										onchange={(e) => handleCellEdit(row._lineIndex, 0, e.currentTarget.value)}
										onkeydown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
										class="w-full bg-transparent text-[11px] font-mono text-mid-grey border border-warm-grey outline-none focus:outline-none focus:ring-0 focus:bg-mid-warm-grey/30 px-2.5 py-1"
									/>
								</td>
								{#each project.parsedData.seriesNames as name, idx (name)}
									<td class="p-0">
										<input
											type="text"
											value={row[name] != null ? String(row[name]) : ''}
											onchange={(e) => handleCellEdit(row._lineIndex, idx + 1, e.currentTarget.value)}
											onkeydown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
											class="w-full bg-transparent text-right text-[11px] font-mono tabular-nums border border-warm-grey outline-none focus:outline-none focus:ring-0 focus:bg-mid-warm-grey/30 px-2.5 py-1"
										/>
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<p class="text-[11px] text-mid-grey mt-1">{project.parsedData.data.length} rows</p>
		{/if}
	</div>
</div>
