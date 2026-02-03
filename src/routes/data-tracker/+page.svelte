<script>
	import InfoGraphicNem7DayGenerationV2 from '$lib/components/info-graphics/nem-7-day-generation-v2/index.svelte';

	let { data } = $props();
</script>

<InfoGraphicNem7DayGenerationV2 initialData={data.tracker7dProcessed} />
