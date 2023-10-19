<script>
	import { goto } from '$app/navigation';

	export let selected = '';

	/** @type {import('$lib/types/facility.types').Facility[]} */
	let facilities = [];

	async function getFacilities() {
		facilities = await fetch('/api/facilities').then((r) => r.json());
	}
</script>

<form on:change={() => goto(`/facility/${selected}`)} class="my-6 text-right">
	{#await getFacilities()}
		<div>fetching...</div>
	{:then}
		<select bind:value={selected} class="text-sm">
			{#each facilities as { name, code }}
				<option value={code}>{name}</option>
			{/each}
		</select>
	{:catch error}
		<div>Error {error}</div>
	{/await}
</form>
