<script>
	export let id = 'linear-gradient';
	export let stops = [
		{ offset: '0%', color: '#2D9B14' },
		{ offset: '10%', color: '#ffe310' },
		{ offset: '55%', color: '#803D11' },
		{ offset: '100%', color: '#000000' }
	];
</script>

<linearGradient {id}>
	{#each stops as { offset, color }}
		<stop {offset} stop-color={color} />
	{/each}
</linearGradient>
