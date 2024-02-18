<script>
	/** @type {import('svelte/elements').MouseEventHandler<HTMLButtonElement> | null} */
	export let clickHandler = null;
	export let secondary = false;
	export let active = false;
</script>

<button
	on:click={clickHandler}
	class="button rounded-md border-solid border-[0.1rem] border-black p-4 font-space appearance-none text-sm font-medium bg-black text-white ${$$restProps.class}"
	class:secondary
	class:active><slot /></button
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
	.secondary {
		background-color: #fff;
		border-color: theme(colors.dark-grey);
		color: #000;
	}
</style>
