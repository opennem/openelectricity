<script>
	import { fly, fade } from 'svelte/transition';
	import { fuelTechNameMap } from '$lib/fuel_techs';
	import FuelTechBadge from '../../../routes/(main)/facilities/_components/FuelTechBadge.svelte';
	import { regions as regionDefs } from '../../../routes/(main)/facilities/_utils/filters.js';

	/**
	 * @typedef {Object} Facility
	 * @property {string} code
	 * @property {string} name
	 * @property {string} network_id
	 * @property {string} network_region
	 * @property {string[]} [fuel_techs]
	 */

	/** Network-level labels beyond region (e.g. "WEM" → "Western Australia") */
	const networkLabels = {
		WEM: ['wem', 'western australia', 'wa'],
		NEM: ['nem', 'national electricity market']
	};

	/**
	 * Build a lowercase search haystack for a facility: name, code,
	 * fuel-tech names, region short/long labels, network labels.
	 * @param {Facility} f
	 * @returns {string}
	 */
	function buildHaystack(f) {
		const parts = [f.name, f.code];

		if (f.fuel_techs?.length) {
			for (const ft of f.fuel_techs) {
				parts.push(ft);
				const name =
					fuelTechNameMap[/** @type {keyof typeof fuelTechNameMap} */ (ft)];
				if (name) parts.push(name);
			}
		}

		if (f.network_region) {
			const key = f.network_region.toLowerCase();
			parts.push(key);
			const match = regionDefs.find((r) => r.value === key);
			if (match) {
				if (match.label) parts.push(match.label);
				if (match.longLabel) parts.push(match.longLabel);
			}
		}

		if (f.network_id) {
			parts.push(f.network_id);
			const extras = networkLabels[/** @type {keyof typeof networkLabels} */ (f.network_id)];
			if (extras) parts.push(...extras);
		}

		return parts.join(' ').toLowerCase();
	}

	/**
	 * @typedef {Object} Props
	 * @property {Facility[]} facilities
	 * @property {boolean} open
	 * @property {(code: string) => void} onselect
	 */

	/** @type {Props} */
	let { facilities, open = $bindable(false), onselect } = $props();

	let query = $state('');
	let activeIndex = $state(0);

	/** @type {HTMLDivElement | undefined} */
	let listEl = $state(undefined);

	// Pre-compute haystacks once per facilities array so typing doesn't rebuild them
	let haystacks = $derived(facilities.map((f) => buildHaystack(f)));

	let filtered = $derived.by(() => {
		const q = query.toLowerCase().trim();
		if (!q) return facilities;
		const terms = q.split(/\s+/).filter(Boolean);
		return facilities.filter((_, i) =>
			terms.every((term) => haystacks[i].includes(term))
		);
	});

	// Reset highlight only when the user types (query changes) — not when the
	// `filtered` derived re-computes for any reactive reason.
	$effect(() => {
		const _q = query;
		activeIndex = 0;
	});

	/** @param {HTMLInputElement} node */
	function autofocus(node) {
		node.focus();
	}

	function close() {
		open = false;
		query = '';
		activeIndex = 0;
	}

	/** @param {string} code */
	function handleSelect(code) {
		onselect(code);
		close();
	}

	function scrollActiveIntoView() {
		if (!listEl) return;
		const btn = listEl.querySelector(`[data-index="${activeIndex}"]`);
		if (btn instanceof HTMLElement) {
			btn.scrollIntoView({ block: 'nearest' });
		}
	}

	/** @param {KeyboardEvent} e */
	function handleKeydown(e) {
		if (e.key === 'Escape') {
			e.preventDefault();
			close();
			return;
		}

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (filtered.length === 0) return;
			activeIndex = (activeIndex + 1) % filtered.length;
			scrollActiveIntoView();
			return;
		}

		if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (filtered.length === 0) return;
			activeIndex = (activeIndex - 1 + filtered.length) % filtered.length;
			scrollActiveIntoView();
			return;
		}

		if (e.key === 'Enter') {
			e.preventDefault();
			const picked = filtered[activeIndex] ?? filtered[0];
			if (picked) handleSelect(picked.code);
		}
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 bg-black/40 backdrop-blur-sm z-[10000] flex items-start justify-center pt-[15vh]"
		transition:fade={{ duration: 150 }}
		onclick={close}
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden"
			transition:fly={{ y: -10, duration: 150 }}
			onclick={(e) => e.stopPropagation()}
		>
			<input
				use:autofocus
				type="text"
				placeholder="Search facilities by name, fuel tech and region"
				class="w-full text-sm px-5 py-3 border-b border-warm-grey focus:outline-none placeholder:text-xs placeholder:text-mid-grey"
				bind:value={query}
				onkeydown={handleKeydown}
			/>

			<div bind:this={listEl} class="max-h-[400px] overflow-y-auto p-2 min-h-[60px]">
				{#if filtered.length === 0}
					<div class="px-4 py-3 text-sm text-mid-grey text-center">No facilities found</div>
				{:else}
					{#each filtered as facility, i (facility.code)}
						<button
							data-index={i}
							class="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-left text-dark-grey hover:bg-warm-grey {i ===
							activeIndex
								? 'bg-warm-grey'
								: ''}"
							onclick={() => handleSelect(facility.code)}
							onmousemove={() => {
								if (activeIndex !== i) activeIndex = i;
							}}
						>
							<span class="text-sm truncate">{facility.name}</span>
							{#if facility.fuel_techs?.length}
								<span class="flex items-center gap-1 shrink-0">
									{#each facility.fuel_techs as ft (ft)}
										<span
											title={fuelTechNameMap[/** @type {keyof typeof fuelTechNameMap} */ (ft)] ||
												ft}
										>
											<FuelTechBadge fueltech_id={ft} size="sm" />
										</span>
									{/each}
								</span>
							{/if}
							<span
								class="ml-auto text-[10px] uppercase tracking-wider text-mid-grey font-mono shrink-0"
							>
								{facility.network_region}
							</span>
						</button>
					{/each}
				{/if}
			</div>

			<div
				class="border-t border-warm-grey px-4 py-2 text-[10px] text-mid-grey flex items-center justify-between font-mono gap-4"
			>
				<span>
					{filtered.length} of {facilities.length} facilities
				</span>
				<span class="hidden sm:inline-flex items-center gap-3 text-mid-grey">
					<span class="inline-flex items-center gap-1">
						<kbd
							class="text-[10px] font-sans text-dark-grey bg-light-warm-grey border border-warm-grey rounded px-1.5 py-0.5 leading-none"
							>↑</kbd
						>
						<kbd
							class="text-[10px] font-sans text-dark-grey bg-light-warm-grey border border-warm-grey rounded px-1.5 py-0.5 leading-none"
							>↓</kbd
						>
						navigate
					</span>
					<span class="inline-flex items-center gap-1">
						<kbd
							class="text-[10px] font-sans text-dark-grey bg-light-warm-grey border border-warm-grey rounded px-1.5 py-0.5 leading-none"
							>⏎</kbd
						>
						select
					</span>
					<span class="inline-flex items-center gap-1">
						<kbd
							class="text-[10px] font-sans text-dark-grey bg-light-warm-grey border border-warm-grey rounded px-1.5 py-0.5 leading-none"
							>esc</kbd
						>
						close
					</span>
				</span>
			</div>
		</div>
	</div>
{/if}
