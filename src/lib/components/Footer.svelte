<script>
	import { version } from '$app/environment';
	import { ScrollText } from '@lucide/svelte';
	import ApiStatus from './ApiStatus.svelte';
	import SectionLink from './SectionLink.svelte';
	import SignUpForm from './SignUpForm.svelte';
</script>

<footer class="mb-32 relative z-10">
	<div class="bg-light-warm-grey py-16">
		<div class="container max-w-none lg:container">
			<div class="flex flex-col md:flex-row gap-8 md:gap-0">
				<div class="flex items-center justify-center shrink-0">
					<img src="/img/logo.svg" alt="Open Electricity logo" class="block h-8 w-auto mr-8 mt-2" />
					<img
						src="/img/superpower-new.svg"
						alt="The Superpower Institute logo"
						class="block h-12 w-auto"
					/>
				</div>
				<div class="text-center md:shrink md:px-12 md:text-left text-base">
					<strong>Stay Connected</strong> — Sign up to be notified of platform updates, events and the
					latest analysis.
				</div>

				<SignUpForm class="md:w-5/12" />
			</div>
		</div>
	</div>
	<div class="bg-white py-16">
		<div
			class="container max-w-none lg:container block md:grid md:grid-cols-2 footer-info-grid gap-8 md:gap-48 text-sm md:after:content-[''] relative"
		>
			<div>
				<p class="flex flex-col gap-4 md:flex-row md:gap-12 text-base mb-8">
					<SectionLink href="/about" title="About" />
					<SectionLink href="/newsletter" title="Newsletter" />
				</p>

				<h5 class="mt-12">Acknowledgement of Country</h5>
				<p>
					We pay our respects to the Traditional Custodians of the lands on which we live and work,
					as well as the Traditional Custodians of the lands and waters we may visit during our
					work. We acknowledge their Elders, past and present.
				</p>
				<p class="flex">
					<img class="h-8 mr-4" src="/img/aboriginal-flag.svg" alt="Aboriginal flag" />
					<img class="h-8 mr-4" src="/img/lgbtqi-flag.svg" alt="LGBTQI flag" />
					<img class="h-8" src="/img/tsi-flag.svg" alt="Torres Strait Islands flag" />
				</p>
			</div>
			<div class="mt-16 md:mt-0">
				<h5>For Developers</h5>
				<p>
					Access real-time and historical energy data from across Australia's electricity grid. Built for teams that need reliable, well-documented APIs and clear usage tooling.
				</p>
				<p class="flex flex-col gap-4 md:flex-row md:gap-12 text-base">
					<SectionLink
						href="https://platform.openelectricity.org.au/"
						target="_blank"
						title="Platform"
					/>
					<SectionLink
						href="https://docs.openelectricity.org.au/"
						target="_blank"
						title="Documentation"
					/>
					<ApiStatus />
				</p>

				<h5 class="mt-12">Transparency & Accountability</h5>
				<p>
					We are committed to upholding the <a
						href="https://www.superpowerinstitute.com.au/open-data-tools"
						target="_blank">Open, Accessible, Auditable Data Framework</a
					>, ensuring that our data and methodology are transparent, verifiable, and easily
					accessible to all.
				</p>
				<p>
					Our data sources and open-source code are available for review and collaboration, aimed at
					fostering a spirit of openness and shared learning in industry and the scientific research
					community.
				</p>
				<div class="flex items-center justify-between mt-16">
					<div class="flex gap-8 items-center">
						<a href="https://openmethane.org" target="_blank">
							<img src="/img/om-new.svg" alt="Open Methane logo" class="block h-7 w-auto mt-2" />
						</a>
						<a href="https://www.superpowerinstitute.com.au/" target="_blank">
							<img
								src="/img/superpower-new.svg"
								alt="The Superpower Institute logo"
								class="block h-10 w-auto"
							/>
						</a>
					</div>
					<div class="flex gap-8 items-center">
						<a href="https://twitter.com/OpenNem" target="_blank" title="OpenElectricity X">
							<svg
								width="17"
								height="14"
								viewBox="0 0 17 14"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									d="M15.0117 3.82227C15.0117 3.97852 15.0117 4.10352 15.0117 4.25977C15.0117 8.60352 11.7305 13.5723 5.69922 13.5723C3.82422 13.5723 2.10547 13.041 0.667969 12.1035C0.917969 12.1348 1.16797 12.166 1.44922 12.166C2.98047 12.166 4.38672 11.6348 5.51172 10.7598C4.07422 10.7285 2.85547 9.79102 2.44922 8.47852C2.66797 8.50977 2.85547 8.54102 3.07422 8.54102C3.35547 8.54102 3.66797 8.47852 3.91797 8.41602C2.41797 8.10352 1.29297 6.79102 1.29297 5.19727V5.16602C1.73047 5.41602 2.26172 5.54102 2.79297 5.57227C1.88672 4.97852 1.32422 3.97852 1.32422 2.85352C1.32422 2.22852 1.48047 1.66602 1.76172 1.19727C3.38672 3.16602 5.82422 4.47852 8.54297 4.63477C8.48047 4.38477 8.44922 4.13477 8.44922 3.88477C8.44922 2.07227 9.91797 0.603516 11.7305 0.603516C12.668 0.603516 13.5117 0.978516 14.1367 1.63477C14.8555 1.47852 15.5742 1.19727 16.1992 0.822266C15.9492 1.60352 15.4492 2.22852 14.7617 2.63477C15.418 2.57227 16.0742 2.38477 16.6367 2.13477C16.1992 2.79102 15.6367 3.35352 15.0117 3.82227Z"
									fill="black"
								/>
							</svg>
						</a>
						<a href="https://github.com/opennem/" target="_blank" title="OpenElectricity GitHub">
							<svg
								width="17"
								height="16"
								viewBox="0 0 17 16"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									d="M6.07422 12.5098C6.07422 12.4473 6.01172 12.3848 5.91797 12.3848C5.82422 12.3848 5.76172 12.4473 5.76172 12.5098C5.76172 12.5723 5.82422 12.6348 5.91797 12.6035C6.01172 12.6035 6.07422 12.5723 6.07422 12.5098ZM5.10547 12.3535C5.13672 12.291 5.23047 12.2598 5.32422 12.291C5.41797 12.3223 5.44922 12.3848 5.44922 12.4473C5.41797 12.5098 5.32422 12.541 5.26172 12.5098C5.16797 12.5098 5.10547 12.416 5.10547 12.3535ZM6.51172 12.3223C6.57422 12.291 6.66797 12.3535 6.66797 12.416C6.69922 12.4785 6.63672 12.5098 6.54297 12.541C6.44922 12.5723 6.35547 12.541 6.35547 12.4785C6.35547 12.3848 6.41797 12.3223 6.51172 12.3223ZM8.54297 0.322266C12.8867 0.322266 16.418 3.63477 16.418 7.94727C16.418 11.416 14.293 14.3848 11.168 15.416C10.7617 15.5098 10.6055 15.2598 10.6055 15.041C10.6055 14.791 10.6367 13.4785 10.6367 12.4473C10.6367 11.6973 10.3867 11.2285 10.1055 10.9785C11.8555 10.791 13.6992 10.541 13.6992 7.54102C13.6992 6.66602 13.3867 6.25977 12.8867 5.69727C12.9492 5.47852 13.2305 4.66602 12.793 3.57227C12.1367 3.35352 10.6367 4.41602 10.6367 4.41602C10.0117 4.22852 9.35547 4.16602 8.66797 4.16602C8.01172 4.16602 7.35547 4.22852 6.73047 4.41602C6.73047 4.41602 5.19922 3.38477 4.57422 3.57227C4.13672 4.66602 4.38672 5.47852 4.48047 5.69727C3.98047 6.25977 3.73047 6.66602 3.73047 7.54102C3.73047 10.541 5.51172 10.791 7.26172 10.9785C7.01172 11.1973 6.82422 11.541 6.76172 12.041C6.29297 12.2598 5.16797 12.6035 4.48047 11.3848C4.04297 10.6348 3.26172 10.5723 3.26172 10.5723C2.51172 10.5723 3.23047 11.0723 3.23047 11.0723C3.73047 11.291 4.07422 12.1973 4.07422 12.1973C4.54297 13.6035 6.73047 13.1348 6.73047 13.1348C6.73047 13.791 6.73047 14.8535 6.73047 15.0723C6.73047 15.2598 6.60547 15.5098 6.19922 15.4473C3.07422 14.3848 0.917969 11.416 0.917969 7.94727C0.917969 3.63477 4.23047 0.322266 8.54297 0.322266ZM3.94922 11.1035C3.98047 11.0723 4.04297 11.1035 4.10547 11.1348C4.16797 11.1973 4.16797 11.291 4.13672 11.3223C4.07422 11.3535 4.01172 11.3223 3.94922 11.291C3.91797 11.2285 3.88672 11.1348 3.94922 11.1035ZM3.60547 10.8535C3.63672 10.8223 3.66797 10.8223 3.73047 10.8535C3.79297 10.8848 3.82422 10.916 3.82422 10.9473C3.79297 11.0098 3.73047 11.0098 3.66797 10.9785C3.60547 10.9473 3.57422 10.916 3.60547 10.8535ZM4.60547 11.9785C4.66797 11.916 4.76172 11.9473 4.82422 12.0098C4.88672 12.0723 4.88672 12.166 4.85547 12.1973C4.82422 12.2598 4.73047 12.2285 4.66797 12.166C4.57422 12.1035 4.57422 12.0098 4.60547 11.9785ZM4.26172 11.5098C4.32422 11.4785 4.38672 11.5098 4.44922 11.5723C4.48047 11.6348 4.48047 11.7285 4.44922 11.7598C4.38672 11.791 4.32422 11.7598 4.26172 11.6973C4.19922 11.6348 4.19922 11.541 4.26172 11.5098Z"
									fill="black"
								/>
							</svg>
						</a>
						<a
							href="https://platform.openelectricity.org.au/license"
							target="_blank"
							title="License"
						>
							<ScrollText size={20} color="black" />
						</a>
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="text-xs text-center text-mid-warm-grey">{version}</div>
</footer>
<!-- 
<style lang="postcss">
	.footer-info-grid:after {
		display: block;
		width: 0.1rem;
		height: 100%;
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		background-color: theme(colors.mid-warm-grey);
	}
	.flag {
		height: 2rem;
		width: auto;
		margin-right: 1rem;
	}
</style> -->
