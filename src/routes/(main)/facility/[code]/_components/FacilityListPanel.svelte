<script>
	import { onMount, onDestroy } from 'svelte';
	import { X } from '@lucide/svelte';
	import { fuelTechNameMap } from '$lib/fuel_techs';
	import { getFueltechColor } from '$lib/utils/fueltech-display';
	import formatValue from '../../../facilities/_utils/format-value.js';
	import { PanelHeader } from '$lib/components/ui/panel';
	import {
		buildFacilityHaystack,
		parseQueryTerms
	} from '$lib/components/facility/facility-search.js';

	/**
	 * @typedef {Object} Facility
	 * @property {string} code
	 * @property {string} name
	 * @property {string} network_id
	 * @property {string} network_region
	 * @property {string[]} [fuel_techs]
	 * @property {number} capacity
	 */

	/**
	 * @typedef {Object} Props
	 * @property {Facility[]} facilities
	 * @property {string} currentCode
	 * @property {() => void} onclose
	 * @property {(code: string) => void} onselect
	 */

	/** @type {Props} */
	let { facilities, currentCode, onclose, onselect } = $props();

	let query = $state('');

	// svelte-ignore state_referenced_locally
	const initialIndex = facilities.findIndex((f) => f.code === currentCode);
	let activeIndex = $state(initialIndex >= 0 ? initialIndex : 0);

	/** @type {HTMLInputElement | undefined} */
	let inputEl = $state(undefined);
	/** @type {HTMLDivElement | undefined} */
	let listEl = $state(undefined);

	let haystacks = $derived(facilities.map(buildFacilityHaystack));

	let filtered = $derived.by(() => {
		const terms = parseQueryTerms(query);
		if (terms.length === 0) return facilities;
		return facilities.filter((_, i) => terms.every((term) => haystacks[i].includes(term)));
	});

	export function focusSearch() {
		inputEl?.focus();
		inputEl?.select();
	}

	onMount(() => {
		queueMicrotask(() => {
			if (!listEl) return;
			const btn = listEl.querySelector(`[data-code="${currentCode}"]`);
			if (btn instanceof HTMLElement) {
				btn.scrollIntoView({ block: 'center' });
			}
		});
	});

	/** @type {ReturnType<typeof setTimeout> | null} */
	let navDebounceTimer = null;

	/** @param {string} code */
	function handleSelect(code) {
		if (navDebounceTimer) {
			clearTimeout(navDebounceTimer);
			navDebounceTimer = null;
		}
		onselect(code);
	}

	// Debounced so holding an arrow key doesn't kick off a goto() on every keystroke.
	/** @param {string} code */
	function debouncedSelect(code) {
		if (navDebounceTimer) clearTimeout(navDebounceTimer);
		navDebounceTimer = setTimeout(() => {
			navDebounceTimer = null;
			onselect(code);
		}, 250);
	}

	onDestroy(() => {
		if (navDebounceTimer) clearTimeout(navDebounceTimer);
	});

	function scrollActiveIntoView() {
		if (!listEl) return;
		const btn = listEl.querySelector(`[data-index="${activeIndex}"]`);
		if (btn instanceof HTMLElement) {
			btn.scrollIntoView({ block: 'nearest' });
		}
	}

	/** @param {KeyboardEvent} e */
	function handleKeydown(e) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			if (filtered.length === 0) return;
			activeIndex = (activeIndex + 1) % filtered.length;
			scrollActiveIntoView();
			const picked = filtered[activeIndex];
			if (picked) debouncedSelect(picked.code);
			return;
		}

		if (e.key === 'ArrowUp') {
			e.preventDefault();
			if (filtered.length === 0) return;
			activeIndex = (activeIndex - 1 + filtered.length) % filtered.length;
			scrollActiveIntoView();
			const picked = filtered[activeIndex];
			if (picked) debouncedSelect(picked.code);
			return;
		}

		if (e.key === 'Enter') {
			e.preventDefault();
			const picked = filtered[activeIndex] ?? filtered[0];
			if (picked) handleSelect(picked.code);
		}
	}
</script>

<div class="flex flex-col w-full h-full min-h-0 overflow-hidden bg-white">
	<PanelHeader class="gap-2">
		<input
			bind:this={inputEl}
			type="search"
			placeholder="Search facilities"
			class="flex-1 min-w-0 text-xs px-3 py-1.5 rounded-md bg-white border border-warm-grey focus:outline-none focus:ring-0 focus:border-red transition-colors placeholder:text-mid-grey"
			bind:value={query}
			oninput={() => (activeIndex = 0)}
			onkeydown={handleKeydown}
		/>
		<span class="text-[10px] text-mid-grey tabular-nums font-mono shrink-0">
			{filtered.length}/{facilities.length}
		</span>
		<button
			onclick={onclose}
			class="p-1 rounded hover:bg-warm-grey text-mid-grey hover:text-dark-grey transition-colors cursor-pointer shrink-0"
			title="Close"
			aria-label="Close facility list"
		>
			<X size={14} />
		</button>
	</PanelHeader>

	<div bind:this={listEl} class="flex-1 overflow-y-auto p-2">
		{#if filtered.length === 0}
			<div class="px-4 py-3 text-sm text-mid-grey text-center">No facilities found</div>
		{:else}
			{#each filtered as facility, i (facility.code)}
				{@const isActive = i === activeIndex}
				{@const isCurrent = facility.code === currentCode}
				<button
					data-index={i}
					data-code={facility.code}
					class="flex w-full items-stretch gap-2 text-left text-dark-grey transition-colors border-l-2 border-b border-b-warm-grey border-l-transparent last:border-b-0 [content-visibility:auto] [contain-intrinsic-size:auto_72px] {isActive
						? 'bg-warm-grey'
						: 'hover:bg-light-warm-grey'} {isCurrent ? 'border-l-red' : ''}"
					onclick={() => {
						activeIndex = i;
						handleSelect(facility.code);
						inputEl?.focus();
					}}
				>
					{#if facility.fuel_techs?.length}
						<span class="flex shrink-0 self-stretch" aria-hidden="true">
							{#each facility.fuel_techs as ft (ft)}
								<span
									class="w-[4px] self-stretch"
									style="background: {getFueltechColor(ft)}"
									title={fuelTechNameMap[/** @type {keyof typeof fuelTechNameMap} */ (ft)] || ft}
								></span>
							{/each}
						</span>
					{/if}
					<span
						class="flex-1 min-w-0 flex items-center gap-2 py-3 pr-3 {facility.fuel_techs?.length
							? ''
							: 'pl-3'}"
					>
						<span class="flex-1 min-w-0 flex flex-col gap-1">
							<span class="text-sm truncate min-w-0">{facility.name}</span>
							<span
								class="self-start text-[9px] uppercase tracking-wider text-mid-grey font-mono px-1.5 py-0.5 rounded bg-warm-grey/60"
							>
								{facility.network_region}
							</span>
						</span>
						<span
							class="ml-auto font-mono tabular-nums shrink-0 w-20 text-right whitespace-nowrap text-dark-grey flex flex-col items-end gap-1"
						>
							{#if facility.capacity > 0}
								<span class="text-sm font-bold">{formatValue(facility.capacity)}</span>
								<span class="text-[11px] text-mid-grey">MW</span>
							{:else}
								<span class="text-sm text-mid-grey">—</span>
							{/if}
						</span>
					</span>
				</button>
			{/each}
		{/if}
	</div>
</div>
