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
	import OptionsMenu from '../facilities/_components/OptionsMenu.svelte';
	import IconChevronLeft from '$lib/icons/ChevronLeft.svelte';

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
	let regionDef = $derived(regionValue ? regionDefs.find((r) => r.value === regionValue) : null);
	let regionLabel = $derived(regionDef?.longLabel ?? '');
	let regionShortLabel = $derived(regionDef?.label ?? '');

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

	// Dark floating circles over the facility header (mobile chrome) — one
	// definition so the back link and options trigger can't drift apart.
	const floatingCircleClass =
		'flex size-11 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition-colors hover:bg-black/55';

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
		// Carry the view settings across, but not the unit sheet — `?unit=` codes
		// belong to the facility being left.
		const params = new URLSearchParams(page.url.search);
		params.delete('unit');
		const search = params.size ? `?${params.toString()}` : '';
		goto(`/facility/${code}${search}`, { noScroll: true, keepFocus: true });
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
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<FullscreenLayout isFullscreen={true}>
	{#snippet filterBar()}
		<!-- The picker bar is desktop-only; on mobile the back + options buttons
		     float over the facility header instead (see the content snippet). -->
		<div class="relative z-40 shrink-0 border-b border-warm-grey hidden md:block">
			<FacilityPickerBar
				selectedLabel={selectedFacility?.name ?? ''}
				selectedCode={currentCode}
				{regionValue}
				{regionLabel}
				{regionShortLabel}
				onshowshortcuts={() => (showShortcutsToast = !showShortcutsToast)}
				onsearchfacilities={openLeftPanelAndFocus}
				searchShortcutKeys={[isMac ? '⌘' : 'Ctrl', 'K']}
			/>
		</div>
	{/snippet}

	{#snippet content()}
		<FullscreenContainer class="[view-transition-name:page-body]">
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
					<!-- Mobile floating chrome over the facility header: back to the
					     facilities list on the left, the options menu on the right. -->
					<div class="md:hidden absolute top-3 left-3 z-30">
						<a
							href="/facilities?view=list"
							class="{floatingCircleClass} text-white"
							aria-label="Back to facilities"
						>
							<IconChevronLeft class="size-6" />
						</a>
					</div>
					<div class="md:hidden absolute top-3 right-3 z-30">
						<OptionsMenu
							onshowshortcuts={() => (showShortcutsToast = !showShortcutsToast)}
							onsearchfacilities={openLeftPanelAndFocus}
							searchShortcutKeys={[isMac ? '⌘' : 'Ctrl', 'K']}
							triggerClass="{floatingCircleClass} cursor-pointer"
							iconClass="size-6 text-white"
						/>
					</div>
					{@render children()}
					{#if navigating.to && navigating.to.url.pathname.startsWith('/facility/') && navigating.to.url.pathname !== navigating.from?.url.pathname}
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
				<FullscreenFooter />
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
		{ label: 'Show shortcuts', keys: ['?'] }
	]}
/>
