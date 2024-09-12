<script>
	import Meta from '$lib/components/Meta.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import SectionLink from '$lib/components/SectionLink.svelte';
	import Social from './Social.svelte';
	export let data;

	const team = data.team;
</script>

<Meta
	title="About"
	description="Open Electricity is a platform for exploring Australia's electricity system."
	image="/img/preview.jpg"
/>

<PageHeader title="About" />

<main class="max-w-5xl mx-auto py-24 px-10 md:px-0">
	<h2>Open Electricity — An open platform for tracking Australia’s electricity transition.</h2>

	<section class="py-12">
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
						<dd class="pt-6">
							{#each member.bio as paragraph}
								<p>{paragraph}</p>
							{/each}
						</dd>
					{/if}
				</div>
			{/each}
		</dl>
	</section>

	<section class="py-12">
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

	<section class="py-12">
		<h3>Partnership & Funders</h3>

		<dl
			class="flex flex-col gap-8 mt-8 divide-y md:divide-y-0 divide-dotted divide-mid-warm-grey border-y md:border-y-0 border-dotted border-mid-warm-grey"
		>
			<div
				class="pt-12 md:pt-0 md:grid md:grid-cols-8 md:divide-x divide-dotted divide-mid-warm-grey"
			>
				<dt class="col-span-2 place-self-center">
					<img src="/img/trimtab.png" alt="Trimtab Foundation logo" class="block h-12 w-auto" />
				</dt>

				<dd class="text-dark-grey col-span-6 md:pl-12 pt-6 font-light">
					<p>Trimtab Foundation</p>
				</dd>
			</div>

			<div
				class="pt-12 md:pt-0 md:grid md:grid-cols-8 md:divide-x divide-dotted divide-mid-warm-grey"
			>
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

			<div
				class="pt-12 md:pt-0 md:grid md:grid-cols-8 md:divide-x divide-dotted divide-mid-warm-grey"
			>
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

			<div
				class="pt-12 md:pt-0 md:grid md:grid-cols-8 md:divide-x divide-dotted divide-mid-warm-grey"
			>
				<dt class="col-span-2 place-self-center">
					<img src="/img/eca.svg" alt="Energy Consumers Australia logo" class="block h-16 w-auto" />
				</dt>

				<dd class="text-dark-grey col-span-6 md:pl-12 pt-6 font-light">
					<p>
						The original OpenNEM project was supported by <a
							class="text-dark-grey underline"
							href="https://energyconsumersaustralia.com.au/">Energy Consumers Australia</a
						> as part of its grants process for consumer advocacy projects and research projects for
						the benefit of consumers of electricity and natural gas. The project was developed and administered
						at the University of Melbourne’s Climate and Energy College.
					</p>
				</dd>
			</div>
		</dl>
	</section>

	<section class="py-12">
		<h3>Other Supporters</h3>
		<dl
			class="flex flex-col gap-8 mt-8 divide-y md:divide-y-0 divide-dotted divide-mid-warm-grey border-y md:border-y-0 border-dotted border-mid-warm-grey"
		>
			<div
				class="pt-12 md:pt-0 md:grid md:grid-cols-8 md:divide-x divide-dotted divide-mid-warm-grey"
			>
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

			<div
				class="pt-12 md:pt-0 md:grid md:grid-cols-8 md:divide-x divide-dotted divide-mid-warm-grey"
			>
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

	<section class="py-12">
		<h3>Get involved</h3>

		<div class="mt-10">
			<h4>Developer Documentation</h4>

			<p class="text-dark-grey">
				The Open Electricity project aims to make global energy network data more accessible to a
				wider audience through a website portal and data access APIs and tools.
			</p>
			<p class="text-dark-grey">
				Our client library enables access to the OpenNEM API and data sets.
			</p>

			<SectionLink href="/content/developers" title="View here" classes="underline" />

			<p class="text-dark-grey mt-8">
				For developers interested in contributing to the project, accessing our codebase or
				utilising our APIs for custom applications, we warmly invite you to visit our GitHub
				repository
			</p>

			<SectionLink href="https://github.com/opennem" title="View Github" classes="underline">
				<svg
					width="17"
					height="16"
					viewBox="0 0 17 16"
					class="w-8 h-8"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						d="M6.07422 12.5098C6.07422 12.4473 6.01172 12.3848 5.91797 12.3848C5.82422 12.3848 5.76172 12.4473 5.76172 12.5098C5.76172 12.5723 5.82422 12.6348 5.91797 12.6035C6.01172 12.6035 6.07422 12.5723 6.07422 12.5098ZM5.10547 12.3535C5.13672 12.291 5.23047 12.2598 5.32422 12.291C5.41797 12.3223 5.44922 12.3848 5.44922 12.4473C5.41797 12.5098 5.32422 12.541 5.26172 12.5098C5.16797 12.5098 5.10547 12.416 5.10547 12.3535ZM6.51172 12.3223C6.57422 12.291 6.66797 12.3535 6.66797 12.416C6.69922 12.4785 6.63672 12.5098 6.54297 12.541C6.44922 12.5723 6.35547 12.541 6.35547 12.4785C6.35547 12.3848 6.41797 12.3223 6.51172 12.3223ZM8.54297 0.322266C12.8867 0.322266 16.418 3.63477 16.418 7.94727C16.418 11.416 14.293 14.3848 11.168 15.416C10.7617 15.5098 10.6055 15.2598 10.6055 15.041C10.6055 14.791 10.6367 13.4785 10.6367 12.4473C10.6367 11.6973 10.3867 11.2285 10.1055 10.9785C11.8555 10.791 13.6992 10.541 13.6992 7.54102C13.6992 6.66602 13.3867 6.25977 12.8867 5.69727C12.9492 5.47852 13.2305 4.66602 12.793 3.57227C12.1367 3.35352 10.6367 4.41602 10.6367 4.41602C10.0117 4.22852 9.35547 4.16602 8.66797 4.16602C8.01172 4.16602 7.35547 4.22852 6.73047 4.41602C6.73047 4.41602 5.19922 3.38477 4.57422 3.57227C4.13672 4.66602 4.38672 5.47852 4.48047 5.69727C3.98047 6.25977 3.73047 6.66602 3.73047 7.54102C3.73047 10.541 5.51172 10.791 7.26172 10.9785C7.01172 11.1973 6.82422 11.541 6.76172 12.041C6.29297 12.2598 5.16797 12.6035 4.48047 11.3848C4.04297 10.6348 3.26172 10.5723 3.26172 10.5723C2.51172 10.5723 3.23047 11.0723 3.23047 11.0723C3.73047 11.291 4.07422 12.1973 4.07422 12.1973C4.54297 13.6035 6.73047 13.1348 6.73047 13.1348C6.73047 13.791 6.73047 14.8535 6.73047 15.0723C6.73047 15.2598 6.60547 15.5098 6.19922 15.4473C3.07422 14.3848 0.917969 11.416 0.917969 7.94727C0.917969 3.63477 4.23047 0.322266 8.54297 0.322266ZM3.94922 11.1035C3.98047 11.0723 4.04297 11.1035 4.10547 11.1348C4.16797 11.1973 4.16797 11.291 4.13672 11.3223C4.07422 11.3535 4.01172 11.3223 3.94922 11.291C3.91797 11.2285 3.88672 11.1348 3.94922 11.1035ZM3.60547 10.8535C3.63672 10.8223 3.66797 10.8223 3.73047 10.8535C3.79297 10.8848 3.82422 10.916 3.82422 10.9473C3.79297 11.0098 3.73047 11.0098 3.66797 10.9785C3.60547 10.9473 3.57422 10.916 3.60547 10.8535ZM4.60547 11.9785C4.66797 11.916 4.76172 11.9473 4.82422 12.0098C4.88672 12.0723 4.88672 12.166 4.85547 12.1973C4.82422 12.2598 4.73047 12.2285 4.66797 12.166C4.57422 12.1035 4.57422 12.0098 4.60547 11.9785ZM4.26172 11.5098C4.32422 11.4785 4.38672 11.5098 4.44922 11.5723C4.48047 11.6348 4.48047 11.7285 4.44922 11.7598C4.38672 11.791 4.32422 11.7598 4.26172 11.6973C4.19922 11.6348 4.19922 11.541 4.26172 11.5098Z"
						fill="black"
					/>
				</svg>
			</SectionLink>
		</div>
	</section>
</main>
