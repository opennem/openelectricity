<script>
	import { building } from '$app/environment';
	import { pushState, replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount, untrack } from 'svelte';
	import { Check, PanelRightOpen, Save, Trash2, X } from '@lucide/svelte';
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
	import {
		OptionsMenu,
		OptionsMenuHeading,
		OptionsMenuItem
	} from '$lib/components/ui/options-menu';
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
		createSavedDashboard,
		dashboardSignature,
		duplicatePanel,
		movePanel,
		removePanel,
		resizePanel,
		validatePanels,
		updatePanelSettings
	} from './dashboard-model.js';
	import { applyDashboardUrl, parseDashboardUrl, copiedDashboardUrl } from './dashboard-url.js';
	import {
		deleteSavedView,
		loadSavedViews,
		persistSavedViews,
		upsertSavedView
	} from './dashboard-storage.js';

	/** @type {{ data: any }} */
	let { data } = $props();
	// Route data seeds component-local state once; back/forward synchronisation
	// is handled explicitly from the materialised URL below.
	const initialData = untrack(() => structuredClone(data));

	let selectedRegion = $state(initialData.region);
	let group = $state(initialData.group);
	let panels = $state(initialData.panels);
	let rangeSnapshot = $state(initialData.range);
	let viewId = $state(initialData.viewId);
	let viewName = $state(initialData.viewId ? 'Saved view' : 'Analysis');
	let activeViewKey = $state(
		initialData.viewId ? `saved:${initialData.viewId}` : 'builtin:analysis'
	);
	/** @type {any[]} */
	let savedViews = $state([]);
	let storageAvailable = $state(true);
	let notice = $state('');
	let editing = $state(false);
	/** @type {any[]} */
	let editSnapshot = $state([]);
	let panelLibraryOpen = $state(false);
	let pendingViewKey = $state('');
	let baselineSignature = $state('');
	/** @type {import('./DashboardCanvas.svelte').default | undefined} */
	let dashboardCanvas = $state(undefined);
	let suppressUrl = false;

	const grid = createGridLive();
	$effect(() => {
		grid.start();
		return () => grid.stop();
	});

	let isFullscreen = $derived(building ? true : isFullscreenUrl(page.url));
	let currentSignature = $derived(
		dashboardSignature({ region: selectedRegion, group, range: rangeSnapshot, panels })
	);
	let dirty = $derived(Boolean(baselineSignature && currentSignature !== baselineSignature));
	let activeTypes = $derived(new Set(panels.map((/** @type {any} */ panel) => panel.type)));
	let viewOptions = $derived.by(() => {
		/** @type {{label:string,value:string|null,isGroupHeader?:boolean}[]} */
		const options = [];
		if (activeViewKey === 'draft') options.push({ label: viewName, value: 'draft' });
		options.push({ label: 'Built-in views', value: null, isGroupHeader: true });
		options.push(
			...builtinLayouts().map((layout) => ({ label: layout.name, value: `builtin:${layout.id}` }))
		);
		if (savedViews.length) {
			options.push({ label: 'My views', value: null, isGroupHeader: true });
			options.push(
				...savedViews.map((saved) => ({ label: saved.name, value: `saved:${saved.id}` }))
			);
		}
		return options;
	});

	function currentUrlState() {
		return { region: selectedRegion, group, range: rangeSnapshot, viewId };
	}

	function syncUrl(mode = 'replace', includeViewId = true) {
		if (suppressUrl || typeof window === 'undefined') return;
		const url = applyDashboardUrl(new URL(window.location.href), currentUrlState(), {
			includeViewId
		});
		const href = `${url.pathname}${url.search}`;
		if (mode === 'push') pushState(href, {});
		else replaceState(href, {});
	}

	function markUnsaved(name = viewName) {
		viewId = null;
		activeViewKey = 'draft';
		viewName = name.endsWith(' draft') ? name : `${name} draft`;
	}

	/** @param {string} value @param {boolean} [update] */
	function handleRegionChange(value, update = true) {
		selectedRegion = value;
		if (update) {
			if (activeViewKey.startsWith('builtin:')) markUnsaved(viewName);
			syncUrl('push');
		}
	}

	/** @param {string} value @param {boolean} [update] */
	function handleGroupChange(value, update = true) {
		group = value === 'simple' ? 'simple' : 'detailed';
		if (update) {
			if (activeViewKey.startsWith('builtin:')) markUnsaved(viewName);
			syncUrl('push');
		}
	}

	/** @param {any} value */
	function handleRangeChange(value) {
		rangeSnapshot = value;
		if (activeViewKey.startsWith('builtin:')) markUnsaved(viewName);
		syncUrl('replace');
	}

	/** @param {any[]} next */
	function setPanels(next) {
		panels = next;
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
		editSnapshot = validatePanels(panels);
		editing = true;
		panelLibraryOpen = true;
		if (activeViewKey.startsWith('builtin:')) markUnsaved(viewName);
	}

	function cancelEditing() {
		panels = editSnapshot;
		editing = false;
		panelLibraryOpen = false;
	}

	function finishEditing() {
		editing = false;
		panelLibraryOpen = false;
	}

	function persistViews() {
		storageAvailable = persistSavedViews(window.localStorage, savedViews);
		if (!storageAvailable)
			notice = 'Browser storage is unavailable. This view will remain in memory for this session.';
	}

	function saveCurrent({ asNew = false } = {}) {
		let existing = !asNew && viewId ? savedViews.find((view) => view.id === viewId) : null;
		const requestedName =
			existing?.name ?? window.prompt('Name this dashboard', viewName.replace(/ draft$/, ''));
		if (!requestedName?.trim()) return false;
		const id = existing?.id ?? makeId('view');
		const saved = createSavedDashboard({
			id,
			name: requestedName,
			region: selectedRegion,
			group,
			range: rangeSnapshot,
			panels,
			createdAt: existing?.createdAt
		});
		savedViews = upsertSavedView(savedViews, saved);
		persistViews();
		viewId = saved.id;
		viewName = saved.name;
		activeViewKey = `saved:${saved.id}`;
		baselineSignature = dashboardSignature(saved);
		syncUrl('replace');
		notice = storageAvailable ? 'Dashboard saved.' : notice;
		return true;
	}

	function renameCurrent() {
		const existing = savedViews.find((view) => view.id === viewId);
		if (!existing) return;
		const name = window.prompt('Rename dashboard', existing.name);
		if (!name?.trim()) return;
		const renamed = { ...existing, name: name.trim(), updatedAt: new Date().toISOString() };
		savedViews = upsertSavedView(savedViews, renamed);
		viewName = renamed.name;
		persistViews();
	}

	function duplicateCurrentView() {
		const name = window.prompt('Name the duplicate', `${viewName.replace(/ draft$/, '')} copy`);
		if (!name?.trim()) return;
		const duplicate = createSavedDashboard({
			id: makeId('view'),
			name,
			region: selectedRegion,
			group,
			range: rangeSnapshot,
			panels
		});
		savedViews = upsertSavedView(savedViews, duplicate);
		persistViews();
		applyDashboard(duplicate, `saved:${duplicate.id}`);
	}

	function deleteCurrentView() {
		if (!viewId || !window.confirm(`Delete “${viewName}”?`)) return;
		savedViews = deleteSavedView(savedViews, viewId);
		persistViews();
		applySelection('builtin:analysis');
	}

	/** @param {any} snapshot @param {string} key */
	async function applyDashboard(snapshot, key) {
		suppressUrl = true;
		handleRegionChange(snapshot.region, false);
		handleGroupChange(snapshot.group, false);
		panels = validatePanels(snapshot.panels);
		rangeSnapshot = snapshot.range;
		viewId = key.startsWith('saved:') ? snapshot.id : null;
		viewName = snapshot.name;
		activeViewKey = key;
		await dashboardCanvas?.applyRangeSnapshot(snapshot.range);
		baselineSignature = dashboardSignature(snapshot);
		suppressUrl = false;
		syncUrl('push');
	}

	/** @param {string} key */
	function applySelection(key) {
		if (key.startsWith('builtin:')) {
			const layout = builtinLayout(key.slice(8));
			applyDashboard(
				{
					...layout,
					region: '_all',
					group: 'detailed',
					range: { kind: 'preset', days: 7, intervalId: '30m' }
				},
				key
			);
			return;
		}
		const saved = savedViews.find((view) => `saved:${view.id}` === key);
		if (saved) applyDashboard(saved, key);
	}

	/** @param {string} key */
	function requestViewChange(key) {
		if (!key || key === activeViewKey) return;
		if (dirty) pendingViewKey = key;
		else applySelection(key);
	}

	/** @param {'save'|'discard'|'cancel'} action */
	function resolvePending(action) {
		const target = pendingViewKey;
		if (action === 'save' && !saveCurrent()) return;
		pendingViewKey = '';
		if (action !== 'cancel') applySelection(target);
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
		const count = dashboardCanvas?.exportCsv(viewName) ?? 0;
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
		viewId = parsed.viewId;
		const saved = savedViews.find((view) => view.id === viewId);
		if (saved) panels = validatePanels(saved.panels);
		viewName = saved?.name ?? 'Analysis draft';
		activeViewKey = saved ? `saved:${saved.id}` : 'draft';
		await dashboardCanvas?.applyRangeSnapshot(parsed.range);
		baselineSignature = saved
			? dashboardSignature(saved)
			: dashboardSignature({
					region: selectedRegion,
					group,
					range: rangeSnapshot,
					panels
				});
		suppressUrl = false;
	}

	onMount(() => {
		const loaded = loadSavedViews(window.localStorage);
		savedViews = loaded.views;
		storageAvailable = loaded.available;
		const saved = savedViews.find((view) => view.id === viewId);
		if (saved) {
			panels = validatePanels(saved.panels);
			viewName = saved.name;
			activeViewKey = `saved:${saved.id}`;
		}
		baselineSignature = saved ? dashboardSignature(saved) : currentSignature;
		// Remove layout payloads produced by the earlier dashboard prototype.
		if (new URL(window.location.href).searchParams.has('layout')) syncUrl('replace');
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
							href="/tracker/dashboard"
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
							selected={activeViewKey}
							options={viewOptions}
							onchange={(option) => requestViewChange(String(option.value ?? ''))}
							formLabel="Dashboard view"
							compact
							widthClass="w-auto"
						/>
						{#if dirty}
							<span class="hidden shrink-0 font-space text-xs font-medium text-red tablet:inline"
								>Unsaved changes</span
							>
						{:else if viewId}
							<span
								class="hidden shrink-0 items-center gap-1 font-space text-xs text-mid-grey tablet:flex"
								><Check class="size-3.5" />Saved</span
							>
						{/if}
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
								onclick={() => saveCurrent()}
								class="flex size-9 items-center justify-center rounded-lg text-dark-grey transition-colors hover:bg-warm-grey tablet:w-auto tablet:gap-1.5 tablet:px-3"
								aria-label="Save dashboard"
							>
								<Save class="size-4" /><span
									class="hidden font-space text-sm font-medium tablet:inline">Save</span
								>
							</button>
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

						<OptionsMenu showDocumentation={false}>
							{#snippet sections({ close })}
								<OptionsMenuHeading icon={Save}>Dashboard</OptionsMenuHeading>
								<OptionsMenuItem
									onclick={() => {
										saveCurrent({ asNew: true });
										close();
									}}>Save as new</OptionsMenuItem
								>
								<OptionsMenuItem
									onclick={() => {
										renameCurrent();
										close();
									}}>Rename</OptionsMenuItem
								>
								<OptionsMenuItem
									onclick={() => {
										duplicateCurrentView();
										close();
									}}>Duplicate view</OptionsMenuItem
								>
								{#if viewId}
									<OptionsMenuItem
										icon={Trash2}
										onclick={() => {
											deleteCurrentView();
											close();
										}}>Delete view</OptionsMenuItem
									>
								{/if}
							{/snippet}
						</OptionsMenu>
					</div>
				{/snippet}

				{#snippet options()}
					<PageOptionsMenu
						{isFullscreen}
						onfullscreenchange={() => toggleFullscreenMode(isFullscreen)}
						ondownloadcsv={downloadData}
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

{#if pendingViewKey}
	<div
		class="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="unsaved-title"
	>
		<div class="w-full max-w-md rounded-lg border border-mid-warm-grey bg-white p-6 shadow-xl">
			<p class="m-0 font-space text-xxs font-medium uppercase tracking-wider text-red">Dashboard</p>
			<h2 id="unsaved-title" class="m-0 mt-2 text-lg font-semibold text-dark-grey">
				Save changes?
			</h2>
			<p class="mt-2 text-sm leading-6 text-mid-grey">
				This dashboard has unsaved filter or layout changes.
			</p>
			<div class="mt-6 flex justify-end gap-2 font-space">
				<button
					type="button"
					onclick={() => resolvePending('cancel')}
					class="rounded-md px-4 py-2 text-sm font-medium text-mid-grey hover:bg-warm-grey hover:text-dark-grey"
					>Cancel</button
				>
				<button
					type="button"
					onclick={() => resolvePending('discard')}
					class="rounded-md px-4 py-2 text-sm font-medium text-dark-grey hover:bg-warm-grey"
					>Discard</button
				>
				<button
					type="button"
					onclick={() => resolvePending('save')}
					class="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-dark-grey"
					>Save</button
				>
			</div>
		</div>
	</div>
{/if}
