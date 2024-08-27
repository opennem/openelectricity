<script>
	export let name = '';
	export let label = '';
	export let value;
	export let checked;

	$: radioId = `radio-${name}-${value}`;
</script>

<div class="flex items-center select-none">
	<input
		id={radioId}
		name={radioId}
		type="radio"
		{value}
		bind:group={checked}
		on:change
		class="h-4 w-4 border-gray-300 text-dark-grey focus:ring-dark-grey"
	/>
	<label for={radioId} class="ml-3 block text-sm font-medium leading-6 text-gray-900">{label}</label
	>
</div>
