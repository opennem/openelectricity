<script>
	import { afterNavigate } from '$app/navigation';

	// after navigate, scroll back to top
	afterNavigate(() => {
		window.scrollTo(0, 0);
	});
</script>

<slot />
