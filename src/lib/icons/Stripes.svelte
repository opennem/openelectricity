<script>
	/** Five vertical bars of stepped opacity: the stripes display glyph. */
	/** @type {{ [key: string]: any }} */
	let { ...rest } = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 24 24"
	fill="currentColor"
	class="size-6"
	aria-hidden="true"
	{...rest}
>
	<rect x="3" y="4" width="3" height="16" rx="0.5" opacity="0.3" />
	<rect x="6.75" y="4" width="3" height="16" rx="0.5" opacity="0.5" />
	<rect x="10.5" y="4" width="3" height="16" rx="0.5" opacity="0.7" />
	<rect x="14.25" y="4" width="3" height="16" rx="0.5" opacity="0.85" />
	<rect x="18" y="4" width="3" height="16" rx="0.5" />
</svg>
