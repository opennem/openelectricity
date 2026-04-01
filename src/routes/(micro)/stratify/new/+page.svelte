<script>
	import LoginGate from '$lib/components/auth/LoginGate.svelte';
	import BuilderPage from '../_components/BuilderPage.svelte';
</script>

<LoginGate redirectUrl="/stratify/new">
	<BuilderPage />
</LoginGate>
