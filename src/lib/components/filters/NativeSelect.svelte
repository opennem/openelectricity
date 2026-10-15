<script>
	import IconChevronDown from '$lib/icons/ChevronDown.svelte';
	import { hasTouchControls, TOUCH_PILL_ICON } from '$lib/components/ui/touch-controls.js';
	import { filterPillClass } from './filter-pill.js';

	/**
	 * NativeSelect — a filter pill that opens the platform's own picker: a real
	 * `<select>` laid transparently over the pill, so the pill keeps its look
	 * (and its short label) while a tap brings up the phone's wheel or menu.
	 * `FilterSelect` uses it on phones; it takes the same option shapes.
	 *
	 * An option's `children` follow it in an `<optgroup>` under its label, and
	 * runs sharing a `group` sit in one (where groups can't nest, so children
	 * there follow their parent plainly). `divider` has no native equivalent
	 * and is dropped.
	 *
	 * After a pick the control shows `selected` again until the caller changes
	 * it, so a pick the caller turns into something else (opening a custom
	 * range, say) doesn't leave the list showing an option that isn't applied.
	 */

	/** @typedef {{ value: string, label: string, disabled?: boolean }} NativeOption */

	/**
	 * @type {{
	 *   selected: string,
	 *   options: Array<NativeOption & { children?: NativeOption[], group?: string }>,
	 *   label: string,
	 *   listLabel: string,
	 *   active?: boolean,
	 *   compact?: boolean,
	 *   disabled?: boolean,
	 *   class?: string,
	 *   onchange?: (value: string) => void
	 * }}
	 */
	let {
		selected,
		options,
		label,
		listLabel,
		active = false,
		compact = false,
		disabled = false,
		class: className = '',
		onchange
	} = $props();

	const touch = hasTouchControls();

	/** Runs of consecutive options under the same `group` (none for ungrouped). */
	let sections = $derived(
		options.reduce((runs, option) => {
			const last = runs.at(-1);
			if (last && last.group === option.group) last.options.push(option);
			else runs.push({ group: option.group, options: [option] });
			return runs;
		}, /** @type {Array<{ group: string | undefined, options: typeof options }>} */ ([]))
	);

	/** @param {Event & { currentTarget: HTMLSelectElement }} event */
	function handleChange(event) {
		const value = event.currentTarget.value;
		// Back to the applied value; the caller's change re-renders it.
		event.currentTarget.value = selected;
		if (value !== selected) onchange?.(value);
	}
</script>

{#snippet optionList(/** @type {typeof options} */ list, /** @type {boolean} */ nested)}
	{#each list as option (option.value)}
		<option value={option.value} disabled={option.disabled}>{option.label}</option>
		{#if option.children?.length && nested}
			{#each option.children as child (child.value)}
				<option value={child.value} disabled={child.disabled}>{child.label}</option>
			{/each}
		{:else if option.children?.length}
			<optgroup label={option.label}>
				{#each option.children as child (child.value)}
					<option value={child.value} disabled={child.disabled}>{child.label}</option>
				{/each}
			</optgroup>
		{/if}
	{/each}
{/snippet}

<div
	class="relative cursor-pointer has-[select:disabled]:cursor-not-allowed has-[select:disabled]:opacity-50 has-[select:focus-visible]:outline has-[select:focus-visible]:outline-2 has-[select:focus-visible]:outline-offset-2 has-[select:focus-visible]:outline-dark-grey {filterPillClass(
		{ compact, active, touch }
	)} {className}"
>
	<span aria-hidden="true">{label}</span>
	<IconChevronDown
		class="{compact ? 'size-3.5' : 'size-4'} {touch ? TOUCH_PILL_ICON : ''}"
		aria-hidden="true"
	/>
	<select
		class="absolute inset-0 size-full cursor-[inherit] appearance-none opacity-0"
		aria-label={listLabel}
		value={selected}
		{disabled}
		onchange={handleChange}
	>
		{#each sections as section, index (index)}
			{#if section.group}
				<optgroup label={section.group}>{@render optionList(section.options, true)}</optgroup>
			{:else}
				{@render optionList(section.options, false)}
			{/if}
		{/each}
	</select>
</div>
