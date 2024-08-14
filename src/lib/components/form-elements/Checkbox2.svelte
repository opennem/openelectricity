<script>
	export let name = '';
	export let label = '';
	export let checked = false;
	export let indeterminate = false;
</script>

<div class="relative flex items-center select-none">
	<input
		id={name}
		aria-describedby="comments-description"
		{name}
		type="checkbox"
		bind:checked
		bind:indeterminate
		on:change
		class="size-6 rounded border-gray-300 text-dark-grey focus:ring-dark-grey"
	/>
	<div class="ml-3 text-sm">
		<label for={name}>{label}</label>
	</div>
</div>
