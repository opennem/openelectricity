<script>
	import { getContext } from 'svelte';
	import { fly } from 'svelte/transition';
	import { clickoutside } from '@svelte-put/clickoutside';

	import IconArrowDownTray from '$lib/icons/ArrowDownTray.svelte';

	export let position = 'bottom'; // top, bottom
	export let align = 'right'; // left, right

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

	let showOptions = false;
	let downloadKey = '';

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

	$: selectedStore = downloadKey ? dataVizStores[downloadKey] : null;
	$: seriesCsvData = selectedStore ? selectedStore.seriesCsvData : null;

	$: file = new Blob([$seriesCsvData], { type: 'text/plain' });
	$: fileUrl = URL.createObjectURL(file);
	$: fileName = `${$filterShortName}-${downloadKey}.csv`;

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
		on:click={() => (showOptions = !showOptions)}
		use:clickoutside
		on:clickoutside={() => (showOptions = false)}
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
						class="hover:bg-warm-grey w-full rounded-md px-4 py-2 flex gap-16 items-center justify-between text-black !no-underline"
						on:pointerenter={() => handleSelect(opt)}
					>
						<span class="capitalize">{opt.label}</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</div>
