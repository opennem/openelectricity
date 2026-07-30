<script>
	// Catches errors thrown from (main) routes (e.g. facility/strata/analysis
	// 404s) — Nav and Footer come from the (main) layout above this boundary.
	import ErrorContent from '$lib/components/error-page/ErrorContent.svelte';
</script>

<ErrorContent />
