<script>
	import { goto } from '$app/navigation';
	import { page, navigating } from '$app/state';
	import { building } from '$app/environment';
	import { onMount, setContext, tick } from 'svelte';
	import { fly } from 'svelte/transition';

	import {
		FullscreenLayout,
		FullscreenContainer,
		FullscreenFooter
	} from '$lib/components/fullscreen';
	import ShortcutsToast from '$lib/components/ShortcutsToast.svelte';
	import { createDragHandler, DragHandle } from '$lib/components/ui/panel';
	import { Backdrop } from '$lib/components/ui/backdrop';
	import { portal } from '$lib/actions/portal.js';
	import { hasBidirectionalBattery, filterDerivedBatteryUnits } from '../facilities/_utils/units';
	import { regions as regionDefs } from '../facilities/_utils/filters.js';
	import { MediaQuery } from 'svelte/reactivity';
	import {
		BELOW_TABLET_QUERY,
		isFullscreenUrl,
		toggleFullscreenMode
	} from '$lib/utils/fullscreen-mode.js';
	import { streamedState } from '$lib/utils/streamed-state.svelte.js';

	import FacilityPickerBar from './[code]/_components/FacilityPickerBar.svelte';
	import FacilityListPanel from './[code]/_components/FacilityListPanel.svelte';
	import PageOptionsMenu from '$lib/components/PageOptionsMenu.svelte';
	import { ArrowLeft } from '@lucide/svelte';
	import { backToFacilities } from './_utils/back-navigation.js';

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

	/** @type {{ readonly current: FacilityListItem[] | null }} */
	const streamedFacilities = streamedState(() => data.facilities);
	let facilitiesList = $derived(streamedFacilities.current ?? []);

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

	/** Chart CSV exports registered by the facility page — the chart data lives
	 *  in the page, but the options menus that surface the downloads (desktop
	 *  picker bar + mobile floating kebab) are layout chrome, so the page pushes
	 *  its entries up through this context handle (same shape as the
	 *  `layout-fullscreen` precedent in the main layout). */
	/** @type {{ items: Array<{ key: string, label: string }>, download: (key: string) => void } | null} */
	let chartDownloads = $state(null);
	setContext('facility-chart-downloads', {
		/** @param {{ items: Array<{ key: string, label: string }>, download: (key: string) => void }} value */
		set: (value) => (chartDownloads = value),
		clear: () => (chartDownloads = null)
	});

	let showShortcutsToast = $state(false);
	let leftOpen = $state(false);
	/** @type {{ focusSearch: () => void } | null} */
	let listPanel = $state(null);
	let isMobile = $state(false);
	let isMac = $state(true);

	// Fullscreen by default (the layout load returns `fullscreen: true`); an
	// explicit `?fullscreen=false` opts into windowed mode (F shortcut toggles)
	// — desktop only: below the tablet breakpoint (768px, matching the
	// `tablet:`/`max-tablet:` CSS gates and `isMobile` — see BELOW_TABLET_QUERY)
	// the param is ignored and the page is always fullscreen (the root layout
	// hides the global chrome there via CSS). `building` guard: reading
	// searchParams during prerender crashes the build (this is why the old
	// `prerender = 'auto'` was disabled). At build there is no windowed state,
	// so it resolves to fullscreen and hydrates correctly.
	const belowTablet = new MediaQuery(BELOW_TABLET_QUERY);
	let isFullscreen = $derived(building ? true : belowTablet.current || isFullscreenUrl(page.url));

	function toggleFullscreen() {
		if (belowTablet.current) return;
		toggleFullscreenMode(isFullscreen);
	}

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

	// On mobile the list is a modal, so a tap dismisses it and loads the facility.
	/** @param {string} code */
	function handleMobileSelect(code) {
		leftOpen = false;
		handleFacilitySelect(code);
	}

	/** @param {KeyboardEvent} e */
	function handleKeydown(e) {
		if (e.key === 'Escape') {
			if (showShortcutsToast) {
				e.preventDefault();
				showShortcutsToast = false;
			} else if (leftOpen) {
				e.preventDefault();
				leftOpen = false;
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

<FullscreenLayout {isFullscreen}>
	{#snippet filterBar()}
		<!-- The picker bar is desktop-only; on mobile the back + options buttons
		     float over the facility header instead (see the content snippet). -->
		<div
			class="relative z-40 shrink-0 border-b border-warm-grey hidden tablet:block {isFullscreen
				? ''
				: 'px-4'}"
		>
			<FacilityPickerBar
				selectedLabel={selectedFacility?.name ?? ''}
				selectedCode={currentCode}
				{regionValue}
				{regionLabel}
				{regionShortLabel}
				{isFullscreen}
				onfullscreenchange={toggleFullscreen}
				onshowshortcuts={() => (showShortcutsToast = !showShortcutsToast)}
				onsearchfacilities={openLeftPanelAndFocus}
				downloadItems={chartDownloads?.items ?? []}
				ondownloaditem={(key) => chartDownloads?.download(key)}
				showCopyLink
				searchShortcutKeys={[isMac ? '⌘' : 'Ctrl', 'K']}
			/>
		</div>
	{/snippet}

	{#snippet content()}
		<FullscreenContainer {isFullscreen} class="[view-transition-name:page-body]">
			<div class="flex-1 flex flex-col tablet:flex-row min-h-0">
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
				{/if}

				<div class="flex-1 flex flex-col min-w-0 min-h-0 relative">
					<!-- Mobile floating chrome over the facility header: back to the
					     facilities list on the left, the options menu on the right. -->
					<div class="tablet:hidden absolute top-3 left-3 z-30">
						<button
							type="button"
							class="{floatingCircleClass} text-white cursor-pointer"
							aria-label="Back to facilities"
							onclick={() => backToFacilities(currentCode, !isFullscreen)}
						>
							<ArrowLeft size={24} class="shrink-0" />
						</button>
					</div>
					<div class="tablet:hidden absolute top-3 right-3 z-30">
						<!-- No fullscreen toggle here — this menu is mobile-only, and
						     mobile is always fullscreen. -->
						<PageOptionsMenu
							onshowshortcuts={() => (showShortcutsToast = !showShortcutsToast)}
							onsearchfacilities={openLeftPanelAndFocus}
							downloadItems={chartDownloads?.items ?? []}
							ondownloaditem={(key) => chartDownloads?.download(key)}
							showCopyLink
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

			<!-- Mobile: the facility search list is a modal over the detail page;
			     tapping a facility dismisses it and loads that facility. -->
			<Backdrop open={isMobile && leftOpen} onclick={() => (leftOpen = false)} />
			{#if isMobile && leftOpen}
				<div
					use:portal
					class="fixed inset-x-3 top-14 bottom-3 z-[9999] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
					role="dialog"
					aria-modal="true"
					aria-label="Search facilities"
					transition:fly={{ y: 12, duration: 200 }}
				>
					<FacilityListPanel
						bind:this={listPanel}
						facilities={facilitiesList}
						{currentCode}
						onclose={() => (leftOpen = false)}
						onselect={handleMobileSelect}
					/>
				</div>
			{/if}

			{#snippet footer()}
				<!-- The tiny version strip is hidden on mobile, where the facility
				     detail page renders its own fixed bottom navigation. -->
				{#if !isMobile}
					<FullscreenFooter {isFullscreen} onenterfullscreen={toggleFullscreen} />
				{/if}
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
		...(belowTablet.current ? [] : [{ label: 'Enter / exit full screen', keys: ['F'] }]),
		{ label: 'Show shortcuts', keys: ['?'] }
	]}
/>
