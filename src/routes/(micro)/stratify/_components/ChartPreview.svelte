<script>
	import StrataChartView from '$lib/stratify/StrataChartView.svelte';
	import { getStratifyContext } from '../_state/context.js';

	const project = getStratifyContext();
</script>

<StrataChartView chart={project.toJSON()} />
