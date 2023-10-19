<script>
	/** @type {{ label: string, value: string | number }[]} */
	export let buttons = [];
	export let selected = '';
</script>

<div class="flex gap-0.5 text-xs">
	{#each buttons as { label, value }}
		<button
			on:click
			{value}
			class="bg-slate-200 hover:bg-slate-300 px-4 py-2 first:rounded-md first:rounded-r-none last:rounded-md last:rounded-l-none"
			class:bg-slate-300={selected === value}
		>
			{label}
		</button>
	{/each}
</div>
