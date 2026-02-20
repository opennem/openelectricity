<script>
	import { Popover } from 'bits-ui';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';

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
	 * @property {boolean} open
	 * @property {(code: string) => void} onselect
	 */

	/** @type {Props} */
	let { facilities, open = $bindable(false), onselect } = $props();

	let query = $state('');

	let filtered = $derived.by(() => {
		const q = query.toLowerCase().trim();
		if (!q) return facilities.slice(0, 50);
		return facilities.filter((f) => f.name.toLowerCase().includes(q) || f.code.toLowerCase().includes(q)).slice(0, 50);
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

<Popover.Root bind:open>
	<Popover.Trigger
		class="px-2.5 py-1.5 text-sm font-medium rounded-md flex items-center gap-1.5 transition-colors {open
			? 'bg-dark-grey text-white'
			: 'border border-warm-grey text-mid-grey hover:bg-light-warm-grey'}"
	>
		Search
		<ChevronDown size={14} />
	</Popover.Trigger>

	<Popover.Content sideOffset={6} class="z-50 border border-warm-grey bg-white shadow-lg rounded-xl w-80 overflow-hidden">
		<input
			type="text"
			placeholder="Search facilities..."
			class="w-full px-3 py-2 text-sm border-b border-warm-grey focus:outline-none"
			bind:value={query}
		/>

		<div class="max-h-80 overflow-y-auto">
			{#if filtered.length === 0}
				<div class="px-3 py-4 text-sm text-mid-grey text-center">No facilities found</div>
			{:else}
				{#each filtered as facility (facility.code)}
					<button
						class="w-full text-left px-3 py-2 text-sm hover:bg-light-warm-grey transition-colors"
						onclick={() => handleSelect(facility.code)}
					>
						<div class="text-dark-grey">{facility.name}</div>
						<span class="text-xs text-mid-grey">{facility.code} · {facility.network_region}</span>
					</button>
				{/each}
			{/if}
		</div>
	</Popover.Content>
</Popover.Root>
