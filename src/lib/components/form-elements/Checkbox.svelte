<script>
	import { Checkbox, Label } from 'bits-ui';
	import { Check, Minus } from '@lucide/svelte';

	/** @type {{
	 * name?: string, label?: string, checked?: boolean, indeterminate?: boolean,
	 * disabled?: boolean, required?: boolean, value?: string, class?: string,
	 * onchange?: (checked: boolean) => void
	 * }} */
	let {
		name,
		label = '',
		checked = $bindable(false),
		indeterminate = $bindable(false),
		disabled = false,
		required = false,
		value = 'on',
		class: className = '',
		onchange
	} = $props();
	const id = $props.id();
</script>

<div class={`flex items-center gap-3 ${className}`}>
	<Checkbox.Root
		{id}
		aria-labelledby={`${id}-label`}
		{name}
		{value}
		{disabled}
		{required}
		bind:checked
		bind:indeterminate
		onCheckedChange={(value) => onchange?.(value)}
		class="peer inline-flex size-[25px] shrink-0 items-center justify-center rounded-[6px] border border-[#f5f5f5] bg-[#171717] text-white transition-all duration-150 ease-in-out data-[state=unchecked]:border-[#dadada] data-[state=unchecked]:bg-white data-[state=unchecked]:hover:border-black/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dark-grey active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
	>
		{#snippet children({ checked, indeterminate })}
			{#if indeterminate}
				<Minus class="size-[15px]" strokeWidth={3} aria-hidden="true" />
			{:else if checked}
				<Check class="size-[15px]" strokeWidth={3} aria-hidden="true" />
			{/if}
		{/snippet}
	</Checkbox.Root>
	<Label.Root
		id={`${id}-label`}
		for={id}
		class="cursor-pointer select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
	>
		{label}
	</Label.Root>
</div>
