<script>
	import { PortableText, toPlainText } from '@portabletext/svelte';

	/** @type {import('./$types').PageData} */
	export let data;

	$: mainPhoto = data.photos && data.photos[0];

	console.log(data);
</script>

<svelte:head>
	<title>{data.name}</title>
	<meta property="og:title" content={`OpenNEM - {data.name}`} />
	<meta name="og:description" content={toPlainText(data.description)} />
	<meta property="og:image" content={mainPhoto.url} />
</svelte:head>

<h1 class="prose-h1 prose-slate text-2xl my-4">{data.name}</h1>

<div class="flex flex-col sm:flex-row gap-4">
	<!-- https://github.com/portabletext/svelte-portabletext -->
	<PortableText value={data.description} components={{}} />
	<img class="rounded-md max-w-xs" src={mainPhoto.url} alt={mainPhoto.caption} />
</div>

<section class="my-6">
	<div class="w-full h-[300px] bg-slate-200 rounded-md" />

	<table class="w-full sm:w-1/2 my-4">
		<thead>
			<tr class="border-b">
				<th class="text-left">Unit</th>
				<th class="text-left">Capacity</th>
			</tr>
		</thead>

		<tbody>
			{#each data.units as unit}
				<tr class="border-b">
					<td>{unit.code}</td>
					<td>{unit.capacity_registered}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</section>
