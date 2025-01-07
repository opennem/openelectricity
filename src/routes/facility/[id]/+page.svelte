<script>
	import { fade } from 'svelte/transition';
	import { PortableText, toPlainText } from '@chienleng/portabletext-svelte-5';
	import { byProp } from '$lib/utils/sort';
	import { selectedRangeLabel, selectedIntervalLabel } from '../store';
	import RangeIntervalSelection from './RangeIntervalSelection.svelte';
	import UnitTable from './UnitTable.svelte';
	import FacilityList from './FacilityList.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {import('./$types').PageData} data
	 */

	/** @type {Props} */
	let { data } = $props();

	let selected = data.facility.code || '';

	let facility = $derived(data.facility);
	// TODO: should have an alternate image for the og:image
	let mainPhoto = $derived(facility.photos && facility.photos[0]);
	let units = $derived(facility.units.sort(byProp('code')));
	let pageTitle = $derived(`OpenNEM Facility — ${facility.name}`);
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta property="og:title" content={pageTitle} />
	<meta name="og:description" content={toPlainText(facility.description)} />
	<meta property="og:image" content={mainPhoto?.url} />
</svelte:head>

<FacilityList {selected} />

{#key data.facility.name}
	<h1 class="prose-h1 prose-slate text-2xl my-4">{facility.name}</h1>

	<div in:fade={{ duration: 200, delay: 150 }} out:fade={{ duration: 100 }}>
		<div class="flex flex-col sm:flex-row gap-4">
			<!-- https://github.com/portabletext/svelte-portabletext -->
			<PortableText value={facility.description} components={{}} />

			{#if mainPhoto}
				<div>
					<img class="rounded-md sm:max-w-[300px]" src={mainPhoto.url} alt={mainPhoto.caption} />
				</div>
			{/if}
		</div>

		<section class="my-6">
			<RangeIntervalSelection />

			<h5 class="mt-2 text-sm font-extralight text-right">
				{$selectedRangeLabel}/{$selectedIntervalLabel}
			</h5>

			<div class="w-full h-[300px] bg-slate-200 rounded-md"></div>

			<UnitTable data={units} />
		</section>
	</div>
{/key}
