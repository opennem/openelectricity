<script>
	/**
	 * FilterRadioList — a pick-one list of radio rows: the label, then the
	 * radio on the right, the picked row in black and the rest in grey.
	 * Options may have one level of independently selectable `children`
	 * (indented under a guide line); `divider: true` adds a separator after an
	 * option, `disabled: true` dims it, and consecutive options sharing a
	 * `group` sit under that subheader (an ARIA group).
	 *
	 * `FilterSelect`'s panel uses it as a listbox (`mode="listbox"`). In the
	 * phone filter sheet it is a radio group with touch-sized rows.
	 */

	/** @typedef {{ value: string, label: string, disabled?: boolean }} RadioOption */

	/**
	 * @type {{
	 *   options: Array<RadioOption & { children?: RadioOption[], divider?: boolean, group?: string }>,
	 *   selected: string,
	 *   label: string,
	 *   mode?: 'listbox' | 'radiogroup',
	 *   onselect: (value: string) => void
	 * }}
	 */
	let { options, selected, label, mode = 'listbox', onselect } = $props();

	const uid = $props.id();
	let listbox = $derived(mode === 'listbox');
	/** Runs of consecutive options under the same `group` (none for ungrouped). */
	let sections = $derived(
		options.reduce((runs, option) => {
			const last = runs.at(-1);
			if (last && last.group === option.group) last.options.push(option);
			else runs.push({ group: option.group, options: [option] });
			return runs;
		}, /** @type {Array<{ group: string | undefined, options: typeof options }>} */ ([]))
	);
</script>

{#snippet optionRow(/** @type {RadioOption} */ option)}
	{@const isSelected = option.value === selected}
	<button
		type="button"
		role={listbox ? 'option' : 'radio'}
		aria-selected={listbox ? isSelected : undefined}
		aria-checked={listbox ? undefined : isSelected}
		disabled={option.disabled}
		class="flex w-full cursor-pointer items-center gap-5 rounded-md px-2 hover:bg-warm-grey disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent {listbox
			? 'py-2'
			: 'min-h-[44px] py-2.5'} {isSelected ? 'text-black' : 'text-mid-grey'}"
		onclick={() => onselect(option.value)}
	>
		<span class="flex-1 truncate text-left">{option.label}</span>
		<span
			class="flex shrink-0 items-center justify-center rounded-full border {listbox
				? 'size-[15px]'
				: 'size-[18px]'} {isSelected ? 'border-mid-grey' : 'border-mid-warm-grey'}"
			aria-hidden="true"
		>
			{#if isSelected}
				<span class="rounded-full bg-dark-grey {listbox ? 'size-[9px]' : 'size-[10px]'}"></span>
			{/if}
		</span>
	</button>
{/snippet}

{#snippet optionItem(
	/** @type {RadioOption & { children?: RadioOption[], divider?: boolean }} */ option
)}
	<li class="whitespace-nowrap" role="none">
		{@render optionRow(option)}
		{#if option.children && option.children.length > 0}
			<ul class="ml-4 border-l border-warm-grey pl-1" role="none">
				{#each option.children as child (child.value)}
					<li class="whitespace-nowrap" role="none">
						{@render optionRow(child)}
					</li>
				{/each}
			</ul>
		{/if}
		{#if option.divider}
			<div class="my-1 h-px bg-warm-grey" role="separator"></div>
		{/if}
	</li>
{/snippet}

<ul class="m-0 flex list-none flex-col p-0 text-sm" role={mode} aria-label={label}>
	{#each sections as section, index (index)}
		{#if section.group}
			<li role="presentation">
				<div
					id="{uid}-group-{index}"
					class="px-2 pb-1 pt-3 text-xxs font-medium uppercase tracking-wider text-dark-grey"
				>
					{section.group}
				</div>
				<ul class="m-0 list-none p-0" role="group" aria-labelledby="{uid}-group-{index}">
					{#each section.options as option (option.value)}
						{@render optionItem(option)}
					{/each}
				</ul>
			</li>
		{:else}
			{#each section.options as option (option.value)}
				{@render optionItem(option)}
			{/each}
		{/if}
	{/each}
</ul>
