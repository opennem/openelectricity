<script>
	import { fly } from 'svelte/transition';
	import { clickoutside } from '@svelte-put/clickoutside';
	import { EllipsisVertical, Maximize2, Minimize2, CircleHelp, Download, Check } from '@lucide/svelte';

	/**
	 * @type {{
	 *   isFullscreen?: boolean,
	 *   onfullscreenchange?: () => void,
	 *   onshowshortcuts?: () => void,
	 *   ondownloadcsv?: () => void
	 * }}
	 */
	let { isFullscreen = false, onfullscreenchange, onshowshortcuts, ondownloadcsv } = $props();

	let isOpen = $state(false);
	let downloading = $state(false);

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

	function handleDownloadCsv() {
		downloading = true;
		ondownloadcsv?.();
		isOpen = false;
		setTimeout(() => {
			downloading = false;
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
			<!-- Download CSV -->
			{#if ondownloadcsv}
				<button
					onclick={handleDownloadCsv}
					class="w-full px-3 py-2 text-xs font-medium flex items-center gap-3 hover:bg-light-warm-grey transition-colors text-left"
				>
					{#if downloading}
						<Check class="size-4 text-mid-grey" />
					{:else}
						<Download class="size-4 text-mid-grey" />
					{/if}
					<span class="flex-1">{downloading ? 'Downloaded!' : 'Download CSV'}</span>
				</button>

				<div class="border-t border-warm-grey my-1"></div>
			{/if}

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

			<div class="border-t border-warm-grey my-1"></div>

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
