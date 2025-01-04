<script>
	import { createBubbler } from 'svelte/legacy';

	const bubble = createBubbler();
	import IconArrowsPointingOut from '$lib/icons/ArrowsPointingOut.svelte';
</script>

<button
	title="Reset zoom"
	class="bg-white hover:bg-warm-grey border border-mid-warm-grey p-2 rounded-xl"
	onclick={bubble('click')}
>
	<IconArrowsPointingOut />
</button>
