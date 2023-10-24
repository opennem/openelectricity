<script>
	import '../app.css';
	import Nav from '$lib/components/Nav.svelte';
	import Footer from '$lib/components/Footer.svelte';
</script>

<Nav />

<main class="p-2 flex-grow">
	<slot />
</main>

<Footer />
