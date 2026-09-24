<script>
	import { SlidersHorizontal, X } from '@lucide/svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Select from '$lib/components/form-elements/Select.svelte';
	import Checkbox from '$lib/components/form-elements/Checkbox.svelte';
	import Button from '$lib/components/form-elements/Button.svelte';
	import Button2 from '$lib/components/form-elements/Button2.svelte';
	import ButtonIcon from '$lib/components/form-elements/ButtonIcon.svelte';
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
	let open = $state(false);
	let summary = $derived(
		`${getGroup(group).label}${contributionMode ? ` · ${contributionLabel(contributionMode)}` : ''}`
	);
</script>

<button
	type="button"
	aria-label="Fuel technology options"
	aria-haspopup="dialog"
	title={`Fuel technology options · ${summary}`}
	onclick={() => (open = true)}
	class="flex size-[40px] shrink-0 cursor-pointer items-center justify-center rounded-lg text-mid-grey transition-colors hover:bg-light-warm-grey focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-dark-grey motion-reduce:transition-none"
>
	<SlidersHorizontal class="size-[16px]" strokeWidth={1.5} aria-hidden="true" />
</button>

<Modal bind:open title="Fuel technology options" maxWidthClass="max-w-[560px]">
	{#snippet header()}
		<ButtonIcon onclick={() => (open = false)}>
			<X class="size-4" aria-hidden="true" />
			<span class="sr-only">Close fuel technology options</span>
		</ButtonIcon>
	{/snippet}
	<div class="space-y-6 pb-6">
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
					oncontributionchange?.(
						/** @type {import('./types.js').ContributionMode} */ (option.value)
					)}
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
	</div>
	{#snippet buttons()}
		<div class="flex justify-end">
			<Button clickHandler={() => (open = false)}>Done</Button>
		</div>
	{/snippet}
</Modal>
