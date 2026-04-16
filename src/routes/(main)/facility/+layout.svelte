<script>
	import { goto } from '$app/navigation';
	import { page, navigating } from '$app/state';
	import { onMount } from 'svelte';

	import FullscreenLayout from '$lib/components/fullscreen/FullscreenLayout.svelte';
	import ShortcutsToast from '$lib/components/ShortcutsToast.svelte';
	import { createDragHandler, DragHandle } from '$lib/components/ui/panel';
	import { hasBidirectionalBattery, filterDerivedBatteryUnits } from '../facilities/_utils/units';
	import { regions as regionDefs } from '../facilities/_utils/filters.js';

	import FacilityPickerBar from './[code]/_components/FacilityPickerBar.svelte';
	import FacilityListPanel from './[code]/_components/FacilityListPanel.svelte';

	/**
	 * @typedef {Object} FacilityListItem
	 * @property {string} code
	 * @property {string} name
	 * @property {string} network_id
	 * @property {string} network_region
	 * @property {string[]} [fuel_techs]
	 * @property {number} capacity
	 */

	/** @type {{ data: any, children: any }} */
	let { data, children } = $props();

	/** @type {FacilityListItem[]} */
	let facilitiesList = $state.raw([]);

	$effect(() => {
		let cancelled = false;
		Promise.resolve(data.facilities).then((list) => {
			if (!cancelled) facilitiesList = list || [];
		});
		return () => {
			cancelled = true;
		};
	});

	// Picker bar needs the currently-selected facility (from the nested page load)
	let selectedFacility = $derived.by(() => {
		const f = page.data.facility;
		if (!f?.units) return f;
		return { ...f, units: filterDerivedBatteryUnits(f.units, hasBidirectionalBattery(f)) };
	});

	let currentCode = $derived(page.params.code ?? '');
	let regionValue = $derived(selectedFacility?.network_region?.toLowerCase() ?? null);
	let regionLabel = $derived(
		regionValue ? (regionDefs.find((r) => r.value === regionValue)?.longLabel ?? '') : ''
	);

	// Fullscreen state driven by ?fullscreen=true URL param
	let isFullscreen = $derived(page.url.searchParams.get('fullscreen') === 'true');

	function toggleFullscreen() {
		const url = new URL(page.url);
		if (isFullscreen) url.searchParams.delete('fullscreen');
		else url.searchParams.set('fullscreen', 'true');
		goto(`${url.pathname}${url.search}`, { noScroll: true, replaceState: true, keepFocus: true });
	}

	let showShortcutsToast = $state(false);
	let leftOpen = $state(false);
	/** @type {{ focusSearch: () => void } | null} */
	let listPanel = $state(null);
	let isMobile = $state(false);
	let isMac = $state(true);

	onMount(() => {
		isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
		const mq = window.matchMedia('(max-width: 767px)');
		isMobile = mq.matches;
		const update = (/** @type {MediaQueryListEvent} */ e) => (isMobile = e.matches);
		mq.addEventListener('change', update);
		return () => mq.removeEventListener('change', update);
	});

	const listDrag = createDragHandler({
		axis: 'x',
		min: 240,
		max: 500,
		initial: 300,
		storageKey: 'facility-detail-list-width'
	});

	function openLeftPanelAndFocus() {
		if (!leftOpen) leftOpen = true;
		queueMicrotask(() => listPanel?.focusSearch());
	}

	/** @param {string} code */
	function handleFacilitySelect(code) {
		if (code === currentCode) return;
		goto(`/facility/${code}`, { noScroll: true, keepFocus: true });
	}

	/** @param {KeyboardEvent} e */
	function handleKeydown(e) {
		if (e.key === 'Escape') {
			if (showShortcutsToast) {
				e.preventDefault();
				showShortcutsToast = false;
			}
			return;
		}

		// ⌘K / Ctrl+K: toggle the list panel (works even when focus is in an input)
		if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
			e.preventDefault();
			if (leftOpen) leftOpen = false;
			else openLeftPanelAndFocus();
			return;
		}

		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

		if (e.key === '/') {
			e.preventDefault();
			openLeftPanelAndFocus();
			return;
		}

		if (e.key === '?') {
			showShortcutsToast = !showShortcutsToast;
			return;
		}

		if (e.key === 'f' || e.key === 'F') {
			if (e.shiftKey) return;
			e.preventDefault();
			toggleFullscreen();
			showShortcutsToast = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<FullscreenLayout {isFullscreen} onexitfullscreen={toggleFullscreen}>
	{#snippet filterBar()}
		<div
			class="shrink-0 border-b border-warm-grey {isFullscreen
				? 'md:border-0 md:px-6 md:pt-6'
				: 'px-4'}"
		>
			<FacilityPickerBar
				selectedLabel={selectedFacility?.name ?? ''}
				{regionValue}
				{regionLabel}
				{isFullscreen}
				onfullscreenchange={toggleFullscreen}
				onshowshortcuts={() => (showShortcutsToast = !showShortcutsToast)}
				onsearchfacilities={openLeftPanelAndFocus}
				searchShortcutKeys={[isMac ? '⌘' : 'Ctrl', 'K']}
			/>
		</div>
	{/snippet}

	{#snippet content()}
		<section
			class="relative flex flex-col px-4 pb-4 md:px-6 md:pb-6 pt-3 md:pt-4 {isFullscreen
				? 'flex-1 min-h-0'
				: 'h-[calc(100dvh-214px)] md:h-[calc(100dvh-300px)] md:min-h-[700px]'}"
		>
			<div
				class="flex-1 flex flex-col min-h-0 rounded-lg border border-warm-grey overflow-hidden bg-white"
			>
				<div class="flex-1 flex flex-col md:flex-row min-h-0">
					{#if !isMobile}
						<div
							class="shrink-0 overflow-hidden transition-[width] duration-200 ease-out {leftOpen
								? 'border-r border-warm-grey'
								: ''}"
							style="width: {leftOpen ? listDrag.value : 0}px"
						>
							{#if leftOpen}
								<FacilityListPanel
									bind:this={listPanel}
									facilities={facilitiesList}
									{currentCode}
									onclose={() => (leftOpen = false)}
									onselect={handleFacilitySelect}
								/>
							{/if}
						</div>
						{#if leftOpen}
							<DragHandle axis="x" onstart={listDrag.start} active={listDrag.isDragging} />
						{/if}
					{:else if leftOpen}
						<div class="fixed inset-0 z-40 bg-white">
							<FacilityListPanel
								bind:this={listPanel}
								facilities={facilitiesList}
								{currentCode}
								onclose={() => (leftOpen = false)}
								onselect={handleFacilitySelect}
							/>
						</div>
					{/if}

					<!-- Middle + right: rendered by the nested page -->
					<div class="flex-1 flex flex-col min-w-0 min-h-0 relative">
						{@render children()}
						{#if navigating.to && navigating.to.url.pathname.startsWith('/facility/')}
							<div
								class="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-20 pointer-events-none"
							>
								<div
									class="w-8 h-8 border-2 border-warm-grey border-t-red rounded-full animate-spin"
								></div>
							</div>
						{/if}
					</div>
				</div>

				<footer
					class="shrink-0 border-t border-warm-grey bg-light-warm-grey/40 px-4 py-2 flex items-center justify-between gap-3"
				>
					<a
						href="/"
						class="text-[10px] font-semibold tracking-wider uppercase text-dark-grey no-underline hover:text-red"
					>
						Open Electricity
					</a>
					<span class="text-[10px] text-mid-grey font-mono">Australian energy data</span>
				</footer>
			</div>
		</section>
	{/snippet}
</FullscreenLayout>

<ShortcutsToast
	visible={showShortcutsToast}
	ondismiss={() => (showShortcutsToast = false)}
	shortcuts={[
		{ label: 'Toggle facility list', keys: [isMac ? '⌘' : 'Ctrl', 'K'] },
		{ label: 'Search facilities', keys: ['/'] },
		{ label: 'Enter / exit full screen', keys: ['F'] },
		{ label: 'Show shortcuts', keys: ['?'] }
	]}
/>
