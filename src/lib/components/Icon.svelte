<script>
	export let icon = '';
	export let size = 16;
</script>

<svg
	width={size}
	height={size}
	viewBox={`0 0 ${size} ${size}`}
	fill="none"
	class={`${$$restProps.class ? $$restProps.class : ''}`}
>
	<use xlink:href={`/img/icons/${icon}.svg#icon`} width={size} height={size} />
</svg>
