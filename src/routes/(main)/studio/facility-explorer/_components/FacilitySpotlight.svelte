<script>
	import { fly, fade } from 'svelte/transition';

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

	const MAX_RESULTS = 15;

	let query = $state('');

	let filtered = $derived.by(() => {
		const q = query.toLowerCase().trim();
		if (!q) return facilities.slice(0, MAX_RESULTS);

		const terms = q.split(/\s+/).filter(Boolean);

		return facilities
			.filter((f) => {
				const haystack = `${f.name} ${f.code} ${f.network_region}`.toLowerCase();
				return terms.every((term) => haystack.includes(term));
			})
			.slice(0, MAX_RESULTS);
	});

	/** @param {HTMLInputElement} node */
	function autofocus(node) {
		node.focus();
	}

	function close() {
		open = false;
		query = '';
	}

	/**
	 * @param {string} code
	 */
	function handleSelect(code) {
		onselect(code);
		close();
	}

	/**
	 * @param {KeyboardEvent} e
	 */
	function handleKeydown(e) {
		if (e.key === 'Escape') {
			close();
		}
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center pt-[15vh]"
		transition:fade={{ duration: 150 }}
		onclick={close}
		onkeydown={handleKeydown}
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
			transition:fly={{ y: -10, duration: 150 }}
			onclick={(e) => e.stopPropagation()}
			onkeydown={handleKeydown}
		>
			<input
				use:autofocus
				type="text"
				placeholder="coal bayswater"
				class="w-full text-lg px-5 py-4 border-b border-warm-grey focus:outline-none"
				bind:value={query}
				onkeydown={handleKeydown}
			/>

			<div class="max-h-[400px] overflow-y-auto p-2">
				{#if filtered.length === 0}
					<div class="px-4 py-3 text-sm text-mid-grey text-center">No facilities found</div>
				{:else}
					{#each filtered as facility (facility.code)}
						<button
							class="flex w-full items-center justify-between rounded-lg px-4 py-2.5 text-left text-dark-grey hover:bg-warm-grey"
							onclick={() => handleSelect(facility.code)}
						>
							<span>{facility.name}</span>
							<span class="text-[10px] uppercase tracking-wider text-mid-grey font-mono">
								{facility.network_region}
							</span>
						</button>
					{/each}
				{/if}
			</div>
		</div>
	</div>
{/if}
