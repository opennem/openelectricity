<script>
	import { Download, Check, FileSpreadsheet, Search, Share, ClipboardCheck } from '@lucide/svelte';
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
	 * `ondownloadxlsx` adds a "Download as XLSX" group with a single row — the
	 * tracker offers its datasets as one workbook there.
	 * `extraSections` lets a host prepend its own headed groups (each ending in
	 * an `OptionsMenuDivider`) — the tracker keeps its fuel-tech grouping and
	 * contribution-basis choices here.
	 * @type {{
	 *   isFullscreen?: boolean,
	 *   onfullscreenchange?: () => void,
	 *   onshowshortcuts?: () => void,
	 *   ondownloadcsv?: () => void,
	 *   oncopylink?: () => void | Promise<void>,
	 *   downloadLabel?: string,
	 *   downloadItems?: Array<{ key: string, label: string }>,
	 *   ondownloaditem?: (key: string) => void,
	 *   ondownloadxlsx?: () => void | Promise<void>,
	 *   downloadXlsxLabel?: string,
	 *   onsearchfacilities?: () => void,
	 *   showCopyLink?: boolean,
	 *   showDocumentation?: boolean,
	 *   searchShortcutKeys?: string[],
	 *   triggerClass?: string,
	 *   iconClass?: string,
	 *   extraSections?: import('svelte').Snippet<[{ close: () => void }]>
	 * }}
	 */
	let {
		isFullscreen = false,
		onfullscreenchange,
		onshowshortcuts,
		ondownloadcsv,
		oncopylink,
		downloadLabel = 'Facilities',
		downloadItems = [],
		ondownloaditem,
		ondownloadxlsx,
		downloadXlsxLabel = 'Everything (one workbook)',
		onsearchfacilities,
		showCopyLink = false,
		showDocumentation = true,
		searchShortcutKeys = ['/'],
		triggerClass = undefined,
		iconClass = undefined,
		extraSections
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

	async function copyLink() {
		copying = true;
		if (oncopylink) await oncopylink();
		else {
			// window.location.href, not page.url — the filters sync the URL via
			// shallow replaceState, which the reactive page.url doesn't reflect.
			writeToClipboard(window.location.href);
		}
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
		{@render extraSections?.({ close })}

		{#if ondownloadcsv || downloadItems.length}
			<OptionsMenuHeading icon={downloading ? Check : Download}>Download as CSV</OptionsMenuHeading>
			{#if ondownloadcsv}
				<OptionsMenuItem onclick={() => handleDownloadCsv(close)}>
					{downloading ? 'Downloaded!' : downloadLabel}
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

		{#if ondownloadxlsx}
			<OptionsMenuHeading icon={FileSpreadsheet}>Download as XLSX</OptionsMenuHeading>
			<OptionsMenuItem
				onclick={() => {
					ondownloadxlsx();
					close();
				}}
			>
				{downloadXlsxLabel}
			</OptionsMenuItem>
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
