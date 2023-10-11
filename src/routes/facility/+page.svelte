<script>
	export let data;
	console.log(data);

	const stations = data.station;
</script>

<h1 class="text-3xl font-bold">Facilities</h1>

<ol>
	{#each stations as { code, name }}
		<li>
			<a class="border-b border-b-blue-300" href={`facility/${code}`}>{name}</a>
		</li>
	{/each}
</ol>
