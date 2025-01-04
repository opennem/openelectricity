<!-- @migration-task Error while migrating Svelte code: This migration would change the name of a slot making the component unusable -->
<script>
	export let title = '';
</script>

<div
	class="page-header bg-light-warm-grey border-b border-warm-grey h-[300px] flex items-center justify-center"
>
	<header class="container max-w-none md:container">
		<div>
			<slot name="main-heading">
				<h1 class="pt-32">{title}</h1>
			</slot>
		</div>

		<slot name="sub-heading" />
	</header>
</div>
