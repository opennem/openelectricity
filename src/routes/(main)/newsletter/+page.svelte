<script>
	import Meta from '$lib/components/Meta.svelte';
	import SignUpForm from '$lib/components/SignUpForm.svelte';
</script>

<Meta
	title="Newsletter"
	description="Sign up for Open Electricity updates"
	image="/img/newsletter/Newsletter_Preview.png"
/>

<header class="flex flex-col items-center justify-center max-w-5xl mt-36 mb-24 mx-auto text-center">
	<h1 class="text-3xl leading-3xl px-6 md:px-0">Sign up for Open Electricity updates</h1>
	<p class="px-6 md:px-0">
		Get monthly and quarterly analysis, plus updates on new features and platform developments -
		direct to your inbox.
	</p>

	<SignUpForm class="mt-12 w-full md:w-[640px] mx-auto px-6 md:px-0" />

	<a
		href="https://us13.campaign-archive.com/home/?u=1ba96f433b791b4dc263f909c&id=24d88b07aa"
		class="mt-12 underline text-black"
	>
		View past issues
	</a>
</header>

<main class="container max-w-none md:container mb-36">
	<h5 class="text-sm font-space font-medium uppercase tracking-wider">What you'll receive</h5>

	<div class="grid grid-cols-1 md:grid-cols-3 gap-12 mt-8">
		<div class="flex flex-col gap-6">
			<div class="mb-2">
				<img src="/img/newsletter/Newsletter_Dispatch.png" alt="The Dispatch" />
			</div>
			<h3 class="mb-0">The Dispatch</h3>
			<p class="text-mid-grey">
				Each month, energy analyst Lynton Hoey rounds up the most interesting shifts in the grid –
				new records, infrastructure updates, and other signals of change in Australia's electricity
				system.
			</p>
		</div>

		<div class="flex flex-col gap-6">
			<div class="mb-2">
				<img src="/img/newsletter/Newsletter_Reality-Check.png" alt="Reality Check" />
			</div>
			<h3 class="mb-0">Reality Check</h3>
			<p class="text-mid-grey">
				A quarterly series by energy analyst Allan O'Neil, offering a clear-eyed look at how
				Australia's electricity system is really tracking – using fresh data, grounded analysis and
				Open Electricity's system-wide tools.
			</p>
		</div>

		<div class="flex flex-col gap-6">
			<div class="mb-2">
				<img src="/img/newsletter/Newsletter_Updates.png" alt="Platform Updates" />
			</div>
			<h3 class="mb-0">Platform Updates</h3>
			<p class="text-mid-grey">
				Stay across what's new on Open Electricity - from feature rollouts and improvements to news
				and special announcements. Delivered as needed, whenever there's something worth knowing.
			</p>
		</div>
	</div>
</main>
