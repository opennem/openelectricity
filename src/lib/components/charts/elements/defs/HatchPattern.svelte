<script>
	export let id = 'hatch-pattern';
	export let stroke = 'rgba(236, 233, 230, 0.4)';
	export let strokeWidth = '1px';
</script>

<pattern {id} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(20)">
	<line {stroke} stroke-width={strokeWidth} y2="10" />
</pattern>
