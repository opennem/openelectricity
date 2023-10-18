<script>
	import { PortableText, toPlainText } from '@portabletext/svelte';
	import { byProp } from '$lib/utils/sort';

	/** @type {import('./$types').PageData} */
	export let data;

	$: mainPhoto = data.photos && data.photos[0];
	$: units = data.units.sort(byProp('code'));
</script>

<svelte:head>
	<title>{data.name}</title>
	<meta property="og:title" content={`OpenNEM - ${data.name}`} />
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
	<div class="w-full h-[300px] bg-slate-200 rounded-md" />

	<table class="w-full my-4">
		<thead>
			<tr class="border-b text-left">
				<th>Unit</th>
				<th>Capacity</th>
				<th>Emissions Factor</th>
				<th>Dispatch Type</th>
				<th>Fuel Tech</th>
				<th>Status</th>
			</tr>
		</thead>

		<tbody>
			{#each units as unit}
				<tr class="border-b">
					<td>{decodeURIComponent(unit.code)}</td>
					<td>{unit.capacity_registered}</td>
					<td>{unit.emissions_factor_co2}</td>
					<td>{unit.dispatch_type}</td>
					<td>{unit.fuel_technology.name}</td>
					<td>{unit.status}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</section>
