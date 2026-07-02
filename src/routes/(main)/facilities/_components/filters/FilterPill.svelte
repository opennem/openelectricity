<script>
	import IconChevronDown from '$lib/icons/ChevronDown.svelte';

	/**
	 * Pill-shaped filter trigger button.
	 * @type {{
	 *   label: string,
	 *   badge?: number | string | null,
	 *   active?: boolean,
	 *   open?: boolean,
	 *   compact?: boolean,
	 *   el?: HTMLElement | undefined,
	 *   onclick?: () => void
	 * }}
	 */
	let {
		label,
		badge = null,
		active = false,
		open = false,
		compact = false,
		el = $bindable(undefined),
		onclick
	} = $props();
</script>

<button
	type="button"
	bind:this={el}
	{onclick}
	aria-expanded={open}
	aria-haspopup="true"
	class="flex items-center rounded-lg border whitespace-nowrap font-medium transition-colors cursor-pointer {compact
		? 'gap-1.5 pl-4 pr-3 py-1.5 text-xs'
		: 'gap-2 pl-5 pr-4 py-2.5 text-sm'} {active
		? 'bg-dark-grey border-dark-grey text-white hover:bg-black'
		: 'bg-white border-mid-warm-grey text-dark-grey hover:border-dark-grey'} {open && !active
		? 'border-dark-grey'
		: ''}"
>
	<span>{label}</span>

	{#if badge}
		<span
			class="rounded-full font-medium flex items-center justify-center text-xxs {compact
				? 'min-w-[1.5rem] h-[1.5rem]'
				: 'min-w-[1.8rem] h-[1.8rem]'} px-1 {active
				? 'bg-white text-dark-grey'
				: 'bg-dark-grey text-white'}"
		>
			{badge}
		</span>
	{/if}

	<IconChevronDown
		class="{compact ? 'size-3.5' : 'size-4'} transition-transform duration-200 {open
			? 'rotate-180'
			: ''}"
	/>
</button>
