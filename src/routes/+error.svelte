<script lang="ts">
	import { page } from '$app/state';

	$effect(() => {
		console.log('error', page.error);
	});
</script>

<div class="container max-w-none lg:container py-12">
	<h1 class="text-3xl font-bold">Error!</h1>
	<p>{page.error?.message}</p>
</div>
