<script>
	import { goto } from '$app/navigation';

	/**
	 * @typedef {Object} Props
	 * @property {string} [selected]
	 */

	/** @type {Props} */
	let { selected = $bindable('') } = $props();

	/** @type {import('$lib/types/facility.types').Facility[]} */
	let facilities = $state([]);

	async function getFacilities() {
		facilities = await fetch('/api/facilities').then((r) => r.json());
	}
</script>

<form onchange={() => goto(`/facility/${selected}`)} class="my-6 text-right">
	{#await getFacilities()}
		<div>fetching...</div>
	{:then}
		<select bind:value={selected} class="text-sm">
			{#each facilities as { name, code } (code)}
				<option value={code}>{name}</option>
			{/each}
		</select>
	{:catch error}
		<div>Error {error}</div>
	{/await}
</form>
