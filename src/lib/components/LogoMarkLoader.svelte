<script>
	/**
	 * @typedef {Object} Props
	 * @property {string} [class] - Additional CSS classes
	 */

	/** @type {Props} */
	let { class: className = '' } = $props();
</script>

<div class="flex items-center justify-center gap-2 {className}">
	<svg
		class="animate-pulse"
		width="24"
		height="24"
		viewBox="70 6 24 16"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path
			fill-rule="evenodd"
			clip-rule="evenodd"
			d="M79.6652 8.96582L84.7408 14.0414L88.5681 10.2142L91.0647 12.7108L84.7408 19.0348L79.6652 13.9592L75.838 17.7864L73.3413 15.2897L79.6652 8.96582Z"
			fill="#A29D66"
			stroke="black"
			stroke-width="0.2"
		/>
	</svg>
</div>
