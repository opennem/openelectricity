<script>
	import Meta from '$lib/components/Meta.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import SectionLink from '$lib/components/SectionLink.svelte';
	import Social from './Social.svelte';
	let { data } = $props();

	const team = data.team;
</script>

<Meta title="About" image="/img/preview.jpg" />

<PageHeader title="About" />

<main class="max-w-5xl mx-auto py-24 px-10 md:px-0">
	<h2>Open Electricity — An open platform for tracking Australia’s electricity transition.</h2>

	<section class="py-12 text-base">
		<h3>Our Mission</h3>

		<p>
			Formerly OpenNEM, Open Electricity aims to make the wealth of public National Electricity
			Market (NEM) and Wholesale Electricity Market (WEM) data more accessible to a wider audience.
		</p>

		<p>
			We hope that improved access will facilitate better public understanding of the market,
			improve energy literacy and help facilitate a more informed national discussion on Australia’s
			energy transition in the long term interests of consumers.
		</p>

		<p>
			By providing a clear window on the data, we aim to address the information asymmetry between
			stakeholders and improve the productivity of those engaged in energy market discussions.
		</p>
	</section>

	<section class="py-12">
		<h3>Our Team</h3>

		<dl
			class="flex flex-col mt-12 border-y border-dotted border-mid-warm-grey divide-y divide-dotted divide-mid-warm-grey gap-0"
		>
			{#each team as member}
				<div class="py-12">
					<dt class="flex justify-between items-center">
						<div class="flex flex-col gap-2">
							<h4 class="mb-0">{member.name}</h4>
							<span class="text-mid-grey text-sm">{member.role}</span>
						</div>

						<div class="text-dark-grey flex items-center gap-6">
							{#each member.social as { type, href }}
								<Social {href} socialType={type} />
							{/each}
						</div>
					</dt>
					{#if member.bio.length > 0}
						<dd class="pt-6 text-base">
							{#each member.bio as paragraph}
								<p>{paragraph}</p>
							{/each}
						</dd>
					{/if}
				</div>
			{/each}
		</dl>
	</section>

	<section class="py-12 text-base">
		<h3>Transparency & Accountability</h3>
		<p class="text-dark-grey">
			Open Electricity is developed under the Open, Accessible, Auditable Data (OAAD) framework.
			OAAD was developed by The Superpower Institute to accelerate Australia's climate energy
			transition.
		</p>
		<p class="text-dark-grey">
			Getting measurement right is a fundamental building block for transparent markets. The OAAD
			framework will ensure that critical climate and energy data is available to all, allowing
			industry, researchers and policy makers to better inform and improve their work.
		</p>
	</section>

	<section class="py-12 text-base">
		<h3>Partnership & Funders</h3>

		<dl class="flex flex-col gap-8 mt-8 border-y md:border-y-0 border-dotted border-mid-warm-grey">
			<div class="pt-12 md:pt-0 md:grid md:grid-cols-8">
				<dt class="col-span-2 place-self-center">
					<img src="/img/trimtab.png" alt="Trimtab Foundation logo" class="block h-12 w-auto" />
				</dt>

				<dd class="text-dark-grey col-span-6 md:pl-12 pt-6 font-light">
					<p>Trimtab Foundation</p>
				</dd>
			</div>

			<div class="pt-12 md:pt-0 md:grid md:grid-cols-8">
				<dt class="col-span-2 place-self-center">
					<img
						src="/img/superpower-new.svg"
						alt="The Superpower Institute logo"
						class="block h-12 w-auto"
					/>
				</dt>

				<dd class="text-dark-grey col-span-6 md:pl-12 pt-6 font-light">
					<p>
						Open Electricity is a <a
							class="text-dark-grey underline"
							href="https://www.superpowerinstitute.com.au">Superpower Institute</a
						> project. The mission of The Superpower Institute is to build practical knowledge required
						for a rapid, economically efficient and secure transition that positions Australia as a climate
						leader and Superpower in the low carbon world economy.
					</p>
				</dd>
			</div>

			<div class="pt-12 md:pt-0 md:grid md:grid-cols-8">
				<dt class="col-span-2 place-self-center">
					<img src="/img/boundless.svg" alt="Boundless logo" class="block h-6 w-auto" />
				</dt>

				<dd class="text-dark-grey col-span-6 md:pl-12 pt-6 font-light">
					<p>
						The evolution of OpenNEM into Open Electricity, marked by a significant uplift in design
						and features, was made possible due to funding support from <a
							class="text-dark-grey underline"
							href="https://www.boundless.earth/">Boundless Earth</a
						>. Boundless Earth’s purpose is to accelerate climate solutions at the scale and speed
						required for Australia to do its fair share to avert the climate crisis.
					</p>
				</dd>
			</div>

			<div class="pt-12 md:pt-0 md:grid md:grid-cols-8">
				<dt class="col-span-2 place-self-center">
					<img src="/img/eca.svg" alt="Energy Consumers Australia logo" class="block h-16 w-auto" />
				</dt>

				<dd class="text-dark-grey col-span-6 md:pl-12 pt-6 font-light">
					<p>
						The original OpenNEM project was supported by <a
							class="text-dark-grey underline"
							href="https://energyconsumersaustralia.com.au/">Energy Consumers Australia</a
						> as part of its grants process for consumer advocacy projects and research projects for the
						benefit of consumers of electricity and natural gas. The project was developed and administered
						at the University of Melbourne’s Climate and Energy College.
					</p>
				</dd>
			</div>
		</dl>
	</section>

	<section class="py-12 text-base">
		<h3>Other Supporters</h3>
		<dl
			class="flex flex-col gap-8 mt-8 divide-y md:divide-y-0 divide-dotted divide-mid-warm-grey border-y md:border-y-0 border-dotted border-mid-warm-grey"
		>
			<div class="pt-12 md:pt-0 md:grid md:grid-cols-8">
				<dt class="col-span-2 place-self-center">
					<img
						src="/img/supporters/DO_Logo_icon_black.png"
						alt="Digital Ocean logo"
						class="block h-16 w-auto"
					/>
				</dt>

				<dd class="text-dark-grey col-span-6 md:pl-12 pt-6 font-light">
					<p>
						<a class="text-dark-grey underline" href="https://www.digitalocean.com/">
							DigitalOcean
						</a>
						— Cloud Infrastructure for Developers
					</p>
				</dd>
			</div>

			<div class="pt-12 md:pt-0 md:grid md:grid-cols-8">
				<dt class="col-span-2 place-self-center">
					<img
						src="/img/supporters/sentry-glyph-dark-400x367.svg"
						alt="Sentry logo"
						class="block h-16 w-auto"
					/>
				</dt>

				<dd class="text-dark-grey col-span-6 md:pl-12 pt-6 font-light">
					<p>
						<a class="text-dark-grey underline" href="https://sentry.io/"> Sentry </a>
						— Application Performance Monitoring & Error Tracking Software
					</p>
				</dd>
			</div>
		</dl>
	</section>

	<section class="py-12 text-base">
		<h3>Get involved</h3>

		<div class="mt-10">
			<h4>Developer Resources</h4>

			<p class="text-dark-grey">
				For developers interested in contributing to the project, accessing our codebase or
				utilising our APIs for custom applications, have a look at our developer resources.
			</p>

			<SectionLink
				href="https://docs.openelectricity.org.au"
				target="_blank"
				title="View here"
				classes="underline"
			/>
		</div>
	</section>
</main>
