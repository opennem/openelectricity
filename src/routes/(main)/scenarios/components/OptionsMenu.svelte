<script>
	import { getContext } from 'svelte';
	import { fly } from 'svelte/transition';
	import { clickoutside } from '@svelte-put/clickoutside';
	import { EllipsisVertical, Maximize2, Minimize2, CircleHelp, Share, ClipboardCheck, Download } from '@lucide/svelte';
	import { writeToClipboard } from '$lib/utils/clipboard';
	import { downloadCsv } from '$lib/utils/download-csv';

	/**
	 * @type {{
	 *   isFullscreen?: boolean,
	 *   onfullscreenchange?: () => void,
	 *   onshowshortcuts?: () => void
	 * }}
	 */
	let { isFullscreen = false, onfullscreenchange, onshowshortcuts } = $props();

	const { generation, emissions, intensity, capacity } = getContext('scenario-charts');
	const { filterShortName } = getContext('scenario-filters');

	/** @type {Record<string, *>} */
	const chartStores = {
		energy: generation,
		emissions: emissions,
		capacity: capacity,
		intensity: intensity
	};

	const downloadOptions = [
		{ label: 'Generation', value: 'energy' },
		{ label: 'Emissions', value: 'emissions' },
		{ label: 'Intensity', value: 'intensity' },
		{ label: 'Capacity', value: 'capacity' }
	];

	let isOpen = $state(false);
	let copying = $state(false);

	/**
	 * @param {string} key
	 */
	function handleDownload(key) {
		const store = chartStores[key];
		if (!store) return;
		downloadCsv(store.seriesCsvData, `${$filterShortName}-${key}.csv`);
	}

	function handleClickOutside() {
		isOpen = false;
	}

	/**
	 * Handle a menu item click: invoke the callback and close the menu
	 * @param {(() => void) | undefined} callback
	 */
	function handleItemClick(callback) {
		callback?.();
		isOpen = false;
	}

	function copyLink() {
		copying = true;
		writeToClipboard(window.location.href);
		setTimeout(() => {
			copying = false;
		}, 1000);
	}
</script>

<div class="relative" use:clickoutside onclickoutside={handleClickOutside}>
	<button
		onclick={() => (isOpen = !isOpen)}
		class="p-2 rounded-lg hover:bg-light-warm-grey transition-colors cursor-pointer"
		title="Options"
	>
		<EllipsisVertical class="size-6 text-mid-grey" />
	</button>

	{#if isOpen}
		<div
			class="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-mid-warm-grey z-50 min-w-[200px] py-1"
			in:fly={{ y: -5, duration: 150 }}
		>
			<!-- Download CSV section -->
			<div class="px-3 py-2 text-[10px] font-space text-mid-grey uppercase tracking-wider">
				Download as CSV
			</div>
			{#each downloadOptions as opt (opt.value)}
				<button
					onclick={() => { handleDownload(opt.value); isOpen = false; }}
					class="w-full px-3 py-2 text-xs font-medium flex items-center gap-3 hover:bg-light-warm-grey transition-colors text-left"
				>
					<Download class="size-4 text-mid-grey" />
					<span class="flex-1">{opt.label}</span>
				</button>
			{/each}

			<div class="border-t border-warm-grey my-1"></div>

			<!-- Copy link -->
			<button
				onclick={() => { copyLink(); isOpen = false; }}
				class="w-full px-3 py-2 text-xs font-medium flex items-center gap-3 hover:bg-light-warm-grey transition-colors text-left"
			>
				{#if copying}
					<ClipboardCheck class="size-4 text-mid-grey" />
				{:else}
					<Share class="size-4 text-mid-grey" />
				{/if}
				<span class="flex-1">{copying ? 'Copied!' : 'Copy link'}</span>
			</button>

			<div class="border-t border-warm-grey my-1"></div>

			<!-- Fullscreen toggle -->
			<button
				onclick={() => handleItemClick(onfullscreenchange)}
				class="w-full px-3 py-2 text-xs font-medium flex items-center gap-3 hover:bg-light-warm-grey transition-colors text-left"
			>
				{#if isFullscreen}
					<Minimize2 class="size-4 text-mid-grey" />
				{:else}
					<Maximize2 class="size-4 text-mid-grey" />
				{/if}
				<span class="flex-1">{isFullscreen ? 'Exit full screen' : 'Enter full screen'}</span>
				<kbd
					class="text-[10px] font-sans text-dark-grey bg-light-warm-grey border border-warm-grey rounded px-1.5 py-0.5 leading-none"
					>F</kbd
				>
			</button>

			<!-- Keyboard shortcuts -->
			<button
				onclick={() => handleItemClick(onshowshortcuts)}
				class="w-full px-3 py-2 text-xs font-medium flex items-center gap-3 hover:bg-light-warm-grey transition-colors text-left"
			>
				<CircleHelp class="size-4 text-mid-grey" />
				<span class="flex-1">Keyboard shortcuts</span>
				<kbd
					class="text-[10px] font-sans text-dark-grey bg-light-warm-grey border border-warm-grey rounded px-1.5 py-0.5 leading-none"
					>?</kbd
				>
			</button>
		</div>
	{/if}
</div>
