<script>
	import { Download, Check, Search } from '@lucide/svelte';
	import {
		OptionsMenu,
		OptionsMenuItem,
		OptionsMenuHeading,
		OptionsMenuDivider
	} from '$lib/components/ui/options-menu';

	/**
	 * @type {{
	 *   onshowshortcuts?: () => void,
	 *   ondownloadcsv?: () => void,
	 *   onsearchfacilities?: () => void,
	 *   searchShortcutKeys?: string[],
	 *   triggerClass?: string,
	 *   iconClass?: string
	 * }}
	 */
	let {
		onshowshortcuts,
		ondownloadcsv,
		onsearchfacilities,
		searchShortcutKeys = ['/'],
		triggerClass = undefined,
		iconClass = undefined
	} = $props();

	let downloading = $state(false);

	/** @param {() => void} close */
	function handleDownloadCsv(close) {
		downloading = true;
		ondownloadcsv?.();
		close();
		setTimeout(() => {
			downloading = false;
		}, 1000);
	}
</script>

<OptionsMenu {onshowshortcuts} {triggerClass} {iconClass}>
	{#snippet sections({ close })}
		{#if ondownloadcsv}
			<OptionsMenuHeading icon={downloading ? Check : Download}>Download as CSV</OptionsMenuHeading>
			<OptionsMenuItem onclick={() => handleDownloadCsv(close)}>
				{downloading ? 'Downloaded!' : 'Facilities'}
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
