<script>
	export let disabled = false;
</script>

<button
	on:click
	class="button rounded-lg border-solid border border-black p-3 font-space appearance-none text-sm font-medium bg-white hover:bg-dark-grey text-dark-grey hover:text-white {$$restProps.class}"
	{disabled}
>
	<slot />
</button>
