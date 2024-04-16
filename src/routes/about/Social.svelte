<script>
	import TwitterX from '$lib/icons/TwitterX.svelte';
	import Linkedin from '$lib/icons/Linkedin.svelte';
	import GlobeAlt from '$lib/icons/GlobeAlt.svelte';

	export let href = '';
	export let socialType = '';

	const iconComp = {
		twitter: TwitterX,
		linkedin: Linkedin,
		web: GlobeAlt
	};
</script>

<a {href} target="_blank" class="text-dark-grey">
	<svelte:component this={iconComp[socialType]} class="w-6 h-6" />
</a>
