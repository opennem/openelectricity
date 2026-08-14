<script>
	import BuilderPage from '../_components/BuilderPage.svelte';

	/** @type {{ data: { templateSlug: string } }} */
	let { data } = $props();
</script>

<BuilderPage templateSlug={data.templateSlug} />
