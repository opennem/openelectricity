<script>
	import { page } from '$app/stores';
	/**
	 * @typedef {Object} Props
	 * @property {string} [type] - or article, or music.album etc. See https://ogp.me/#types
	 * @property {string} [title]
	 * @property {string} [description]
	 * @property {string} [image]
	 * @property {any} [path]
	 * @property {string} [domain]
	 * @property {string} [siteTitle]
	 * @property {boolean} [useSuffix]
	 */

	/** @type {Props} */
	let {
		type = 'website',
		title = '',
		description = "An open platform for tracking Australia's electricity transition",
		image = '/img/preview.jpg',
		path = $page.url.pathname,
		domain = 'https://openelectricity.org.au',
		siteTitle = 'Open Electricity',
		useSuffix = true
	} = $props();
	let titleWithSuffix = $derived(
		siteTitle === title ? title : (title ? title + ' | ' : '') + siteTitle
	);
	let pageTitle = $derived(useSuffix ? titleWithSuffix : title);
	let fullURI = $derived(`${domain}${path}`);
</script>

<svelte:head>
	<meta property="og:type" content={type} />
	<meta property="og:url" content={fullURI} />
	<meta property="twitter:url" content={fullURI} />

	<title>{titleWithSuffix}</title>
	<meta name="title" content={pageTitle} />
	<meta property="og:title" content={pageTitle} />
	<meta property="twitter:title" content={pageTitle} />

	{#if description}
		<meta name="description" content={description} />
		<meta property="og:description" content={description} />
		<meta property="twitter:description" content={description} />
	{/if}

	{#if image}
		<meta property="og:image" content={image} />
		<meta property="twitter:card" content="summary_large_image" />
		<meta property="twitter:image" content={image} />
	{/if}
</svelte:head>
