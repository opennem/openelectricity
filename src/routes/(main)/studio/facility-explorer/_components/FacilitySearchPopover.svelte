<script>
	import { fly } from 'svelte/transition';
	import { clickoutside } from '@svelte-put/clickoutside';
	import IconChevronUpDown from '$lib/icons/ChevronUpDown.svelte';

	/**
	 * @typedef {Object} Facility
	 * @property {string} code
	 * @property {string} name
	 * @property {string} network_id
	 * @property {string} network_region
	 */

	/**
	 * @typedef {Object} Props
	 * @property {Facility[]} facilities
	 * @property {string} label
	 * @property {boolean} open
	 * @property {(code: string) => void} onselect
	 */

	/** @type {Props} */
	let { facilities, label, open = $bindable(false), onselect } = $props();

	let query = $state('');

	let filtered = $derived.by(() => {
		const q = query.toLowerCase().trim();
		if (!q) return facilities.slice(0, 50);
		return facilities
			.filter((f) => f.name.toLowerCase().includes(q) || f.code.toLowerCase().includes(q))
			.slice(0, 50);
	});

	/**
	 * @param {string} code
	 */
	function handleSelect(code) {
		onselect(code);
		open = false;
		query = '';
	}
</script>

<div
	class="relative"
	use:clickoutside
	onclickoutside={() => {
		open = false;
		query = '';
	}}
>
	<button
		class="flex items-center gap-2 px-4 py-3 rounded-lg hover:bg-warm-grey"
		onclick={() => (open = !open)}
	>
		<span class="font-semibold text-base capitalize">{label}</span>
		<IconChevronUpDown class="w-8 h-8" />
	</button>

	{#if open}
		<div
			class="border border-mid-grey bg-white absolute top-12 left-0 flex flex-col rounded-lg z-50 shadow-md text-sm w-96 overflow-hidden"
			in:fly={{ y: -5, duration: 150 }}
			out:fly={{ y: -5, duration: 150 }}
		>
			<input
				type="text"
				placeholder="Search facilities..."
				class="w-full px-4 py-2.5 text-sm border-b border-warm-grey focus:outline-none"
				bind:value={query}
			/>

			<div class="max-h-[450px] overflow-y-auto p-2">
				{#if filtered.length === 0}
					<div class="px-4 py-3 text-sm text-mid-grey text-center">No facilities found</div>
				{:else}
					{#each filtered as facility (facility.code)}
						<button
							class="hover:bg-warm-grey w-full rounded-md px-4 py-2 text-left text-dark-grey"
							onclick={() => handleSelect(facility.code)}
						>
							{facility.name}
						</button>
					{/each}
				{/if}
			</div>
		</div>
	{/if}
</div>
