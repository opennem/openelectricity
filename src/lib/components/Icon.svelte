<script>
	/**
	 * @typedef {Object} Props
	 * @property {string} [icon]
	 * @property {number} [size]
	 */

	/** @type {Props & { [key: string]: any }} */
	let { icon = '', size = 16, ...rest } = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox={`0 0 ${size} ${size}`}
	fill="none"
	class={`${rest.class ? rest.class : ''}`}
>
	<use xlink:href={`/img/icons/${icon}.svg#icon`} width={size} height={size} />
</svg>
