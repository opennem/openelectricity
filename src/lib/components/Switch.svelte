<script>
	/** @type {{ label: string, value: string | number }[]} */
	export let buttons = [];
	/** @type {string | number } */
	export let selected = '';
	/** @type {(value: string) => void} */
	export let onChange = (value) => {};
</script>

<div class={`flex text-xs ${$$restProps.class}`}>
	{#each buttons as { label, value }}
		<button
			on:click={(e) => onChange(e.currentTarget.value)}
			{value}
			class="bg-light-warm-grey hover:bg-white border border-solid border-mid-warm-grey border-r-0 px-4 py-2 first:rounded-md first:rounded-r-none last:rounded-md last:rounded-l-none last:border-r"
			class:bg-white={selected === value}
		>
			{label}
		</button>
	{/each}
</div>
