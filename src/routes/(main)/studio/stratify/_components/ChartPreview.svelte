<script>
	import StratifyChart from '$lib/stratify/StratifyChart.svelte';
	import { getStratifyContext } from '../_state/context.js';

	const project = getStratifyContext();
</script>

<div class="chart-preview">
	<StratifyChart {project} height="h-[400px]" />
</div>
