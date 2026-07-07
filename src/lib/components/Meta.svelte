<script>
	import { page } from '$app/stores';
	/**
	 * @typedef {Object} Props
	 * @property {string} [type] - or article, or music.album etc. See https://ogp.me/#types
	 * @property {string} [title]
	 * @property {string} [description]
	 * @property {string} [image]
	 * @property {number} [imageWidth] - emits og:image:width (needs imageHeight too)
	 * @property {number} [imageHeight] - emits og:image:height
	 * @property {string} [imageType] - e.g. 'image/jpeg'; emits og:image:type
	 * @property {any} [path]
	 * @property {string} [domain]
	 * @property {string} [siteTitle]
	 * @property {boolean} [useSuffix]
	 * @property {boolean | string} [canonical] - false suppresses the canonical link (e.g. draft/preview routes); a string overrides the URL
	 */

	/** @type {Props} */
	let {
		type = 'website',
		title = '',
		description = "An open platform for tracking Australia's electricity transition",
		image = '/img/preview.jpg',
		imageWidth = undefined,
		imageHeight = undefined,
		imageType = undefined,
		path = $page.url.pathname,
		domain = 'https://openelectricity.org.au',
		siteTitle = 'Open Electricity',
		useSuffix = true,
		canonical = true
	} = $props();
	let titleWithSuffix = $derived(
		siteTitle === title ? title : (title ? title + ' | ' : '') + siteTitle
	);
	let pageTitle = $derived(useSuffix ? titleWithSuffix : title);
	let fullURI = $derived(`${domain}${path}`);
	// og:image should be an absolute URL — prefix the domain for root-relative paths.
	let imageUrl = $derived(image && !/^https?:\/\//.test(image) ? `${domain}${image}` : image);
	let canonicalUrl = $derived(canonical === true ? fullURI : canonical || null);
</script>

<svelte:head>
	<meta property="og:type" content={type} />
	<meta property="og:site_name" content={siteTitle} />
	<meta property="og:url" content={fullURI} />
	{#if canonicalUrl}
		<link rel="canonical" href={canonicalUrl} />
	{/if}

	<title>{titleWithSuffix}</title>
	<meta name="title" content={pageTitle} />
	<meta property="og:title" content={pageTitle} />
	<meta name="twitter:title" content={pageTitle} />

	{#if description}
		<meta name="description" content={description} />
		<meta property="og:description" content={description} />
		<meta name="twitter:description" content={description} />
	{/if}

	{#if imageUrl}
		<meta property="og:image" content={imageUrl} />
		<meta property="og:image:secure_url" content={imageUrl} />
		<meta property="og:image:alt" content={pageTitle} />
		{#if imageType}
			<meta property="og:image:type" content={imageType} />
		{/if}
		{#if imageWidth && imageHeight}
			<meta property="og:image:width" content={`${imageWidth}`} />
			<meta property="og:image:height" content={`${imageHeight}`} />
		{/if}
		<meta name="twitter:card" content="summary_large_image" />
		<meta name="twitter:image" content={imageUrl} />
		<meta name="twitter:image:alt" content={pageTitle} />
	{/if}
</svelte:head>
