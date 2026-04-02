<script>
	import StrataChartView from '$lib/stratify/StrataChartView.svelte';

	/**
	 * @type {{
	 *   chart: any,
	 *   caption?: string
	 * }}
	 */
	let { chart, caption = '' } = $props();
</script>

<StrataChartView {chart} headingTag="h3" {caption} />
