<script>
	import { getContext } from 'svelte';

	const scenarios = [
		{
			model: 'aemo2024',
			organisation: 'AEMO',
			year: 2024,
			draft: true,
			scenario: 'Step Change'
		},
		{
			model: 'aemo2024',
			organisation: 'AEMO',
			year: 2024,
			draft: true,
			scenario: 'Progressive Change'
		},
		{
			model: 'aemo2024',
			organisation: 'AEMO',
			year: 2024,
			draft: true,
			scenario: 'Green Energy Exports'
		},
		{
			model: 'aemo2022',
			organisation: 'AEMO',
			year: 2022,
			draft: false,
			scenario: 'Step Change'
		},
		{
			model: 'aemo2022',
			organisation: 'AEMO',
			year: 2022,
			draft: false,
			scenario: 'Slow Change'
		},
		{
			model: 'aemo2022',
			organisation: 'AEMO',
			year: 2022,
			draft: false,
			scenario: 'Progressive Change'
		},
		{
			model: 'aemo2022',
			organisation: 'AEMO',
			year: 2022,
			draft: false,
			scenario: 'Hydrogen Superpower'
		}
	];
</script>

<div class="border-b border-t border-warm-grey">
	<div class="container grid grid-cols-3 divide-x divide-warm-grey">
		<div class="p-6 pl-0 col-span-2">
			<h5>Current Scenarios</h5>

			<ul class="grid grid-cols-3 gap-3">
				{#each scenarios as { organisation, year, scenario, draft }}
					<li
						class="border border-warm-grey rounded-lg p-4 grid grid-cols-1 gap-6 place-content-between"
					>
						<span class="text-sm">{scenario}</span>

						<div class="flex justify-between text-xs">
							<div>
								{year}
								{#if draft}
									<span>Draft</span>
								{/if}
							</div>

							<span>{organisation}</span>
						</div>
					</li>
				{/each}
			</ul>
		</div>

		<div class="p-6">Pathway</div>
	</div>
</div>
