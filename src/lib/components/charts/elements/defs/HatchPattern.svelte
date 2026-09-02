<script>
	/**
	 * @typedef {Object} Props
	 * @property {string} [id]
	 * @property {string} [stroke]
	 * @property {string} [strokeWidth]
	 * @property {string} [patternTransform]
	 */

	/** @type {Props} */
	let {
		id = 'hatch-pattern',
		stroke = 'rgba(236, 233, 230, 0.4)',
		strokeWidth = '1px',
		patternTransform = 'rotate(20)'
	} = $props();
</script>

<pattern {id} width="4" height="4" patternUnits="userSpaceOnUse" {patternTransform}>
	<line {stroke} stroke-width={strokeWidth} y2="10" />
</pattern>
