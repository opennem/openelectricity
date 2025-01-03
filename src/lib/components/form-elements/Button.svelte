<script>
	
	/**
	 * @typedef {Object} Props
	 * @property {import('svelte/elements').MouseEventHandler<HTMLButtonElement> | null} [clickHandler]
	 * @property {boolean} [secondary]
	 * @property {boolean} [active]
	 * @property {boolean} [disabled]
	 * @property {import('svelte').Snippet} [children]
	 */

	/** @type {Props & { [key: string]: any }} */
	let {
		clickHandler = null,
		secondary = false,
		active = false,
		disabled = false,
		children,
		...rest
	} = $props();
</script>

<button
	onclick={clickHandler}
	class="button rounded-md border-solid border-[0.1rem] border-black p-4 font-space appearance-none text-sm font-medium bg-black text-white ${rest.class}"
	class:secondary
	class:active
	{disabled}>{@render children?.()}</button
>

<style lang="postcss">
	.button,
	.button:active {
		transition: all 0.5s ease;
	}
	.button:hover,
	.active {
		background-color: theme(colors.dark-grey);
		color: #fff;
	}
	.button:disabled {
		background-color: theme(colors.light-warm-grey);
	}
	.secondary {
		background-color: #fff;
		border-color: theme(colors.dark-grey);
		color: #000;
	}
</style>
