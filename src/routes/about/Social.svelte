<script>
	import TwitterX from '$lib/icons/TwitterX.svelte';
	import Linkedin from '$lib/icons/Linkedin.svelte';
	import GlobeAlt from '$lib/icons/GlobeAlt.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {string} [href]
	 * @property {string} [socialType]
	 */

	/** @type {Props} */
	let { href = '', socialType = '' } = $props();

	const iconComp = {
		twitter: TwitterX,
		linkedin: Linkedin,
		web: GlobeAlt
	};

	const SvelteComponent = $derived(iconComp[socialType]);
</script>

<a {href} target="_blank" class="text-dark-grey">
	<SvelteComponent class="w-6 h-6" />
</a>
