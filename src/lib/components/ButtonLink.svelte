<script>
	export let href = '';
	export let target = '_self';
</script>

<a
	class={`flex gap-6 justify-between items-center rounded-lg font-space border border-black border-solid bg-white p-6 transition-all text-black hover:text-white hover:bg-black hover:no-underline ${
		$$restProps.class || ''
	}`}
	{href}
	{target}
>
	<slot />
</a>
