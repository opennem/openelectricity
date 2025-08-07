<script>
	import { getContext } from 'svelte';
	import { fly } from 'svelte/transition';
	import { clickoutside } from '@svelte-put/clickoutside';

	import IconArrowDownTray from '$lib/icons/ArrowDownTray.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {string} [position] - top, bottom
	 * @property {string} [align] - left, right
	 */

	/** @type {Props} */
	let { position = 'bottom', align = 'right' } = $props();

	/**
	 * @type {Object.<string, *>}
	 */
	const dataVizStores = {
		energy: getContext('energy-data-viz'),
		emissions: getContext('emissions-data-viz'),
		capacity: getContext('capacity-data-viz'),
		intensity: getContext('intensity-data-viz')
	};

	const { filterShortName } = getContext('scenario-filters');

	let showOptions = $state(false);
	let downloadKey = $state('');

	/** @type {{label: string, value: string}[]} */
	let options = [
		{
			label: 'Generation',
			value: 'energy'
		},
		{
			label: 'Emissions',
			value: 'emissions'
		},
		{
			label: 'Intensity',
			value: 'intensity'
		},
		{
			label: 'Capacity',
			value: 'capacity'
		}
	];

	let selectedStore = $derived(downloadKey ? dataVizStores[downloadKey] : null);
	let seriesCsvData = $derived(selectedStore ? selectedStore.seriesCsvData : null);

	let file = $derived(new Blob([$seriesCsvData], { type: 'text/plain' }));
	let fileUrl = $derived(URL.createObjectURL(file));
	let fileName = $derived(`${$filterShortName}-${downloadKey}.csv`);

	/**
	 * @param {{ label: string, value: string }} option
	 */
	function handleSelect(option) {
		downloadKey = option.value;
	}
</script>

<div class="relative">
	<button
		class="bg-black text-white p-3 rounded-lg transition-all hover:bg-dark-grey"
		onclick={() => (showOptions = !showOptions)}
		use:clickoutside
		onclickoutside={() => (showOptions = false)}
	>
		<IconArrowDownTray class="size-8" />
	</button>

	{#if showOptions}
		<ul
			class="border border-mid-grey bg-white absolute flex flex-col rounded-lg z-50 shadow-md p-2 text-sm max-h-96 overflow-y-scroll"
			class:top-16={position === 'bottom'}
			class:bottom-16={position === 'top'}
			class:left-0={align === 'left'}
			class:right-0={align === 'right'}
			in:fly={{ y: -5, duration: 150 }}
			out:fly={{ y: -5, duration: 150 }}
		>
			<li
				class="px-4 py-2 border-b border-warm-grey text-mid-grey whitespace-nowrap font-space text-xs"
			>
				Download as CSV
			</li>
			{#each options as opt}
				<li class="whitespace-nowrap">
					<a
						href={fileUrl}
						download={fileName}
						class="hover:bg-warm-grey w-full rounded-md px-4 py-2 flex gap-16 items-center justify-between text-black no-underline!"
						onpointerenter={() => handleSelect(opt)}
					>
						<span class="capitalize">{opt.label}</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</div>
