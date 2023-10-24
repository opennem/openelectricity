<script lang="ts">
	import { page } from '$app/stores';
</script>

<div class="container mx-auto py-12">
	<h1 class="text-3xl font-bold">Error!</h1>
	<p>{$page.error?.message}</p>
</div>
