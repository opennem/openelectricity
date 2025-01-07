<!-- @migration-task Error while migrating Svelte code: This migration would change the name of a slot making the component unusable -->
<script>
	export let title = '';
</script>

<div class="page-header bg-light-warm-grey border-b border-warm-grey">
	<header class="container max-w-none md:container md:flex items-center justify-center">
		<div>
			<slot name="main-heading">
				<h1 class="tracking-widest pt-32">{title}</h1>
			</slot>
		</div>

		<slot name="sub-heading" />
	</header>
</div>

<style>
	.page-header {
		background-image: url('/img/dot-square.svg');
		background-position: top -1px center;
		background-repeat: repeat;
		min-height: 24rem;
		border-bottom: 0.1rem solid #f1f0ed;
	}
</style>
