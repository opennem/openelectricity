<script>
	import { updateDelimitedCell } from '$lib/stratify/delimited-text.js';
	import { getStratifyContext } from '../_state/context.js';
	import ExpandedEditorModal from './ExpandedEditorModal.svelte';
	import TabbedDataEditor from './TabbedDataEditor.svelte';

	const project = getStratifyContext();

	let hasData = $derived(project.parsedData.data.length > 0);

	/** @type {'csv' | 'parsed'} */
	let activeTab = $state('csv');
	let expanded = $state(false);

	const textareaBase =
		'bg-light-warm-grey rounded-lg p-4 leading-relaxed font-mono w-full border border-warm-grey outline-none focus:bg-white focus:border-red focus:ring-1 focus:ring-red resize-y';
	const placeholder =
		'Date,Solar,Wind,Coal\n2024-01-01,150,200,300\n2024-01-02,160,180,290\n2024-01-03,170,210,280';
	let textareaClass = $derived(hasData ? `${textareaBase} rounded-t-none` : textareaBase);

	/**
	 * Update a cell in the CSV text by line and column index.
	 * @param {number} lineIndex
	 * @param {number} colIndex
	 * @param {string} newValue
	 */
	function handleCellEdit(lineIndex, colIndex, newValue) {
		project.csvText = updateDelimitedCell(project.csvText, lineIndex, colIndex, newValue);
	}

	function openExpanded() {
		expanded = true;
	}

	function closeExpanded() {
		expanded = false;
	}
</script>

{#snippet csvEditor(/** @type {boolean} */ expandedView)}
	<textarea
		id={expandedView ? 'data-input-expanded' : 'data-input'}
		bind:value={project.csvText}
		rows="10"
		class="{textareaClass} {expandedView ? 'min-h-0 flex-1 resize-none text-sm' : 'text-xs'}"
		{placeholder}
	></textarea>
{/snippet}

{#snippet parsedEditor(/** @type {boolean} */ expandedView)}
	<div
		class="overflow-y-auto overflow-x-auto rounded-b-lg bg-warm-grey/50 {expandedView
			? 'min-h-0 flex-1'
			: 'max-h-[400px]'}"
	>
		<table class="w-full border-collapse font-mono text-sm">
			<thead class="sticky top-0 z-10">
				<tr class="bg-mid-warm-grey/30">
					<th class="text-left py-1.5 px-2.5 font-medium text-dark-grey whitespace-nowrap"
						>{project.isCategory ? 'Category' : 'Date'}</th
					>
					{#each project.parsedData.seriesNames as name (name)}
						<th class="text-right py-1.5 px-2.5 font-medium text-dark-grey whitespace-nowrap"
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
								onkeydown={(e) => {
									if (e.key === 'Enter') e.currentTarget.blur();
								}}
								class="w-full border border-warm-grey bg-transparent px-2.5 py-1 font-mono text-sm text-mid-grey outline-none focus:bg-mid-warm-grey/30 focus:outline-none focus:ring-0"
							/>
						</td>
						{#each project.parsedData.seriesNames as name (name)}
							<td class="p-0">
								<input
									type="text"
									value={row[name] != null ? String(row[name]) : ''}
									onchange={(e) =>
										handleCellEdit(
											row._lineIndex,
											project.parsedData.seriesNames.indexOf(name) + 1,
											e.currentTarget.value
										)}
									onkeydown={(e) => {
										if (e.key === 'Enter') e.currentTarget.blur();
									}}
									class="w-full border border-warm-grey bg-transparent px-2.5 py-1 text-right font-mono text-sm text-mid-grey tabular-nums outline-none focus:bg-mid-warm-grey/30 focus:outline-none focus:ring-0"
								/>
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<p class="mt-2 font-mono text-mid-grey {expandedView ? 'text-sm' : 'text-xxs'}">
		{project.parsedData.data.length} rows
	</p>
{/snippet}

{#snippet editor(expandedView = false)}
	<TabbedDataEditor
		{hasData}
		bind:activeTab
		{expandedView}
		expandLabel="Expand data editor"
		onexpand={openExpanded}
		csv={csvEditor}
		parsed={parsedEditor}
	/>
{/snippet}

<div class="space-y-3">
	{#if project.parsedData.errors.length > 0}
		<div class="space-y-1 mb-3">
			{#each project.parsedData.errors as error, i (i)}
				<p class="text-xs text-dark-red">{error}</p>
			{/each}
		</div>
	{/if}

	{@render editor()}
</div>

<ExpandedEditorModal
	open={expanded}
	title="Edit data"
	description="Edit the raw CSV or update parsed cells."
	onclose={closeExpanded}
>
	{#if project.parsedData.errors.length > 0}
		<div class="mb-3 space-y-1">
			{#each project.parsedData.errors as error, i (i)}
				<p class="text-xs text-dark-red">{error}</p>
			{/each}
		</div>
	{/if}

	{@render editor(true)}
</ExpandedEditorModal>
