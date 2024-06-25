<script>
	import { page } from '$app/stores';
	export let type = 'website'; // or article, or music.album etc. See https://ogp.me/#types
	export let title = '';
	export let description =
		"Open Electricity is a platform for exploring Australia's electricity system.";
	export let image = '/img/preview.jpg';
	export let path = $page.url.pathname;
	export let domain = 'https://openelectricity.org.au';
	export let siteTitle = 'Open Electricity';
	const titleWithSuffix = siteTitle === title ? title : (title ? title + ' | ' : '') + siteTitle;
	const fullURI = `${domain}${path}`;
</script>

<svelte:head>
	<meta property="og:type" content={type} />
	<meta property="og:url" content={fullURI} />
	<meta property="twitter:url" content={fullURI} />

	{#if titleWithSuffix}
		<title>{titleWithSuffix}</title>
		<meta name="title" content={titleWithSuffix} />
		<meta property="og:title" content={titleWithSuffix} />
		<meta property="twitter:title" content={titleWithSuffix} />
	{/if}

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

	<script async src="https://www.googletagmanager.com/gtag/js?id=G-461CNN34M4"></script>
	<script>
		window.dataLayer = window.dataLayer || [];
		function gtag() {
			dataLayer.push(arguments);
		}
		gtag('js', new Date());

		gtag('config', 'G-461CNN34M4');
	</script>
</svelte:head>
