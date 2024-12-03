<script>
	import { formatFyTickX } from '$lib/utils/formatters';

	export let hoverTime = null;
</script>

<header class="flex justify-end h-12 px-10 md:px-0">
	<span class="font-semibold">
		{hoverTime ? formatFyTickX(hoverTime) : ''}
	</span>
</header>
