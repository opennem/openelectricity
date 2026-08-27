<script>
	import { building } from '$app/environment';
	import { pushState, replaceState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount, untrack } from 'svelte';
	import { PanelRightOpen, X } from '@lucide/svelte';
	import Meta from '$lib/components/Meta.svelte';
	import PageOptionsMenu from '$lib/components/PageOptionsMenu.svelte';
	import FormSelect from '$lib/components/form-elements/Select.svelte';
	import {
		FullscreenContainer,
		FullscreenFilterBar,
		FullscreenFooter,
		FullscreenLayout,
		FullscreenNavDropdown
	} from '$lib/components/fullscreen';
	import { createGridLive } from '$lib/flows/grid-live.svelte.js';
	import { isFullscreenUrl, toggleFullscreenMode } from '$lib/utils/fullscreen-mode.js';
	import { TRACKER_REGION_OPTIONS } from '../tracker-regions.js';
	import DashboardCanvas from './DashboardCanvas.svelte';
	import {
		MAX_PANELS,
		PANEL_CATALOGUE,
		SINGLETON_PANEL_TYPES,
		addPanel,
		builtinLayout,
		builtinLayouts,
		createPanel,
		duplicatePanel,
		movePanel,
		removePanel,
		resizePanel,
		validatePanels,
		updatePanelSettings
	} from './dashboard-model.js';
	import { applyDashboardUrl, parseDashboardUrl, copiedDashboardUrl } from './dashboard-url.js';

	/** @type {{ data: any }} */
	let { data } = $props();
	// Route data seeds component-local state once; back/forward synchronisation
	// is handled explicitly from the materialised URL below.
	const initialData = untrack(() => structuredClone(data));

	let selectedRegion = $state(initialData.region);
	let group = $state(initialData.group);
	let panels = $state(initialData.panels);
	let rangeSnapshot = $state(initialData.range);
	let layoutName = $state('Analysis');
	let activeLayoutKey = $state('builtin:analysis');
	let notice = $state('');
	let editing = $state(false);
	/** @type {{ panels: any[], layoutName: string, activeLayoutKey: string }} */
	let editSnapshot = { panels: [], layoutName: 'Analysis', activeLayoutKey: 'builtin:analysis' };
	let panelLibraryOpen = $state(false);
	/** @type {import('./DashboardCanvas.svelte').default | undefined} */
	let dashboardCanvas = $state(undefined);
	let suppressUrl = false;

	const grid = createGridLive();
	$effect(() => {
		grid.start();
		return () => grid.stop();
	});

	let isFullscreen = $derived(building ? true : isFullscreenUrl(page.url));
	let activeTypes = $derived(new Set(panels.map((/** @type {any} */ panel) => panel.type)));
	let layoutOptions = $derived.by(() => {
		/** @type {{label:string,value:string|null,isGroupHeader?:boolean}[]} */
		const options = [];
		if (activeLayoutKey === 'custom') options.push({ label: 'Custom', value: 'custom' });
		options.push({ label: 'Layout presets', value: null, isGroupHeader: true });
		options.push(
			...builtinLayouts().map((layout) => ({ label: layout.name, value: `builtin:${layout.id}` }))
		);
		return options;
	});

	function currentUrlState() {
		return { region: selectedRegion, group, range: rangeSnapshot };
	}

	function syncUrl(mode = 'replace') {
		if (suppressUrl || typeof window === 'undefined') return;
		const url = applyDashboardUrl(new URL(window.location.href), currentUrlState());
		if (mode === 'push')
			pushState(`${resolve('/(main)/studio/tracker/dashboard')}${url.search}`, {});
		else replaceState(`${resolve('/(main)/studio/tracker/dashboard')}${url.search}`, {});
	}

	function markCustomLayout() {
		activeLayoutKey = 'custom';
		layoutName = 'Custom';
	}

	/** @param {string} value @param {boolean} [update] */
	function handleRegionChange(value, update = true) {
		selectedRegion = value;
		if (update) syncUrl('push');
	}

	/** @param {string} value @param {boolean} [update] */
	function handleGroupChange(value, update = true) {
		group = value === 'simple' ? 'simple' : 'detailed';
		if (update) syncUrl('push');
	}

	/** @param {any} value */
	function handleRangeChange(value) {
		rangeSnapshot = value;
		syncUrl('replace');
	}

	/** @param {any[]} next */
	function setPanels(next) {
		panels = next;
		markCustomLayout();
	}

	/** @param {string} type */
	function makeId(type) {
		return `${type}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
	}

	/** @param {string} type */
	function addPanelType(type) {
		const panel = createPanel(makeId(type), type);
		if (!panel) return;
		setPanels(addPanel(panels, panel));
	}

	/** @param {string} sourceId @param {string} targetId */
	function reorderPanels(sourceId, targetId) {
		const next = [...panels];
		const source = next.findIndex((panel) => panel.instanceId === sourceId);
		const target = next.findIndex((panel) => panel.instanceId === targetId);
		if (source < 0 || target < 0) return;
		const [moved] = next.splice(source, 1);
		next.splice(target, 0, moved);
		setPanels(next);
	}

	function startEditing() {
		// `$state` arrays are deep proxies and cannot be passed to
		// `structuredClone`. Validation already returns a detached, JSON-safe
		// panel list, which is exactly what the edit-cancellation snapshot needs.
		editSnapshot = {
			panels: validatePanels(panels),
			layoutName,
			activeLayoutKey
		};
		editing = true;
		panelLibraryOpen = true;
	}

	function cancelEditing() {
		panels = editSnapshot.panels;
		layoutName = editSnapshot.layoutName;
		activeLayoutKey = editSnapshot.activeLayoutKey;
		editing = false;
		panelLibraryOpen = false;
	}

	function finishEditing() {
		editing = false;
		panelLibraryOpen = false;
	}

	/** @param {string} key */
	function applyLayoutPreset(key) {
		if (!key.startsWith('builtin:') || key === activeLayoutKey) return;
		const layout = builtinLayout(key.slice(8));
		panels = validatePanels(layout.panels);
		layoutName = layout.name;
		activeLayoutKey = key;
	}

	async function copyLink() {
		const url = copiedDashboardUrl(new URL(window.location.href), currentUrlState());
		try {
			await navigator.clipboard.writeText(url.href);
			notice = 'Link copied. Dashboard layout is not included.';
		} catch {
			window.prompt('Copy this link', url.href);
		}
	}

	function downloadData() {
		const count = dashboardCanvas?.exportCsv(layoutName) ?? 0;
		notice = count
			? `Downloaded data for ${count} loaded panel${count === 1 ? '' : 's'}.`
			: 'No panel data is loaded yet.';
	}

	async function restoreFromUrl() {
		const parsed = parseDashboardUrl(new URL(window.location.href).searchParams, {
			nowMs: Date.now(),
			validRegions: TRACKER_REGION_OPTIONS.map((option) => option.value)
		});
		suppressUrl = true;
		selectedRegion = parsed.region;
		group = parsed.group;
		rangeSnapshot = parsed.range;
		await dashboardCanvas?.applyRangeSnapshot(parsed.range);
		suppressUrl = false;
	}

	onMount(() => {
		// Remove layout payloads and saved-view IDs produced by earlier dashboard prototypes.
		const params = new URL(window.location.href).searchParams;
		if (params.has('layout') || params.has('view')) syncUrl('replace');
		window.addEventListener('popstate', restoreFromUrl);
		return () => window.removeEventListener('popstate', restoreFromUrl);
	});
</script>

<Meta
	title="Dashboard tracker"
	description="Build a dashboard for Australia's electricity system."
	canonical={false}
/>
<svelte:head><meta name="robots" content="noindex,nofollow" /></svelte:head>

<FullscreenLayout {isFullscreen} gridline={false} class="bg-light-warm-grey">
	{#snippet filterBar()}
		<div class="relative z-40 shrink-0 border-b border-warm-grey {isFullscreen ? '' : 'px-4'}">
			<FullscreenFilterBar
				{isFullscreen}
				routeKey="tracker-dashboard"
				stableName="filter-bar-stable-tracker-dashboard"
				paddingX="px-8"
				bgClass="bg-light-warm-grey/75"
			>
				{#snippet stable()}
					{#if isFullscreen}
						<FullscreenNavDropdown />
						<a
							href={resolve('/(main)/studio/tracker/dashboard')}
							class="rounded-lg px-2 py-1 text-sm font-semibold text-dark-grey no-underline hover:bg-warm-grey hover:no-underline lg:text-base"
						>
							Dashboard tracker
						</a>
					{/if}
				{/snippet}

				{#snippet rest()}
					{#if isFullscreen}<div class="h-8 shrink-0 border-l border-warm-grey"></div>{/if}
					<div class="flex min-w-0 items-center gap-3 {isFullscreen ? 'pl-3' : ''}">
						<FormSelect
							selected={activeLayoutKey}
							options={layoutOptions}
							onchange={(option) => applyLayoutPreset(String(option.value ?? ''))}
							formLabel="Layout preset"
							compact
							widthClass="w-auto"
						/>
						{#if editing}
							<button
								type="button"
								onclick={cancelEditing}
								class="h-9 rounded-lg px-3 font-space text-sm font-medium text-mid-grey transition-colors hover:bg-warm-grey hover:text-dark-grey"
								>Cancel</button
							>
							<button
								type="button"
								onclick={finishEditing}
								class="h-9 rounded-md bg-black px-4 font-space text-sm font-medium text-white transition-colors hover:bg-dark-grey"
								>Done</button
							>
						{:else}
							<button
								type="button"
								onclick={startEditing}
								class="flex size-9 items-center justify-center rounded-md border border-mid-warm-grey bg-white text-dark-grey transition-colors hover:bg-warm-grey tablet:w-auto tablet:gap-1.5 tablet:px-3"
								aria-label="Customise dashboard"
							>
								<PanelRightOpen class="size-4" /><span
									class="hidden font-space text-sm font-medium tablet:inline">Customise</span
								>
							</button>
						{/if}
					</div>
				{/snippet}

				{#snippet options()}
					<PageOptionsMenu
						{isFullscreen}
						onfullscreenchange={() => toggleFullscreenMode(isFullscreen)}
						ondownloadcsv={downloadData}
						downloadLabel="Dashboard data"
						oncopylink={copyLink}
						showCopyLink
					/>
				{/snippet}
			</FullscreenFilterBar>
		</div>
	{/snippet}

	{#snippet content()}
		<FullscreenContainer {isFullscreen} class="[view-transition-name:page-body]">
			<div class="flex min-h-0 flex-1 flex-col bg-light-warm-grey">
				{#if notice}
					<div
						class="relative z-30 flex shrink-0 items-center justify-center gap-3 border-b border-warm-grey bg-white px-4 py-2 font-space text-xs text-dark-grey"
						role="status"
					>
						<span>{notice}</span><button
							type="button"
							onclick={() => (notice = '')}
							class="rounded p-1 text-mid-grey hover:bg-warm-grey hover:text-dark-grey"
							aria-label="Dismiss"><X class="size-3.5" /></button
						>
					</div>
				{/if}

				<main class="min-h-0 flex-1 overflow-auto">
					<DashboardCanvas
						bind:this={dashboardCanvas}
						region={selectedRegion}
						{group}
						{panels}
						initialRange={rangeSnapshot}
						initialNowMs={initialData.nowMs}
						{editing}
						flows={grid.flows}
						prices={grid.prices}
						dispatchDateTimeString={grid.dispatchDateTimeString}
						onregionchange={handleRegionChange}
						ongroupchange={handleGroupChange}
						onrangechange={handleRangeChange}
						onpanelsettingschange={(id, settings) =>
							setPanels(updatePanelSettings(panels, id, settings))}
						onmove={(id, direction) => setPanels(movePanel(panels, id, direction))}
						onduplicate={(id) => setPanels(duplicatePanel(panels, id, makeId('panel')))}
						onremove={(id) => setPanels(removePanel(panels, id))}
						onresize={(id, size) => setPanels(resizePanel(panels, id, size))}
						onreorder={reorderPanels}
					/>
				</main>
			</div>
			{#snippet footer()}
				<FullscreenFooter
					{isFullscreen}
					onenterfullscreen={() => toggleFullscreenMode(isFullscreen)}
				/>
			{/snippet}
		</FullscreenContainer>
	{/snippet}
</FullscreenLayout>

{#if editing && panelLibraryOpen}
	<aside
		class="fixed inset-x-0 bottom-0 z-50 max-h-[72dvh] overflow-auto rounded-t-2xl border border-mid-warm-grey bg-white shadow-xl md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[380px] md:rounded-none md:border-y-0 md:border-r-0"
		aria-label="Panel library"
	>
		<div class="sticky top-0 flex items-center border-b border-warm-grey bg-white px-6 py-4">
			<div>
				<p class="m-0 font-space text-xxs font-medium uppercase tracking-wider text-red">
					Customise
				</p>
				<h2 class="m-0 mt-1 text-base font-semibold text-dark-grey">Panel library</h2>
				<p class="m-0 mt-1 font-mono text-xs text-mid-grey">
					{panels.length} of {MAX_PANELS} panels
				</p>
			</div>
			<button
				type="button"
				onclick={() => (panelLibraryOpen = false)}
				class="ml-auto rounded p-2 hover:bg-light-warm-grey"
				aria-label="Close panel library"><X class="size-5" /></button
			>
		</div>
		<ul class="m-0 list-none divide-y divide-warm-grey p-0">
			{#each PANEL_CATALOGUE as item (item.type)}
				{@const singletonPresent =
					SINGLETON_PANEL_TYPES.has(item.type) && activeTypes.has(item.type)}
				<li class="flex items-center gap-4 px-6 py-5">
					<div class="min-w-0 flex-1">
						<h3 class="m-0 font-space text-sm font-medium text-dark-grey">{item.label}</h3>
						<p class="m-0 mt-1 text-xs leading-5 text-mid-grey">{item.description}</p>
					</div>
					<button
						type="button"
						disabled={panels.length >= MAX_PANELS || singletonPresent}
						onclick={() => addPanelType(item.type)}
						class="rounded-md border border-dark-grey bg-white px-4 py-2 font-space text-sm font-medium text-dark-grey transition-colors hover:bg-dark-grey hover:text-white disabled:cursor-not-allowed disabled:border-warm-grey disabled:bg-light-warm-grey disabled:text-mid-grey disabled:opacity-100"
						>{singletonPresent ? 'Added' : 'Add'}</button
					>
				</li>
			{/each}
		</ul>
	</aside>
{/if}

{#if editing && !panelLibraryOpen}
	<button
		type="button"
		onclick={() => (panelLibraryOpen = true)}
		class="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-dark-grey px-4 py-3 text-sm font-medium text-white shadow-lg"
		><PanelRightOpen class="size-4" /> <span class="font-space">Add panel</span></button
	>
{/if}
