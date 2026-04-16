<script>
	import { onMount, onDestroy } from 'svelte';
	import { X } from '@lucide/svelte';
	import { fuelTechNameMap } from '$lib/fuel_techs';
	import { getFueltechColor } from '../../../facilities/_utils/fueltech-display';
	import { regions as regionDefs } from '../../../facilities/_utils/filters.js';
	import formatValue from '../../../facilities/_utils/format-value.js';
	import { PanelHeader } from '$lib/components/ui/panel';

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
				const name = fuelTechNameMap[/** @type {keyof typeof fuelTechNameMap} */ (ft)];
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

	/** @type {Props} */
	let { facilities, currentCode, onclose, onselect } = $props();

	let query = $state('');

	// Initialise highlight at the currently-selected facility so arrow keys start there.
	// We only want the initial value here — no reactivity needed.
	// svelte-ignore state_referenced_locally
	const initialIndex = facilities.findIndex((f) => f.code === currentCode);
	let activeIndex = $state(initialIndex >= 0 ? initialIndex : 0);

	/** @type {HTMLInputElement | undefined} */
	let inputEl = $state(undefined);
	/** @type {HTMLDivElement | undefined} */
	let listEl = $state(undefined);

	// Pre-compute haystacks once per facilities array so typing doesn't rebuild them
	let haystacks = $derived(facilities.map((f) => buildHaystack(f)));

	let filtered = $derived.by(() => {
		const q = query.toLowerCase().trim();
		if (!q) return facilities;
		const terms = q.split(/\s+/).filter(Boolean);
		return facilities.filter((_, i) => terms.every((term) => haystacks[i].includes(term)));
	});

	// Reset highlight to 0 when the user types — but skip the initial effect run
	// so the onMount-set activeIndex (pointing at currentCode) is preserved.
	let hasUserTyped = false;
	$effect(() => {
		const _ = query;
		if (hasUserTyped) {
			activeIndex = 0;
		} else {
			hasUserTyped = true;
		}
	});

	export function focusSearch() {
		inputEl?.focus();
		inputEl?.select();
	}

	// On mount (panel just opened), scroll the currently-selected facility into view
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

	/**
	 * Debounced select for arrow-key navigation — avoids firing a fresh page
	 * load on every keystroke when the user is scrubbing through the list.
	 * @param {string} code
	 */
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
					class="flex w-full items-stretch gap-2 text-left text-dark-grey transition-colors border-l-2 border-transparent [content-visibility:auto] [contain-intrinsic-size:auto_36px] {isActive
						? 'bg-warm-grey'
						: 'hover:bg-light-warm-grey'} {isCurrent ? 'border-red' : ''}"
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
						class="flex-1 min-w-0 flex items-center gap-2 py-2 pr-3 {facility.fuel_techs?.length
							? ''
							: 'pl-3'}"
					>
						<span class="text-sm truncate min-w-0">{facility.name}</span>
						<span class="text-[9px] uppercase tracking-wider text-mid-grey font-mono shrink-0">
							{facility.network_region}
						</span>
						<span
							class="ml-auto font-mono tabular-nums shrink-0 w-20 text-right whitespace-nowrap text-dark-grey"
						>
							{#if facility.capacity > 0}
								<span class="text-[11px]">{formatValue(facility.capacity)}</span>
								<span class="text-[9px] text-mid-grey ml-0.5">MW</span>
							{:else}
								<span class="text-[11px] text-mid-grey">—</span>
							{/if}
						</span>
					</span>
				</button>
			{/each}
		{/if}
	</div>
</div>
