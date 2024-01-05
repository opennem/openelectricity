<script>
	/** @typedef {string|number} Values */

	export let id = '';
	export let value = '';

	/** @type {Values[]}*/
	export let options = [];
</script>

<select
	bind:value
	{id}
	class="w-full block rounded-md text-base border-0 py-4 pl-4 pr-12 text-dark-grey ring-1 ring-mid-warm-grey focus:ring-dark-grey"
>
	{#each options as option}
		<option value={option}>{option}</option>
	{/each}
</select>
