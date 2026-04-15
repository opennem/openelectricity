<script>
	/**
	 * @typedef {Object} Props
	 * @property {{ label?: string, value: string | number, icon?: *, size?: string }[]} [buttons]
	 * @property {string | number } [selected]
	 * @property {boolean} [compact]
	 * @property {(option: {value: string}) => void} [onchange]
	 */

	/** @type {Props & { [key: string]: any }} */
	let { buttons = [], selected = '', compact = false, onchange, ...rest } = $props();

	let isSelected = $derived((/** @type {string | number} */ value) => selected === value);

	/**
	 * @param {MouseEvent} e
	 */
	function handleClick(e) {
		const value = /** @type {HTMLButtonElement} */ (e.currentTarget).value;
		onchange?.({ value });
	}
</script>

<!-- selected === value -->

<div
	class={`flex md:inline-flex rounded-xl bg-light-warm-grey border border-solid border-mid-warm-grey ${compact ? 'text-xs' : 'text-sm'} ${rest.class}`}
>
	{#each buttons as { label, value, icon, size } (value)}
		<button
			onclick={handleClick}
			{value}
			class="flex w-full gap-3 md:w-auto items-center justify-center hover:text-black border rounded-xl whitespace-nowrap cursor-pointer {compact
				? 'px-3 py-1.5 md:px-4 md:py-1.5'
				: 'px-4 py-4 md:px-8 md:py-4'}"
			class:bg-white={isSelected(value)}
			class:text-black={isSelected(value)}
			class:border-black={isSelected(value)}
			class:shadow-lg={isSelected(value)}
			class:text-mid-grey={!isSelected(value)}
			class:border-transparent={!isSelected(value)}
		>
			{#if icon}
				{@const SvelteComponent = icon}
				<SvelteComponent class={size} />
			{/if}
			{#if label}
				{label}
			{/if}
		</button>
	{/each}
</div>

<style>
	.shadow {
		box-shadow: 0.2rem 0 0.3rem 0 rgba(0, 0, 0, 0.1);
	}
</style>
