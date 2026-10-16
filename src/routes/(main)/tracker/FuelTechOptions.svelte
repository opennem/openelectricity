<script>
	import FilterSheetSection from '$lib/components/filters/FilterSheetSection.svelte';
	import Switch from '$lib/components/SwitchWithIcons.svelte';
	import Toggle from '$lib/components/form-elements/Toggle.svelte';
	import TableOptions from './TableOptions.svelte';
	import { getGroup, GROUP_OPTIONS } from '$lib/components/charts/network/groups.js';
	import { CONTRIBUTION_OPTIONS, contributionLabel } from './tracker-model.js';
	import { TABLE_COLUMNS, ALL_TABLE_COLUMNS, DEFAULT_TABLE_COLUMNS } from './table-columns.js';

	/**
	 * FuelTechOptions — the fuel tech table's options (`TableOptions`): the
	 * grouping and contribution basis as segmented switches, and, where the
	 * table has column choices (Timeline), a switch per column with "Show all
	 * columns" at the end of the section's title.
	 *
	 * @type {{group: string, ongroupchange: (value: string) => void,
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
	let summary = $derived(
		`${getGroup(group).label}${contributionMode ? ` · ${contributionLabel(contributionMode)}` : ''}`
	);

	/** @param {string} key */
	function toggleColumn(key) {
		oncolumnschange?.(
			tableColumns.includes(key)
				? tableColumns.filter((column) => column !== key)
				: [...tableColumns, key]
		);
	}
</script>

{#snippet showAllColumns()}
	<button
		type="button"
		class="cursor-pointer text-xs text-dark-grey underline underline-offset-2 hover:text-black"
		onclick={() => oncolumnschange?.([...ALL_TABLE_COLUMNS])}
	>
		Show all columns
	</button>
{/snippet}

<TableOptions title="Fuel technology options" {summary}>
	<FilterSheetSection title="Grouping">
		<Switch
			buttons={GROUP_OPTIONS}
			selected={group}
			columns={2}
			compact
			rounded="rounded-lg"
			darkSelected
			aria-label="Fuel tech grouping"
			onchange={(option) => {
				if (option.value !== group) ongroupchange(String(option.value));
			}}
		/>
	</FilterSheetSection>
	{#if contributionMode && oncontributionchange}
		<FilterSheetSection title="Contribution %">
			<Switch
				buttons={CONTRIBUTION_OPTIONS}
				selected={contributionMode}
				columns={2}
				compact
				rounded="rounded-lg"
				darkSelected
				aria-label="Contribution basis"
				onchange={(option) => {
					if (option.value !== contributionMode)
						oncontributionchange(
							/** @type {import('./types.js').ContributionMode} */ (option.value)
						);
				}}
			/>
		</FilterSheetSection>
	{/if}
	{#if oncolumnschange}
		<FilterSheetSection title="Columns" action={showAllColumns}>
			<p class="m-0 text-xs text-mid-grey">Technology is always shown.</p>
			{#each TABLE_COLUMNS as column (column.key)}
				<div class="py-1 max-tablet:py-2.5">
					<Toggle
						compact
						spread
						label={column.label}
						checked={tableColumns.includes(column.key)}
						onclick={() => toggleColumn(column.key)}
					/>
				</div>
			{/each}
		</FilterSheetSection>
	{/if}
</TableOptions>
