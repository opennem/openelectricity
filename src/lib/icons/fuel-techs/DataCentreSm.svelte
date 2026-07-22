<script>
	/** @type {{ [key: string]: any }} */
	let { ...rest } = $props();
</script>

<!-- Server rack: three bays, each with an indicator LED and a vent slot. -->
<svg
	width="17"
	height="17"
	viewBox="0 0 17 17"
	fill="none"
	stroke="currentColor"
	class="size-6"
	{...rest}
	xmlns="http://www.w3.org/2000/svg"
>
	<rect x="4" y="2.5" width="9" height="12" rx="1" />
	<line x1="4" y1="6.5" x2="13" y2="6.5" />
	<line x1="4" y1="10.5" x2="13" y2="10.5" />
	<circle cx="6.25" cy="4.5" r="0.75" fill="currentColor" stroke-width="0" />
	<circle cx="6.25" cy="8.5" r="0.75" fill="currentColor" stroke-width="0" />
	<circle cx="6.25" cy="12.5" r="0.75" fill="currentColor" stroke-width="0" />
	<rect x="8.5" y="4.25" width="3" height="0.5" rx="0.25" fill="currentColor" stroke-width="0" />
	<rect x="8.5" y="8.25" width="3" height="0.5" rx="0.25" fill="currentColor" stroke-width="0" />
	<rect x="8.5" y="12.25" width="3" height="0.5" rx="0.25" fill="currentColor" stroke-width="0" />
</svg>
