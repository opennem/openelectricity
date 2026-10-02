<script>
	/**
	 * Tracker page chrome shared by every view route: the filter bar (view
	 * switcher, region and the view's own controls and status), options menu,
	 * notices, PNG export and shortcuts. Each view page composes it around its
	 * canvas and supplies what differs through snippets and download props.
	 */

	import { building } from '$app/environment';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { X } from '@lucide/svelte';
	import Meta from '$lib/components/Meta.svelte';
	import PageOptionsMenu from '$lib/components/PageOptionsMenu.svelte';
	import FilterSelect from '$lib/components/filters/FilterSelect.svelte';
	import { OptionsMenuDivider, OptionsMenuItem } from '$lib/components/ui/options-menu';
	import ShortcutsToast from '$lib/components/ShortcutsToast.svelte';
	import Switch from '$lib/components/SwitchWithIcons.svelte';
	import {
		FullscreenContainer,
		FullscreenFilterBar,
		FullscreenFooter,
		FullscreenLayout,
		FullscreenNavDropdown,
		pageShortcuts
	} from '$lib/components/fullscreen';
	import { BELOW_TABLET_QUERY, toggleFullscreenMode } from '$lib/utils/fullscreen-mode.js';
	import { shortcutFor } from './tracker-shortcuts.js';
	import { TRACKER_REGION_TREE } from './tracker-regions.js';
	import { DEFAULT_REGION } from './tracker-model.js';
	import { TRACKER_VIEWS, trackerView } from './tracker-url.js';
	import PngExport from './PngExport.svelte';
	import { capturePngSnapshot, settleChartAnimations } from './png-export.js';

	/**
	 * @type {{
	 *   view: import('./tracker-url.js').TrackerView,
	 *   session: ReturnType<typeof import('./tracker-session.svelte.js').createTrackerSession>,
	 *   shareUrl: () => URL,
	 *   notice?: string,
	 *   regionSelect?: boolean,
	 *   controls?: import('svelte').Snippet,
	 *   status?: import('svelte').Snippet,
	 *   menu?: import('svelte').Snippet<[{ close: () => void }]>,
	 *   downloadItems: Array<{ key: string, label: string, disabled?: boolean }>,
	 *   ondownloaditem: (key: string) => void,
	 *   ondownloadxlsx?: () => void | Promise<void>,
	 *   downloadXlsxDisabled?: boolean,
	 *   shortcuts?: Array<{ label: string, keys: string[] }>,
	 *   onshortcut?: (id: import('./tracker-shortcuts.js').TrackerShortcut) => void,
	 *   children: import('svelte').Snippet
	 * }}
	 */
	let {
		view,
		session,
		shareUrl,
		notice = $bindable(''),
		regionSelect = true,
		controls,
		status,
		menu,
		downloadItems,
		ondownloaditem,
		ondownloadxlsx,
		downloadXlsxDisabled = false,
		shortcuts = [],
		onshortcut,
		children
	} = $props();

	// The switcher's option lists are mutable; the view table is not.
	const viewOptions = [...TRACKER_VIEWS];
	const belowTablet = new MediaQuery(BELOW_TABLET_QUERY);
	let isFullscreen = $derived(building ? true : session.selection.fullscreen);
	let showShortcuts = $state(false);
	// Set after mount so automation can tell the hydrated page from the SSR
	// skeleton before interacting; the server-rendered charts already contain svgs.
	let hydrated = $state(false);
	onMount(() => {
		hydrated = true;
	});

	/** Each view is its own route; a bare path starts it with its defaults.
	 * @param {string} value */
	function selectView(value) {
		if (value !== view) goto(resolve(trackerView(value).route));
	}

	async function copyLink() {
		const url = shareUrl();
		try {
			await navigator.clipboard.writeText(url.href);
			notice = 'Link copied.';
		} catch {
			window.prompt('Copy this link', url.href);
		}
	}

	/** @type {HTMLElement} */
	let captureRoot;
	let pngSnapshot = $state.raw(/** @type {import('./png-export.js').PngSnapshot | null} */ (null));
	async function openPngExport() {
		try {
			await document.fonts.ready;
			await settleChartAnimations(captureRoot);
			pngSnapshot = capturePngSnapshot(captureRoot);
		} catch (error) {
			notice = error instanceof Error ? error.message : 'Unable to capture the charts.';
		}
	}

	/** @param {KeyboardEvent} event */
	function handleKeydown(event) {
		if (event.key === 'Escape') {
			if (showShortcuts) {
				event.preventDefault();
				showShortcuts = false;
			}
			return;
		}
		const action = shortcutFor(event);
		if (!action) return;
		if (action === 'shortcuts') {
			showShortcuts = !showShortcuts;
			return;
		}
		showShortcuts = false;
		if (action === 'fullscreen') {
			if (!belowTablet.current) toggleFullscreenMode(isFullscreen);
			return;
		}
		if (!onshortcut) return;
		event.preventDefault();
		onshortcut(action);
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<Meta
	title="Tracker"
	description="Track Australia's electricity generation, price and emissions across regions, ranges and fuel technologies."
	canonical={false}
/>
<svelte:head><meta name="robots" content="noindex,nofollow" /></svelte:head>

<FullscreenLayout {isFullscreen} gridline={false} class="bg-light-warm-grey">
	{#snippet filterBar()}
		<div class="relative z-40 shrink-0 border-b border-warm-grey {isFullscreen ? '' : 'px-4'}">
			<FullscreenFilterBar
				{isFullscreen}
				routeKey="tracker"
				stableName="filter-bar-stable-tracker"
				optionsSpacingClass="tablet:pl-4"
				paddingX="px-8"
				bgClass="bg-light-warm-grey/75"
			>
				{#snippet stable()}
					{#if isFullscreen}
						<FullscreenNavDropdown label="Tracker" />
					{/if}
				{/snippet}

				{#snippet rest()}
					{#if isFullscreen}<div class="h-8 shrink-0 border-l border-warm-grey"></div>{/if}
					<div class="flex min-w-0 flex-1 items-center gap-4" data-testid="tracker-top-nav">
						<div class="hidden shrink-0 sm:block">
							<Switch
								buttons={viewOptions}
								selected={view}
								compact
								rounded="rounded-lg"
								darkSelected
								transitionName="tracker-view-switch"
								onchange={(option) => selectView(option.value)}
								aria-label="Analysis view"
							/>
						</div>
						<div class="shrink-0 sm:hidden">
							<FilterSelect
								selected={view}
								options={viewOptions}
								listLabel="Analysis view"
								defaultValue="timeline"
								compact
								onchange={selectView}
							/>
						</div>
						<div
							class="h-8 shrink-0 border-l border-warm-grey"
							role="separator"
							aria-orientation="vertical"
						></div>
						<div
							class="flex min-w-0 flex-1 items-center gap-4 overflow-x-auto py-0.5"
							data-testid="tracker-view-filters"
							data-view={view}
						>
							{#if regionSelect}
								<FilterSelect
									selected={session.selection.region}
									options={TRACKER_REGION_TREE}
									listLabel="Region"
									defaultValue={DEFAULT_REGION}
									compact
									onchange={(value) => session.select('region', value)}
								/>
							{/if}
							{@render controls?.()}
						</div>
					</div>
					{@render status?.()}
				{/snippet}

				{#snippet options()}
					<PageOptionsMenu
						{isFullscreen}
						onfullscreenchange={() => toggleFullscreenMode(isFullscreen)}
						oncopylink={copyLink}
						showCopyLink
						{downloadItems}
						{downloadXlsxDisabled}
						{ondownloaditem}
						{ondownloadxlsx}
						onshowshortcuts={() => (showShortcuts = !showShortcuts)}
					>
						{#snippet extraSections({ close })}
							<OptionsMenuItem
								onclick={() => {
									close();
									openPngExport();
								}}>Export PNG</OptionsMenuItem
							>
							{@render menu?.({ close })}
							<OptionsMenuDivider />
						{/snippet}
					</PageOptionsMenu>
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

				<main
					bind:this={captureRoot}
					class="flex min-h-0 flex-1 flex-col overflow-hidden"
					data-hydrated={hydrated || undefined}
				>
					{@render children()}
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

{#if pngSnapshot}
	<PngExport snapshot={pngSnapshot} onclose={() => (pngSnapshot = null)} />
{/if}

<ShortcutsToast
	visible={showShortcuts}
	ondismiss={() => (showShortcuts = false)}
	shortcuts={pageShortcuts(shortcuts, { navMenu: isFullscreen, fullscreen: !belowTablet.current })}
/>

<style>
	/* Switching views is a route change: the switcher holds still across the
	   view transition while its thumb slides like the in-page switch does. */
	:global(::view-transition-group(tracker-view-switch-thumb)) {
		animation-duration: 200ms;
		animation-timing-function: ease-out;
	}
</style>
