<script>
	import ButtonGroup from '$lib/components/ButtonGroup.svelte';
	import Map from '$lib/components/Map.svelte';
	import { PortableText } from '@portabletext/svelte';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

<div class="bg-white">
	<div class="container mx-auto">
		<div
			class="flex py-20 justify-between items-center border-mid-grey border-b-[0.05rem] border-solid"
		>
			<div class="w-7/12">
				<h2 class="md:text-9xl md:leading-9xl">{data.banner_title}</h2>
				<p>{data.banner_statement}</p>
			</div>
			<div class="w-3/12 bg-light-warm-grey p-8 font-medium text-sm">
				<h6 class="subhead-secondary mb-4">Key Numbers</h6>
				<ul>
					<li class="grid key-numbers-grid items-center mb-1">
						<h6 class="font-medium">Renewables</h6>
						<span>37.9%</span>
						<span class="block w-full h-12 bg-warm-grey" />
					</li>
					<li class="grid key-numbers-grid items-center mb-1">
						<h6 class="font-medium">Brown Coal</h6>
						<span>37.9%</span>
						<span class="block w-full h-12 bg-warm-grey" />
					</li>
					<li class="grid key-numbers-grid items-center mb-1">
						<h6 class="font-medium">Black Coal</h6>
						<span>37.9%</span>
						<span class="block w-full h-12 bg-warm-grey" />
					</li>
					<li class="grid key-numbers-grid items-center mb-1">
						<h6 class="font-medium">All Gas</h6>
						<span>37.9%</span>
						<span class="block w-full h-12 bg-warm-grey" />
					</li>
				</ul>
				<div class="mt-8 text-sm text-mid-grey font-normal">
					Total Generation, rolling 12 month avg (%).
				</div>
			</div>
		</div>
	</div>
</div>
<div class="bg-white py-16">
	<div class="container mx-auto">
		<h3>{data.chart_title}</h3>
	</div>
</div>
<div class="bg-light-warm-grey">
	<div class="container mx-auto">
		<div class="grid grid-cols-2 gap-40 py-16">
			<Map classes="w-full block h-auto" />
			<div class="bg-white rounded-lg p-12">
				<h3>{data.map_title}</h3>
				<ButtonGroup
					buttons={[
						{ label: '1D', value: 1 },
						{ label: '3D', value: 3 },
						{ label: '7D', value: 7 }
					]}
					selected={1}
				/>
			</div>
		</div>
	</div>
</div>
<div class="bg-white py-16">
	<div class="container mx-auto">
		<h3>ISP Explorer</h3>
	</div>
</div>
<div class="bg-light-warm-grey py-16">
	<div class="container mx-auto">
		<h3>{data.records_title}</h3>
	</div>
</div>
<div class="bg-white py-16">
	<div class="container mx-auto">
		<h3>{data.analysis_title}</h3>
		<div class={`grid grid-cols-4`}>
			{#each data.articles as { title, slug }}
				<div>
					<h3>{title}</h3>
					<a href="/analysis/{slug.current}">Read more</a>
				</div>
			{/each}
		</div>
	</div>
</div>
<div class="bg-white py-16">
	<div class="container mx-auto">
		<h3>{data.goals_title}</h3>
		<div class={`grid grid-cols-4`}>
			{#each data.goals as goal}
				<div>
					<span>{goal}</span>
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.key-numbers-grid {
		grid-template-columns: 1fr minmax(5rem, 25%) minmax(5rem, 25%);
	}
</style>
