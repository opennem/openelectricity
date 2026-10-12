<script>
	/**
	 * CardToggle — an on/off option in a chart card's header ("Excl.
	 * batteries", "Inflation adjusted"): a label and a small switch inside the
	 * same bordered, warm-grey pill as the header's compact `SwitchTabs`, so
	 * switchers and toggles read as one row of controls.
	 *
	 * @type {{
	 *   label: string,
	 *   checked: boolean,
	 *   onchange: (checked: boolean) => void,
	 *   disabled?: boolean,
	 *   title?: string
	 * }}
	 */
	let { label, checked, onchange, disabled = false, title } = $props();
</script>

<button
	type="button"
	role="switch"
	aria-checked={checked}
	{disabled}
	{title}
	class="inline-flex h-[26px] shrink-0 cursor-pointer items-center gap-2 rounded-md border border-mid-warm-grey/40 bg-light-warm-grey pl-2.5 pr-1.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 {checked
		? 'text-dark-grey'
		: 'text-mid-grey hover:text-dark-grey'}"
	onclick={() => onchange(!checked)}
>
	{label}
	<span
		aria-hidden="true"
		class="relative inline-flex h-[14px] w-[24px] shrink-0 rounded-full transition-colors duration-150 {checked
			? 'bg-dark-grey'
			: 'bg-mid-warm-grey/50'}"
	>
		<span
			class="absolute left-[2px] top-[2px] size-[10px] rounded-full bg-white shadow-sm transition-transform duration-150 {checked
				? 'translate-x-[10px]'
				: ''}"
		></span>
	</span>
</button>
