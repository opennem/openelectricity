<script>
	import Select from '$lib/components/form-elements/Select.svelte';
	import Checkbox from '$lib/components/form-elements/Checkbox.svelte';
	import Button2 from '$lib/components/form-elements/Button2.svelte';
	import TableOptions from './TableOptions.svelte';
	import { getGroup, GROUP_OPTIONS } from '$lib/components/charts/network/groups.js';
	import { CONTRIBUTION_OPTIONS, contributionLabel } from './tracker-model.js';
	import { TABLE_COLUMNS, ALL_TABLE_COLUMNS, DEFAULT_TABLE_COLUMNS } from './table-columns.js';

	/** @type {{group: string, ongroupchange: (value: string) => void,
	 * contributionMode?: import('./types.js').ContributionMode,
	 * oncontributionchange?: (value: import('./types.js').ContributionMode) => void,
	 * tableColumns?: string[], oncolumnschange?: (value: string[]) => void}} */
	let {
		group,
		ongroupchange,
		contributionMode,
		oncontributionchange,
		tableColumns = DEFAULT_TABLE_COLUMNS,
		oncolumnschange
	} = $props();
	const id = $props.id();
	let summary = $derived(
		`${getGroup(group).label}${contributionMode ? ` · ${contributionLabel(contributionMode)}` : ''}`
	);
</script>

<TableOptions title="Fuel technology options" {summary}>
	<Select
		formLabel="Fuel tech grouping"
		options={GROUP_OPTIONS}
		selected={group}
		staticDisplay
		paddingX=""
		onchange={(option) => ongroupchange(String(option.value))}
	/>
	{#if contributionMode && oncontributionchange}
		<Select
			formLabel="Contribution %"
			options={CONTRIBUTION_OPTIONS}
			selected={contributionMode}
			staticDisplay
			paddingX=""
			onchange={(option) =>
				oncontributionchange?.(/** @type {import('./types.js').ContributionMode} */ (option.value))}
		/>
	{/if}
	{#if oncolumnschange}
		<fieldset>
			<legend class="mb-1 text-sm font-semibold">Table columns</legend>
			<p class="mb-3 text-xs text-mid-grey">Technology is always shown.</p>
			<div class="grid grid-cols-2 gap-3 text-sm">
				{#each TABLE_COLUMNS as column (column.key)}
					<Checkbox
						name={`${id}-column-${column.key}`}
						label={column.label}
						checked={tableColumns.includes(column.key)}
						onchange={() =>
							oncolumnschange?.(
								tableColumns.includes(column.key)
									? tableColumns.filter((key) => key !== column.key)
									: [...tableColumns, column.key]
							)}
					/>
				{/each}
			</div>
			<Button2 class="mt-4 text-sm" onclick={() => oncolumnschange?.([...ALL_TABLE_COLUMNS])}>
				Show all columns
			</Button2>
		</fieldset>
	{/if}
</TableOptions>
