<script>
	import { Download, Check, Search, Share, ClipboardCheck } from '@lucide/svelte';
	import {
		OptionsMenu,
		OptionsMenuItem,
		OptionsMenuHeading,
		OptionsMenuDivider
	} from '$lib/components/ui/options-menu';
	import { writeToClipboard } from '$lib/utils/clipboard';

	/**
	 * `downloadItems` + `ondownloaditem` let a host inject extra rows under the
	 * "Download as CSV" heading — the facility detail layout uses this to surface
	 * the page's chart exports (Generation, Energy, …) in the header menus.
	 * @type {{
	 *   isFullscreen?: boolean,
	 *   onfullscreenchange?: () => void,
	 *   onshowshortcuts?: () => void,
	 *   ondownloadcsv?: () => void,
	 *   downloadItems?: Array<{ key: string, label: string }>,
	 *   ondownloaditem?: (key: string) => void,
	 *   onsearchfacilities?: () => void,
	 *   showCopyLink?: boolean,
	 *   showDocumentation?: boolean,
	 *   searchShortcutKeys?: string[],
	 *   triggerClass?: string,
	 *   iconClass?: string
	 * }}
	 */
	let {
		isFullscreen = false,
		onfullscreenchange,
		onshowshortcuts,
		ondownloadcsv,
		downloadItems = [],
		ondownloaditem,
		onsearchfacilities,
		showCopyLink = false,
		showDocumentation = true,
		searchShortcutKeys = ['/'],
		triggerClass = undefined,
		iconClass = undefined
	} = $props();

	let downloading = $state(false);
	let copying = $state(false);

	/** @param {() => void} close */
	function handleDownloadCsv(close) {
		downloading = true;
		ondownloadcsv?.();
		close();
		setTimeout(() => {
			downloading = false;
		}, 1000);
	}

	function copyLink() {
		copying = true;
		// window.location.href, not page.url — the filters sync the URL via
		// shallow replaceState, which the reactive page.url doesn't reflect.
		writeToClipboard(window.location.href);
		setTimeout(() => {
			copying = false;
		}, 1000);
	}
</script>

<OptionsMenu
	{isFullscreen}
	{onfullscreenchange}
	{onshowshortcuts}
	{triggerClass}
	{iconClass}
	{showDocumentation}
>
	{#snippet sections({ close })}
		{#if ondownloadcsv || downloadItems.length}
			<OptionsMenuHeading icon={downloading ? Check : Download}>Download as CSV</OptionsMenuHeading>
			{#if ondownloadcsv}
				<OptionsMenuItem onclick={() => handleDownloadCsv(close)}>
					{downloading ? 'Downloaded!' : 'Facilities'}
				</OptionsMenuItem>
			{/if}
			{#each downloadItems as item (item.key)}
				<OptionsMenuItem
					onclick={() => {
						ondownloaditem?.(item.key);
						close();
					}}
				>
					{item.label}
				</OptionsMenuItem>
			{/each}
			<OptionsMenuDivider />
		{/if}

		{#if showCopyLink}
			<OptionsMenuItem
				icon={copying ? ClipboardCheck : Share}
				onclick={() => {
					copyLink();
					close();
				}}
			>
				{copying ? 'Copied!' : 'Copy link'}
			</OptionsMenuItem>
			<OptionsMenuDivider />
		{/if}

		{#if onsearchfacilities}
			<OptionsMenuItem
				icon={Search}
				kbd={searchShortcutKeys}
				onclick={() => {
					onsearchfacilities?.();
					close();
				}}
			>
				Search facilities
			</OptionsMenuItem>
			<OptionsMenuDivider />
		{/if}
	{/snippet}
</OptionsMenu>
