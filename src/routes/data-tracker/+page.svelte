<script>
	import InfoGraphicNem7DayGeneration from '$lib/components/info-graphics/nem-7-day-generation/index.svelte';

	let { data } = $props();
</script>

<InfoGraphicNem7DayGeneration data={data.data} />
