<script>
	/**
	 * @typedef {Object} Props
	 * @property {string} [id]
	 * @property {string} [stroke]
	 * @property {string} [strokeWidth]
	 */

	/** @type {Props} */
	let { id = 'hatch-pattern', stroke = 'rgba(236, 233, 230, 0.4)', strokeWidth = '1px' } = $props();
</script>

<pattern {id} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(20)">
	<line {stroke} stroke-width={strokeWidth} y2="10" />
</pattern>
