<script>
	export let title = '';
	export let scenarioTitle = '';
	export let description = '';
</script>

<div class="relative">
	<div class="hidden md:block md:text-right text-xxs md:text-xs text-mid-grey mt-3 md:-mt-10">
		{title}
	</div>

	<div class="md:w-1/2 mt-8 md:mt-16 ml-16 mr-16 md:mr-0">
		<h5 class="subhead-secondary mb-6">{scenarioTitle}</h5>
		<p class="text-dark-grey text-base leading-base font-semibold md:text-xl md:leading-xl">
			{description}
		</p>
	</div>
</div>
