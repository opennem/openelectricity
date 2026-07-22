<script>
	import {
		normaliseStatus,
		asUrl,
		isEstimated,
		STATUS_LABELS
	} from '$lib/facilities/data-centres.js';

	/**
	 * Body of the data centre (load) detail pane — all of the source record's
	 * fields, grouped into sections and rendered as key-value rows in the
	 * facility detail panel's design language. Null fields are skipped;
	 * values flagged as estimates in the source carry a '~' prefix.
	 *
	 * @type {{
	 *   facility?: any | null,
	 *   fillHeight?: boolean
	 * }}
	 */
	let { facility = null, fillHeight = false } = $props();

	let record = $derived(facility?.dataCentre ?? null);

	/** @typedef {{ label: string, value: string, href?: string | null, estimated?: boolean }} Row */

	/**
	 * @param {number | string} value
	 * @param {string} [suffix]
	 * @returns {string}
	 */
	function fmt(value, suffix = '') {
		const text = typeof value === 'number' ? value.toLocaleString('en-AU') : String(value);
		return suffix ? `${text} ${suffix}` : text;
	}

	/**
	 * Build a row when the field has a value; null rows are filtered out.
	 * @param {any} record
	 * @param {string} field
	 * @param {string} label
	 * @param {string} [suffix]
	 * @returns {Row | null}
	 */
	function row(record, field, label, suffix = '') {
		const value = record[field];
		if (value === null || value === undefined || value === '') return null;
		return { label, value: fmt(value, suffix), estimated: isEstimated(record, field) };
	}

	/**
	 * Behind-the-meter power is messy in the source: sometimes a yes/likely
	 * flag, sometimes free text, sometimes a citation URL.
	 * @param {any} record
	 * @returns {Row | null}
	 */
	function btmRow(record) {
		const value = record.btm_power;
		if (!value) return null;
		const href = asUrl(value);
		if (href) {
			return {
				label: 'Behind-the-meter power',
				value: 'Yes (source)',
				href,
				estimated: isEstimated(record, 'btm_power')
			};
		}
		return { label: 'Behind-the-meter power', value: String(value) };
	}

	/**
	 * @param {string} field
	 * @returns {string}
	 */
	function humanise(field) {
		return field.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
	}

	/** @type {{ title: string, rows: Row[] }[]} */
	let sections = $derived.by(() => {
		if (!record) return [];
		const statusBucket = normaliseStatus(record.status);
		/** @type {{ title: string, rows: (Row | null)[] }[]} */
		const raw = [
			{
				title: 'Load',
				rows: [
					row(record, 'operational_it_load_mw', 'Operational IT load', 'MW'),
					row(record, 'max_it_load_mw', 'Max IT load', 'MW'),
					row(record, 'max_total_load_mw', 'Max total load', 'MW'),
					btmRow(record)
				]
			},
			{
				title: 'Efficiency & cooling',
				rows: [
					row(record, 'pue_average', 'PUE (average)'),
					row(record, 'pue_peak_load', 'PUE (peak load)'),
					row(record, 'pue_peak', 'PUE (peak)'),
					row(record, 'cooling_method', 'Cooling method')
				]
			},
			{
				title: 'Compute',
				rows: [
					row(record, 'gpu', 'GPU'),
					row(record, 'gpu_number', 'GPU count'),
					row(record, 'rack_capacity', 'Rack capacity'),
					row(record, 'rack_density_kw', 'Rack density', 'kW')
				]
			},
			{
				title: 'Status & dates',
				rows: [
					{
						label: 'Status',
						value:
							record.status && record.status !== STATUS_LABELS[statusBucket]
								? `${STATUS_LABELS[statusBucket]} (${record.status})`
								: STATUS_LABELS[statusBucket]
					},
					row(record, 'construction_date', 'Construction started'),
					row(record, 'commencement_date', 'Commencement')
				]
			},
			{
				title: 'Commercial',
				rows: [
					row(record, 'company', 'Company'),
					row(record, 'offtaker_tenant', 'Offtaker / tenant'),
					record.estimated_cost_m != null
						? {
								label: 'Estimated cost',
								value: `$${fmt(record.estimated_cost_m)}m AUD`,
								estimated: isEstimated(record, 'estimated_cost_m')
							}
						: null
				]
			},
			{
				title: 'Location',
				rows: [
					row(record, 'address', 'Address'),
					row(record, 'city', 'City'),
					row(record, 'state', 'State')
				]
			}
		];
		return raw
			.map((section) => ({
				title: section.title,
				rows: /** @type {Row[]} */ (section.rows.filter(Boolean))
			}))
			.filter((section) => section.rows.length > 0);
	});

	/** @type {[string, string][]} */
	let sourceLinks = $derived(record ? Object.entries(record.sources ?? {}) : []);
	let hasEstimates = $derived(sections.some((s) => s.rows.some((r) => r.estimated)));
</script>

{#if record}
	<div class={fillHeight ? 'h-full min-h-0 overflow-y-auto' : ''}>
		<div class="space-y-8 p-8">
			<div class="grid gap-x-10 gap-y-8 tablet:grid-cols-2">
				{#each sections as section (section.title)}
					<section>
						<h3 class="m-0 mb-2 text-xs font-semibold uppercase tracking-wide text-mid-grey">
							{section.title}
						</h3>
						<dl class="m-0">
							{#each section.rows as { label, value, href, estimated } (label)}
								<div
									class="flex items-baseline justify-between gap-4 border-b border-light-warm-grey py-1.5"
								>
									<dt class="text-xs text-mid-grey">{label}</dt>
									<dd class="m-0 text-right text-sm font-mono tabular-nums">
										{#if href}
											<a
												{href}
												target="_blank"
												rel="noopener noreferrer"
												class="underline decoration-mid-warm-grey underline-offset-2 hover:decoration-black"
												>{estimated ? '~' : ''}{value}</a
											>
										{:else}
											{estimated ? '~' : ''}{value}
										{/if}
									</dd>
								</div>
							{/each}
						</dl>
					</section>
				{/each}

				{#if sourceLinks.length > 0}
					<section>
						<h3 class="m-0 mb-2 text-xs font-semibold uppercase tracking-wide text-mid-grey">
							Sources
						</h3>
						<ul class="m-0 list-none p-0">
							{#each sourceLinks as [field, url] (field)}
								<li
									class="flex items-baseline justify-between gap-4 border-b border-light-warm-grey py-1.5"
								>
									<span class="text-xs text-mid-grey">{humanise(field)}</span>
									<a
										href={url}
										target="_blank"
										rel="noopener noreferrer"
										class="text-sm underline decoration-mid-warm-grey underline-offset-2 hover:decoration-black"
										>Source</a
									>
								</li>
							{/each}
						</ul>
					</section>
				{/if}
			</div>

			{#if record.notes}
				<section>
					<h3 class="m-0 mb-2 text-xs font-semibold uppercase tracking-wide text-mid-grey">
						Notes
					</h3>
					<p class="m-0 text-sm leading-relaxed">{record.notes}</p>
				</section>
			{/if}

			<p class="m-0 text-xs text-mid-grey">
				{#if hasEstimates}
					~ marks values flagged as approximate in the source.
				{/if}
				Sourced from a community-compiled data centre spreadsheet ({record.source_tab}); figures are
				indicative only.
			</p>
		</div>
	</div>
{/if}
