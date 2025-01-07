<script>
	/**
	 * @typedef {Object} Props
	 * @property {string} [classes]
	 */

	/** @type {Props} */
	let { classes = 'w-24 h-24' } = $props();
</script>

<svg
	width="28"
	height="16"
	viewBox="0 0 28 16"
	fill="none"
	xmlns="http://www.w3.org/2000/svg"
	class={classes}
>
	<path
		fill-rule="evenodd"
		clip-rule="evenodd"
		d="M10.1167 0.358643L17.8205 8.06241L23.6296 2.25339L27.4191 6.04287L17.8205 15.6414L10.1167 7.93762L4.30759 13.7466L0.518066 9.95716L10.1167 0.358643Z"
		stroke="white"
		stroke-width="0.303563"
	>
		<animate
			attributeName="fill"
			values="#594929;#A6A36F;#E9FFAA;#9ED48B;#52A972;#9ED48B;#E9FFAA;#A6A36F;#594929"
			dur="5s"
			repeatCount="indefinite"
		/>
	</path>
</svg>
