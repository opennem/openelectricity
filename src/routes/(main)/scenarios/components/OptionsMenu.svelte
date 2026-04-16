<script>
	import { getContext } from 'svelte';
	import { Share, ClipboardCheck, Download } from '@lucide/svelte';
	import {
		OptionsMenu,
		OptionsMenuItem,
		OptionsMenuHeading,
		OptionsMenuDivider
	} from '$lib/components/ui/options-menu';
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

	let copying = $state(false);

	/** @param {string} key */
	function handleDownload(key) {
		const store = chartStores[key];
		if (!store) return;
		downloadCsv(store.seriesCsvData, `${$filterShortName}-${key}.csv`);
	}

	function copyLink() {
		copying = true;
		writeToClipboard(window.location.href);
		setTimeout(() => {
			copying = false;
		}, 1000);
	}
</script>

<OptionsMenu {isFullscreen} {onfullscreenchange} {onshowshortcuts}>
	{#snippet sections({ close })}
		<OptionsMenuHeading icon={Download}>Download as CSV</OptionsMenuHeading>
		{#each downloadOptions as opt (opt.value)}
			<OptionsMenuItem
				onclick={() => {
					handleDownload(opt.value);
					close();
				}}
			>
				{opt.label}
			</OptionsMenuItem>
		{/each}

		<OptionsMenuDivider />

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
	{/snippet}
</OptionsMenu>
