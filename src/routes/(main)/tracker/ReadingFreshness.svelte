<script>
	import { latestReading, readingStatus } from './tracker-live.js';
	/** @type {{snapshot: import('./types.js').GenerationSnapshot | null, now: number,
	 * interval: string, following: boolean, pending: boolean, error: string | null,
	 * timeZone: string, filtered: boolean}} */
	let { snapshot, now, interval, following, pending, error, timeZone, filtered } = $props();
	let latest = $derived(latestReading(snapshot));
	let status = $derived(
		readingStatus({ latest, now, interval, following, pending, error, filtered, timeZone })
	);
	let timestamp = $derived(
		latest === null
			? ''
			: new Intl.DateTimeFormat('en-AU', {
					timeZone,
					day: 'numeric',
					month: 'short',
					year: 'numeric',
					hour: 'numeric',
					minute: '2-digit',
					timeZoneName: 'short'
				}).format(latest)
	);
</script>

<p
	data-testid="reading-freshness"
	data-status={status}
	class="m-0 mt-1 text-xxs font-normal text-mid-grey"
	title={error ??
		`${timestamp ? `Latest available native interval in this view: ${timestamp}. ` : ''}This is a data timestamp, not the time of the last request. It does not guarantee every technology has reported.`}
>
	{status}{#if timestamp && !pending && !error}
		· <time datetime={new Date(latest).toISOString()}>{timestamp}</time>{/if}
</p>
