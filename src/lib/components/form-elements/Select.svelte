<script>
	import { RadioGroup, Select } from 'bits-ui';
	import IconChevronUpDown from '$lib/icons/ChevronUpDown.svelte';
	import RadioIndicator from '$lib/components/form-elements/RadioIndicator.svelte';

	/** @typedef {{label: string, value: string | number | null | undefined, labelClassName?: string, divider?: boolean, isGroupHeader?: boolean, description?: string}} Option */
	/** @typedef {{ heading?: Option, divider: boolean, items: Option[] }} Section */
	/** @type {{
	 * selected: any, options?: Option[], paddingY?: string, paddingX?: string,
	 * selectedLabelClass?: string, formLabel?: string, staticDisplay?: boolean,
	 * position?: string, align?: string, widthClass?: string, compact?: boolean,
	 * onchange?: (option: Option) => void
	 * }} */
	let {
		selected,
		options = [],
		paddingY = 'py-1',
		paddingX = 'px-2',
		selectedLabelClass = 'font-semibold',
		formLabel = '',
		staticDisplay = false,
		position = 'bottom',
		align = 'left',
		widthClass = 'w-full',
		compact = false,
		onchange
	} = $props();

	const id = $props.id();

	/** @param {Option} option */
	const isChoice = (option) => !option.divider && !option.isGroupHeader;

	let selectedValue = $derived(
		selected !== null && typeof selected === 'object' ? selected.value : selected
	);
	let selectedOption = $derived(
		options.find((option) => isChoice(option) && option.value === selectedValue)
	);
	let selectedLabel = $derived(
		selectedOption?.label ?? (selected?.label || selectedValue || formLabel)
	);

	// Listbox sections: a group heading opens a labelled group, a divider rules
	// off the next section and other options fill the current one.
	let sections = $derived.by(() => {
		/** @type {Section[]} */
		const result = [{ divider: false, items: [] }];
		for (const option of options) {
			const current = result[result.length - 1];
			if (option.divider) {
				result.push({ divider: true, items: [] });
			} else if (option.isGroupHeader) {
				// A heading straight after a divider keeps the rule above its group.
				if (current.items.length === 0 && !current.heading) current.heading = option;
				else result.push({ divider: false, heading: option, items: [] });
			} else {
				current.items.push(option);
			}
		}
		return result.filter((section) => section.heading || section.items.length > 0);
	});

	// Bits uses string values; keep numbers, empty strings and null distinct and
	// return the original option to existing callers.
	function key(/** @type {Option['value']} */ value) {
		return `${typeof value}:${String(value)}`;
	}
	function handleValueChange(/** @type {string} */ value) {
		const option = options.find((item) => isChoice(item) && key(item.value) === value);
		if (option) onchange?.(option);
	}
</script>

{#snippet optionLabel(/** @type {Option} */ option)}
	<span>
		<span class={`capitalize ${option.labelClassName ?? ''}`}>{option.label}</span>
		{#if option.description}
			<span class="mt-0.5 block max-w-80 text-xs font-normal text-mid-grey"
				>{option.description}</span
			>
		{/if}
	</span>
{/snippet}

{#snippet listboxItems(/** @type {Option[]} */ items)}
	{#each items as option, index (`${key(option.value)}:${index}`)}
		<Select.Item
			value={key(option.value)}
			label={option.label}
			class={`flex w-full cursor-default items-start justify-between rounded-md text-left text-mid-grey outline-none data-[highlighted]:bg-warm-grey data-[selected]:text-black ${
				compact ? 'gap-8 px-3 py-1.5' : 'gap-16 px-4 py-2'
			} ${option.description ? 'border-b border-warm-grey last:border-b-0' : ''}`}
		>
			{#snippet children({ selected })}
				{@render optionLabel(option)}
				<RadioIndicator checked={selected} class="mt-[3px]" />
			{/snippet}
		</Select.Item>
	{/each}
{/snippet}

<div class="relative {widthClass} text-sm lg:text-base">
	{#if staticDisplay}
		<div class="{paddingX} {paddingY}">
			<span id={`${id}-label`} class="{selectedLabelClass} font-space text-sm">{formLabel}</span>
		</div>
		<RadioGroup.Root
			bind:value={() => key(selectedValue), handleValueChange}
			aria-labelledby={`${id}-label`}
			class="mt-1 flex flex-col"
		>
			{#each options as option, index (`${key(option.value)}:${index}`)}
				{#if option.divider}
					<div class="h-px w-full bg-warm-grey" role="separator"></div>
				{:else if option.isGroupHeader}
					<div class="mt-2 px-4 py-2 font-space text-xs uppercase text-mid-grey first:mt-0">
						{option.label}
					</div>
				{:else}
					<RadioGroup.Item
						value={key(option.value)}
						class="flex w-full items-start gap-4 border-b border-warm-grey py-1 text-left text-sm text-mid-grey data-[state=checked]:text-black focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-dark-grey"
					>
						{#snippet children({ checked })}
							<RadioIndicator {checked} class="mt-[3px]" />
							{@render optionLabel(option)}
						{/snippet}
					</RadioGroup.Item>
				{/if}
			{/each}
		</RadioGroup.Root>
	{:else}
		{#if formLabel}
			<span id={`${id}-label`} class="sr-only">{formLabel}</span>
		{/if}
		<Select.Root
			type="single"
			allowDeselect={false}
			bind:value={() => key(selectedValue), handleValueChange}
		>
			<Select.Trigger
				id={`${id}-trigger`}
				aria-labelledby={formLabel ? `${id}-label ${id}-trigger` : undefined}
				class="flex items-center gap-2 {paddingX} {paddingY} rounded-lg hover:bg-warm-grey data-[state=open]:bg-warm-grey"
			>
				<span
					class="{selectedLabelClass} mb-0 capitalize {compact
						? 'text-xs lg:text-sm'
						: 'text-sm lg:text-base'}">{selectedLabel}</span
				>
				<IconChevronUpDown class={compact ? 'w-5 h-5' : 'w-7 h-7'} />
			</Select.Trigger>
			<Select.Portal>
				<Select.Content
					side={position === 'top' ? 'top' : 'bottom'}
					align={align === 'right' ? 'end' : align === 'middle' ? 'center' : 'start'}
					sideOffset={4}
					class="z-[10000] max-h-[min(450px,var(--bits-select-content-available-height))] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg border border-mid-grey bg-white p-2 text-sm shadow-md outline-none"
				>
					{#each sections as section, index (index)}
						{#if section.divider}
							<div class="my-1 h-px w-full bg-warm-grey" aria-hidden="true"></div>
						{/if}
						{#if section.heading}
							<Select.Group class="mt-2 first:mt-0">
								<Select.GroupHeading class="px-4 py-2 font-space text-xs uppercase text-mid-grey">
									{section.heading.label}
								</Select.GroupHeading>
								{@render listboxItems(section.items)}
							</Select.Group>
						{:else}
							{@render listboxItems(section.items)}
						{/if}
					{/each}
				</Select.Content>
			</Select.Portal>
		</Select.Root>
	{/if}
</div>
