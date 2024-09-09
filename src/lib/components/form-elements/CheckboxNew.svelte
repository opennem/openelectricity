<script>
	import IconCheckMark from '$lib/icons/CheckMark.svelte';

	export let name = '';
	export let label = '';
	export let checked = false;
	export let indeterminate = false;
</script>

<label for={name} class="relative flex items-center select-none">
	<input
		id={name}
		aria-describedby="comments-description"
		{name}
		type="checkbox"
		bind:checked
		bind:indeterminate
		on:change
		class="hidden size-6 rounded border-gray-300 text-dark-grey focus:ring-dark-grey"
	/>

	<div class="border border-mid-warm-grey rounded size-7" class:bg-warm-grey={checked}>
		{#if checked}
			<IconCheckMark class="size-6" />
		{/if}
	</div>

	<div class="ml-3 text-sm">
		{label}
	</div>
</label>
