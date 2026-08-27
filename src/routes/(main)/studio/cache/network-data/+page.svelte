<script>
	import LoginGate from '$lib/components/auth/LoginGate.svelte';
	import Meta from '$lib/components/Meta.svelte';
	import CacheDashboard from './_components/CacheDashboard.svelte';
</script>

<Meta
	title="Network Cache"
	description="Inspect and refresh the tracker's edge-cached network data."
	image="/img/preview.jpg"
/>

<LoginGate
	redirectUrl="/studio/cache/network-data"
	title="Sign in"
	description="The network cache dashboard requires an administrator account."
>
	<CacheDashboard />
</LoginGate>
