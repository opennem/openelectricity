<script>
	export let goal = '';
	export let index = 1;
</script>

<div class="goal">
	<span>{`0${index}`.slice(-2)}</span>
	<div>{goal}</div>
</div>

<style lang="postcss">
	.goal {
		position: relative;
		padding: theme(spacing.16) theme(spacing.12) theme(spacing.24);
		background-color: theme(colors.light-warm-grey);
	}
	.goal > span {
		display: block;
		font-family: theme(fontFamily.space);
		line-height: theme(lineHeight.snug);
		font-size: theme(fontSize.base);
		font-weight: theme(fontWeight.bold);
		margin-bottom: theme(spacing.12);
		color: theme(colors.red);
	}
	.goal > div {
		line-height: theme(lineHeight.snug);
		font-size: theme(fontSize.lg);
		font-weight: theme(fontWeight.bold);
	}
	.goal:before {
		content: '';
		display: block;
		pointer-events: none;
		position: absolute;
		top: -0.8rem;
		left: 0;
		height: calc(100% + 1.6rem);
		width: 100%;
		border-left: 0.1rem solid theme(colors.warm-grey);
		border-right: 0.1rem solid theme(colors.warm-grey);
	}
	.goal:after {
		content: '';
		display: block;
		pointer-events: none;
		position: absolute;
		left: -0.8rem;
		top: 0;
		width: calc(100% + 1.6rem);
		height: 100%;
		border-top: 0.1rem solid theme(colors.warm-grey);
		border-bottom: 0.1rem solid theme(colors.warm-grey);
	}
</style>
