<script>
	/** @type {import('svelte/elements').FormEventHandler<HTMLInputElement> | null} */
	export let changeHandler = null;
	export let placeholder = '';
	export let value = '';
	export let type = 'text';
</script>

<input
	{type}
	class={`rounded-md border-solid placeholder:font-light border-[0.05rem] border-mid-warm-grey p-4 font-sans text-sm placeholder:text-mid-warm-grey focus:ring-0 focus:border-dark-grey ${$$restProps.class}`}
	{placeholder}
	{value}
	on:input|preventDefault={changeHandler}
/>
