<script>
	import { PortableText, toPlainText } from '@portabletext/svelte';
	import { byProp } from '$lib/utils/sort';
	import { selectedRangeLabel, selectedIntervalLabel } from '../store';
	import RangeIntervalSelection from './RangeIntervalSelection.svelte';
	import UnitTable from './UnitTable.svelte';

	/** @type {import('./$types').PageData} */
	export let data;

	// TODO: should have an alternate image for the og:image
	$: mainPhoto = data.photos && data.photos[0];
	$: units = data.units.sort(byProp('code'));
	$: pageTitle = `OpenNEM Facility — ${data.name}`;
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta property="og:title" content={pageTitle} />
	<meta name="og:description" content={toPlainText(data.description)} />
	<meta property="og:image" content={mainPhoto?.url} />
</svelte:head>

<h1 class="prose-h1 prose-slate text-2xl my-4">{data.name}</h1>

<div class="flex flex-col sm:flex-row gap-4">
	<!-- https://github.com/portabletext/svelte-portabletext -->
	<PortableText value={data.description} components={{}} />

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

	<div class="w-full h-[300px] bg-slate-200 rounded-md" />

	<UnitTable data={units} />
</section>
