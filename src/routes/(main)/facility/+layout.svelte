<script>
	import { goto } from '$app/navigation';
	import { page, navigating } from '$app/state';
	import { onMount, tick } from 'svelte';

	import {
		FullscreenLayout,
		FullscreenContainer,
		FullscreenFooter
	} from '$lib/components/fullscreen';
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

	async function openLeftPanelAndFocus() {
		if (!leftOpen) leftOpen = true;
		await tick();
		listPanel?.focusSearch();
	}

	/** @param {string} code */
	function handleFacilitySelect(code) {
		if (code === currentCode) return;
		goto(`/facility/${code}${page.url.search}`, { noScroll: true, keepFocus: true });
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

		// Handled above the input-focus guard so it still fires while typing in the search input.
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
			class="relative z-40 shrink-0 border-b border-warm-grey {isFullscreen
				? ''
				: 'px-4'}"
		>
			<FacilityPickerBar
				selectedLabel={selectedFacility?.name ?? ''}
				selectedCode={currentCode}
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
		<FullscreenContainer {isFullscreen} class="[view-transition-name:page-body]">
			<div class="flex-1 flex flex-col md:flex-row min-h-0">
				{#if !isMobile}
					<div
						class="shrink-0 overflow-hidden {leftOpen
							? 'border-r border-warm-grey'
							: ''} {listDrag.isDragging ? '' : 'transition-[width] duration-200 ease-out'}"
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

			{#snippet footer()}
				<FullscreenFooter {isFullscreen} onenterfullscreen={toggleFullscreen} />
			{/snippet}
		</FullscreenContainer>
	{/snippet}
</FullscreenLayout>

<ShortcutsToast
	visible={showShortcutsToast}
	ondismiss={() => (showShortcutsToast = false)}
	shortcuts={[
		{ label: 'Toggle facility list', keys: [isMac ? '⌘' : 'Ctrl', 'K'] },
		{ label: 'Search facilities', keys: ['/'] },
		{ label: 'Toggle navigation menu', keys: ['G'] },
		{ label: 'Enter / exit full screen', keys: ['F'] },
		{ label: 'Show shortcuts', keys: ['?'] }
	]}
/>

