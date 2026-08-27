<script>
	import { building } from '$app/environment';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { ChevronDown, Plus, Save, SlidersHorizontal } from '@lucide/svelte';
	import Meta from '$lib/components/Meta.svelte';
	import PageOptionsMenu from '$lib/components/PageOptionsMenu.svelte';
	import {
		FullscreenContainer,
		FullscreenFilterBar,
		FullscreenLayout,
		FullscreenNavDropdown
	} from '$lib/components/fullscreen';
	import { isFullscreenUrl, toggleFullscreenMode } from '$lib/utils/fullscreen-mode.js';
	import ExploreCanvas from './ExploreCanvas.svelte';

	/** @type {{ data: { facilities: any[] } }} */
	let { data } = $props();

	let isFullscreen = $derived(building ? true : isFullscreenUrl(page.url));
	let exploreControls = $state({
		activeName: 'Overview',
		isBuiltIn: true,
		isDirty: false,
		ready: false,
		openViews: () => {},
		openCreate: () => {},
		openEdit: () => {},
		save: () => {}
	});

	/** @param {Partial<typeof exploreControls>} patch */
	function updateExploreControls(patch) {
		Object.assign(exploreControls, patch);
	}
</script>

<Meta title="Explore" description="Explore Australia's electricity system." canonical={false} />
<svelte:head><meta name="robots" content="noindex,nofollow" /></svelte:head>

<FullscreenLayout {isFullscreen}>
	{#snippet filterBar()}
		<div class="relative z-40 shrink-0 border-b border-warm-grey {isFullscreen ? '' : 'px-4'}">
			<FullscreenFilterBar
				{isFullscreen}
				routeKey="tracker-explore"
				stableName="filter-bar-stable-tracker-explore"
				paddingX="px-8"
				bgClass="bg-light-warm-grey/75"
			>
				{#snippet stable()}
					{#if isFullscreen}
						<FullscreenNavDropdown />
						<a
							href={resolve('/(main)/studio/tracker/explore')}
							class="rounded-lg px-2 py-1 text-sm font-semibold text-dark-grey no-underline hover:bg-warm-grey hover:no-underline lg:text-base"
						>
							Explore
						</a>
					{/if}
				{/snippet}

				{#snippet rest()}
					<div class="ml-auto flex min-w-0 items-center gap-2">
						<button
							type="button"
							class="flex min-w-0 items-center gap-1.5 rounded-lg border border-mid-warm-grey bg-white px-3 py-2 text-xs font-semibold text-dark-grey hover:bg-warm-grey sm:text-sm"
							onclick={() => exploreControls.openViews()}
							aria-label="Open views"
						>
							<span class="max-w-28 truncate sm:max-w-48">{exploreControls.activeName}</span>
							{#if exploreControls.isDirty}<span
									class="size-1.5 shrink-0 rounded-full bg-red"
									title="Unsaved changes"
								></span>{/if}
							<ChevronDown class="size-3.5 shrink-0 text-mid-grey" />
						</button>

						{#if !exploreControls.isBuiltIn}
							<button
								type="button"
								class="hidden items-center gap-1.5 rounded-lg border border-mid-warm-grey bg-white px-3 py-2 text-sm font-semibold text-dark-grey hover:bg-warm-grey md:flex"
								onclick={() => exploreControls.openEdit()}
							>
								<SlidersHorizontal class="size-4" /> Edit view
							</button>
							{#if exploreControls.isDirty}<button
									type="button"
									class="hidden items-center gap-1.5 rounded-lg bg-dark-grey px-3 py-2 text-sm font-semibold text-white md:flex"
									onclick={() => exploreControls.save()}
								>
									<Save class="size-4" /> Save
								</button>{/if}
						{:else if exploreControls.isDirty}
							<button
								type="button"
								class="hidden items-center gap-1.5 rounded-lg bg-dark-grey px-3 py-2 text-sm font-semibold text-white md:flex"
								onclick={() => exploreControls.save()}
							>
								<Save class="size-4" /> Save as view
							</button>
						{/if}

						<button
							type="button"
							class="flex items-center gap-1.5 rounded-lg bg-dark-grey px-3 py-2 text-xs font-semibold text-white sm:text-sm"
							onclick={() => exploreControls.openCreate()}
						>
							<Plus class="size-4" /> <span class="hidden sm:inline">Create view</span><span
								class="sm:hidden">Create</span
							>
						</button>
					</div>
				{/snippet}

				{#snippet options()}
					<PageOptionsMenu
						{isFullscreen}
						onfullscreenchange={() => toggleFullscreenMode(isFullscreen)}
					/>
				{/snippet}
			</FullscreenFilterBar>
		</div>
	{/snippet}

	{#snippet content()}
		<FullscreenContainer {isFullscreen} class="[view-transition-name:page-body]">
			<ExploreCanvas facilities={data.facilities} oncontrolschange={updateExploreControls} />
		</FullscreenContainer>
	{/snippet}
</FullscreenLayout>
