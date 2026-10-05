<script>
	import FilterSelect from '$lib/components/filters/FilterSelect.svelte';
	import { DatePicker } from '$lib/components/ui/date-picker';
	import Switch from '$lib/components/SwitchWithIcons.svelte';
	import ChartArea from '@lucide/svelte/icons/chart-area';
	import ChartSpline from '@lucide/svelte/icons/chart-spline';
	import Waves from '@lucide/svelte/icons/waves';
	import CircleDashed from '@lucide/svelte/icons/circle-dashed';
	import Target from '@lucide/svelte/icons/target';
	import Toggle from '$lib/components/form-elements/Toggle.svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { slide } from 'svelte/transition';
	import { color as d3Colour } from 'd3-color';
	import { formatDateRange } from '$lib/components/charts/v2/date-labels.js';
	import { getGroup, loadGroupsFor } from '$lib/components/charts/network/groups.js';
	import ChartCard from './ChartCard.svelte';
	import FuelTechOptions from './FuelTechOptions.svelte';
	import FuelTechPanel from './FuelTechPanel.svelte';
	import ProfileChart from './ProfileChart.svelte';
	import RadialClock from './RadialClock.svelte';
	import Ridgeline from './Ridgeline.svelte';
	import RadialHeatmap from './RadialHeatmap.svelte';
	import ChartLightbox from './ChartLightbox.svelte';
	import { averageDaylight, daylightNote } from './daylight.js';
	import TrackerSplitLayout, { FUEL_TECH_SPLIT } from './TrackerSplitLayout.svelte';
	import {
		dailyProfileRows,
		profileClock,
		PROFILE_DAY_START,
		stackedProfileRows
	} from './profile-chart.js';
	import { createProfileData, createProfileDemand } from './profile-data.svelte.js';
	import { DEMAND_GROSS_SERIES_ID } from '$lib/components/charts/network/market-series-ids.js';
	import { createLoadingNotice } from './tracker-loading.svelte.js';
	import { DEFAULT_TABLE_COLUMNS, PERCENTILE_TABLE_COLUMNS } from './table-columns.js';
	import { hasSpotPrice, regionLabel as regionLabelFor } from './tracker-regions.js';
	import { trackerFileName } from './tracker-export.js';
	import { toggleSeriesVisibility } from './tracker-visibility.js';
	import { OE_RED } from './tracker-overlays.js';
	import {
		averageDayTableRows,
		buildAverageDayStack,
		buildDailyProfile,
		hourlyProfile,
		normaliseProfileStyle,
		profilePercentiles,
		profileRange,
		dailyAverages,
		formatProfileDay,
		PROFILE_STYLE_OPTIONS,
		normaliseProfileDays,
		normaliseProfileDisplay,
		normaliseProfileInterval,
		profileChartPart,
		profileDataset,
		profileFocusColumns,
		profileWindow,
		todayWindow,
		PROFILE_DAY_OPTIONS,
		PROFILE_DISPLAY_OPTIONS,
		PROFILE_INTERVAL_OPTIONS,
		PROFILE_MIN_DATE
	} from './time-of-day.js';

	/** @type {{session: ReturnType<typeof import('./tracker-session.svelte.js').createTrackerSession>}} */
	let { session } = $props();
	let selection = $derived(session.selection);
	let region = $derived(selection.region);
	let groupId = $derived(selection.group);
	let days = $derived(selection.profileDays);
	let lastDate = $derived(selection.profileEnd);
	let hidden = $derived(selection.hiddenSeries);
	let zone = $derived(session.timeZone);
	// Primitive deriveds: every change replaces the selection object, and the
	// window must keep its identity unless its own inputs change.
	let interval = $derived(selection.profileInterval);
	let window = $derived(profileWindow(session.anchorEnd, zone, days, lastDate, interval));
	/** The window's average sunrise and sunset, on the radial dials' bezels. */
	let daylight = $derived(averageDaylight(region, window.dates, window.offset));
	let group = $derived(getGroup(groupId));
	/** Stacked: every technology's average day in one stack. Breakdown: a chart
	 * per visible technology, two columns wide, then spot price. */
	let breakdown = $derived(selection.profileDisplay === 'breakdown');
	const reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)');
	/** The breakdown's style switcher: each style as an icon, named by its
	 * label for assistive technology and the hover tooltip. Bands fill around a
	 * line, the multi-line overlays curves, the ridgeline offsets them, radial
	 * bars ring the dial and the heatmap's rings are days. */
	const STYLE_ICONS = {
		bands: ChartArea,
		lines: ChartSpline,
		ridgeline: Waves,
		radial: CircleDashed,
		heatmap: Target
	};
	const STYLE_BUTTONS = PROFILE_STYLE_OPTIONS.map(({ value, label }) => ({
		value,
		icon: STYLE_ICONS[value],
		size: 'size-[16px]',
		ariaLabel: label,
		tooltip: label
	}));
	/** Stacked: the stacked area, or every technology stacked on a radial clock. */
	const powerData = createProfileData(() => ({ region, zone, group, window }));
	// Regional spot price: the breakdown's last chart, where the region has one.
	let showPrice = $derived(breakdown && hasSpotPrice(region));
	const priceData = createProfileData(() => ({
		region,
		metric: 'price',
		zone,
		group,
		window,
		enabled: showPrice
	}));
	let regionLabel = $derived(regionLabelFor(region));

	// Average day: every technology in the grouping, stacked. Both displays'
	// card is titled for the window: the latest complete days unless a last day
	// is picked.
	let windowTitle = $derived(
		lastDate ? `Average over ${days} full days` : `Average over last ${days} full days`
	);
	let stackMeta = $derived(powerData.meta);
	let layers = $derived(buildAverageDayStack(powerData.rows, stackMeta?.seriesNames ?? [], window));
	let stackAvailable = $derived(
		layers.some((layer) => layer.points.some((point) => point.y1 !== null))
	);
	/** The average day failed, or loaded with no complete stack: both stacked
	 * cards say so instead of drawing. */
	let stackUnavailable = $derived(powerData.error || (!powerData.pending && !stackAvailable));
	let stackRows = $derived(stackedProfileRows(layers));

	// Breakdown: every technology in the table's (top-down stack) order, less
	// those the table's row toggles hide — the same `hidden` as the stack.
	let tableOrder = $derived([...(stackMeta?.seriesNames ?? [])].reverse());
	let shownSeries = $derived(tableOrder.filter((name) => !hidden.includes(name)));
	// Optional "today" line on the breakdown charts: the current, incomplete day so
	// far, fetched only while shown and never part of the average, stack,
	// table or CSV.
	/** The heatmap has no today ring: its toggle is disabled and today isn't
	 * fetched, while the URL keeps the choice for the other styles. */
	let todayApplies = $derived(selection.profileStyle !== 'heatmap');
	let showToday = $derived(breakdown && todayApplies && selection.profileToday);
	let today = $derived(todayWindow(window));
	let todaySoFar = $derived({
		start: today.start,
		end: Math.max(today.start, Math.min(today.end, session.anchorEnd))
	});
	const powerToday = createProfileData(() => ({
		region,
		zone,
		group,
		window: todaySoFar,
		enabled: showToday
	}));
	const priceToday = createProfileData(() => ({
		region,
		metric: 'price',
		zone,
		group,
		window: todaySoFar,
		enabled: showToday && showPrice
	}));
	const PRICE_COLOUR = '#6A6A6A';
	/** Every technology's profile, hidden ones too: the breakdown's charts and
	 * the stacked radial bars draw the shown ones, and the table's percentile
	 * range covers them all. */
	let techProfiles = $derived(
		new Map(
			(stackMeta?.seriesNames ?? []).map((name) => [
				name,
				buildDailyProfile(powerData.rows, name, window)
			])
		)
	);
	/** The stacked radial bars' layers, beside the stacked area: each visible
	 * technology's hourly averages, in stack order (loads stack inward, as on
	 * the area chart). */
	let stackLayers = $derived(
		!breakdown && stackMeta
			? stackMeta.seriesNames
					.filter((name) => !hidden.includes(name))
					.map((name) => ({
						key: name,
						label: stackMeta.seriesLabels[name] ?? name,
						colour: stackMeta.seriesColours[name] ?? '#6A6A6A',
						hours: hourlyProfile(techProfiles.get(name) ?? [])
					}))
			: []
	);
	let priceMeta = $derived(priceData.meta);
	let priceName = $derived(priceMeta?.seriesNames[0]);
	/** Each shown technology's profile, then spot price's, and today's when that
	 * line is on. */
	let picked = $derived([
		...(stackMeta
			? shownSeries.map((key) => ({
					key,
					label: stackMeta.seriesLabels[key] ?? key,
					unit: 'MW',
					colour: stackMeta.seriesColours[key] ?? '#6A6A6A',
					price: false,
					profile: techProfiles.get(key) ?? buildDailyProfile(powerData.rows, key, window),
					today: showToday ? buildDailyProfile(powerToday.rows, key, today) : null
				}))
			: []),
		...(showPrice && priceMeta && priceName
			? [
					{
						key: 'price',
						label: 'Spot price',
						unit: '$/MWh',
						// Neutral rather than the price chart's red, so the red today line reads.
						colour: PRICE_COLOUR,
						price: true,
						profile: buildDailyProfile(priceData.rows, priceName, window),
						today: showToday ? buildDailyProfile(priceToday.rows, priceName, today) : null
					}
				]
			: [])
	]);
	const AVERAGE_LINE = '#222222';
	/** A series colour at reduced opacity, for areas and bands under lines.
	 * @param {string} colour @param {number} opacity */
	function fade(colour, opacity) {
		const fill = d3Colour(colour);
		if (!fill) return colour;
		fill.opacity = opacity;
		return fill.toString();
	}
	let style = $derived(selection.profileStyle);
	/** The `dial` snippet's key for the stacked radial bars (breakdown cards use theirs). */
	const STACK_DIAL = 'stack';
	const STACK_DIAL_TITLE = 'Average by hour';
	/** The enlarged radial chart's key, or null while the lightbox is closed. */
	let enlarged = $state(/** @type {string | null} */ (null));
	/** While a dial shows the night, a table footnote says where it comes from. */
	let tableNotes = $derived(
		daylight && (!breakdown || style === 'radial' || style === 'heatmap')
			? [daylightNote(daylight, window.offset)]
			: []
	);
	const TODAY_OVERLAY = { id: 'today', colour: OE_RED, strokeWidth: 2.5, label: 'Today' };
	/** The linear charts' strip values, as on the dials: today's (when shown and
	 * reported for the slot) in OE red, then the slot's average.
	 * @param {Record<string, any>} row @param {string} colour */
	const todayAndAverage = (row, colour) => [
		...(row.today != null ? [{ label: 'Today', value: row.today, colour, today: true }] : []),
		{ label: 'Av.', value: row.average ?? null, colour }
	];
	/** Multi-line: the lightened average area with every day, the dark average
	 * and, optionally, today in thicker OE red over it. Each day's line and the
	 * average take the hover, naming the table column it focuses. The strip
	 * reads today and the slot's average, then a hovered day.
	 * @param {(typeof picked)[number]} series */
	function linesChart({ colour, profile, today: todayProfile }) {
		return {
			rows: dailyProfileRows(profile, window.dates).map((row, i) =>
				todayProfile ? { ...row, today: todayProfile[i].average } : row
			),
			names: ['average'],
			colours: {
				average: fade(colour, 0.35),
				...Object.fromEntries(window.dates.map((date) => [date, colour]))
			},
			labels: {
				average: 'Average',
				...Object.fromEntries(window.dates.map((date) => [date, formatProfileDay(date)]))
			},
			overlays: [
				...window.dates.map((id) => ({ id, colour, strokeWidth: 1, hoverable: true })),
				{
					id: 'average',
					colour: AVERAGE_LINE,
					strokeWidth: 1.5,
					label: 'Average',
					hoverable: true
				},
				...(todayProfile ? [TODAY_OVERLAY] : [])
			],
			readout: (/** @type {Record<string, any>} */ row) => [
				...todayAndAverage(row, colour),
				...(chartPart && window.dates.includes(chartPart)
					? [{ label: formatProfileDay(chartPart), value: row[chartPart] ?? null, colour }]
					: [])
			]
		};
	}
	/** Percentile bands: the days' 10–90% and 25–75% spread as stacked bands
	 * (an invisible 10th-percentile base, then each band's thickness), the
	 * median as a dark line and, optionally, today in OE red. The strip reads
	 * today and the slot's average.
	 * @param {(typeof picked)[number]} series */
	function bandsChart({ colour, profile, today: todayProfile }) {
		const outer = fade(colour, 0.3);
		const middle = fade(colour, 0.6);
		const levels = profilePercentiles(profile);
		const rows = dailyProfileRows(profile, []).map(({ time, date }, i) => {
			const { p10, p25, p50, p75, p90 } = levels[i];
			const spread = p10 === null || p25 === null || p50 === null || p75 === null || p90 === null;
			return {
				time,
				date,
				p10,
				p25,
				p50,
				p75,
				p90,
				base: spread ? null : p10,
				low: spread ? null : /** @type {number} */ (p25) - /** @type {number} */ (p10),
				midLow: spread ? null : /** @type {number} */ (p50) - /** @type {number} */ (p25),
				midHigh: spread ? null : /** @type {number} */ (p75) - /** @type {number} */ (p50),
				high: spread ? null : /** @type {number} */ (p90) - /** @type {number} */ (p75),
				average: profile[i].average,
				today: todayProfile?.[i].average ?? null
			};
		});
		return {
			rows,
			names: ['base', 'low', 'midLow', 'midHigh', 'high'],
			colours: { base: 'transparent', low: outer, midLow: middle, midHigh: middle, high: outer },
			labels: { base: '10%', low: '10–25%', midLow: '25–50%', midHigh: '50–75%', high: '75–90%' },
			overlays: [
				{ id: 'p50', colour: AVERAGE_LINE, strokeWidth: 2, label: 'Median', hoverable: true },
				...(todayProfile ? [TODAY_OVERLAY] : [])
			],
			// The strip reads today and the slot's average, not the stacked band
			// thicknesses; the table holds the percentile range.
			readout: (/** @type {Record<string, any>} */ row) => todayAndAverage(row, colour)
		};
	}
	/** A load (charging, pumping): its power is negative. @param {string} key */
	const isLoad = (key) => loadGroupsFor(group).includes(key);
	/** The shape views (radial clock, ridgeline) read loads
	 * as positive, so they grow outward or upward like every other series.
	 * @param {string} key @param {number | null} value */
	function shown(key, value) {
		// `|| 0` keeps a zero from turning into -0.
		return value === null || !isLoad(key) ? value : -value || 0;
	}
	/** Hourly averages for the radial clock.
	 * @param {string} key @param {ReturnType<typeof buildDailyProfile>} profile */
	function radialHours(key, profile) {
		return hourlyProfile(profile).map((hour) => ({ ...hour, average: shown(key, hour.average) }));
	}
	/** One curve per day (and today) for the ridgeline.
	 * @param {(typeof picked)[number]} series */
	function ridgelineData({ key, colour, profile, today: todayProfile }) {
		return {
			days: window.dates.map((date, day) => ({
				date,
				values: profile.map((slot) => shown(key, slot.values[day]))
			})),
			today: todayProfile ? todayProfile.map((slot) => shown(key, slot.average)) : null,
			average: profile.map((slot) => shown(key, slot.average)),
			colour
		};
	}
	/** One ring per day for the radial heatmap (it has no today ring).
	 * @param {(typeof picked)[number]} series */
	function heatmapData(series) {
		const { days, colour } = ridgelineData(series);
		return { days, colour };
	}
	/** @type {import('./types.js').ProfileCard[]} */
	let cards = $derived(
		picked.map((series) => ({
			key: series.key,
			label: series.label,
			unit: series.unit,
			price: series.price,
			...(style === 'radial'
				? {
						radial: {
							hours: radialHours(series.key, series.profile),
							today: series.today ? radialHours(series.key, series.today) : null,
							colour: series.colour
						}
					}
				: style === 'ridgeline'
					? { ridgeline: ridgelineData(series) }
					: style === 'heatmap'
						? { heatmap: heatmapData(series) }
						: { chart: style === 'bands' ? bandsChart(series) : linesChart(series) })
		}))
	);
	/** The radial charts the lightbox steps through: the breakdown's cards, in
	 * order (the stacked radial bars sit beside the area chart, unenlarged). */
	let lightboxItems = $derived(
		breakdown
			? cards
					.filter((card) => card.radial || card.heatmap)
					.map((card) => ({ key: card.key, label: card.label }))
			: []
	);
	let gridPending = $derived(powerData.pending || (showPrice && priceData.pending));
	let gridError = $derived(powerData.error ?? (showPrice ? priceData.error : null));
	let gridAvailable = $derived(
		picked.some(({ profile }) => profile.some((row) => row.average !== null))
	);

	const stackLoading = createLoadingNotice(() => powerData.pending);
	const gridLoading = createLoadingNotice(() => gridPending);
	let panZoomEngaged = $state(false);
	let stackChart = $state.raw(/** @type {ProfileChart | undefined} */ (undefined));
	let stackInspectTime = $derived(stackChart?.getInspectTime());
	/** The slot (charts) or hour (radial clocks) hovered on any breakdown
	 * card; every card mirrors it, as Timeline's cards share one hover. */
	let breakdownHover = $state(/** @type {number | undefined} */ (undefined));
	/** The slot pinned on any breakdown chart (a click, or Enter), shared by
	 * every card as the hover is; the linear breakdown charts have no pan or
	 * zoom, so a click pins straight away. Snapped to the current slot length,
	 * so a 5-minute pin lands on its half-hour after an interval change. */
	let pinnedSlot = $state(/** @type {number | undefined} */ (undefined));
	let breakdownPin = $derived(
		pinnedSlot === undefined
			? undefined
			: pinnedSlot - ((pinnedSlot - PROFILE_DAY_START) % window.slotMs)
	);
	/** A breakdown radial card's hovered hour; every radial card mirrors it. */
	let radialHour = $state(/** @type {number | null} */ (null));
	/** Stacked: the hover shared by the stacked area and the radial bars — a
	 * slot from the area or a whole hour from the dial, each mirrored on the
	 * other, and inspected by the table and readout at its own span. */
	let stackHover = $state.raw(
		/** @type {{ start: number, end: number } | undefined} */ (undefined)
	);
	const HOUR_MS = 3_600_000;
	/** @param {number | null} hour */
	function hoverStackHour(hour) {
		stackHover =
			hour === null
				? undefined
				: {
						start: PROFILE_DAY_START + hour * HOUR_MS,
						end: PROFILE_DAY_START + (hour + 1) * HOUR_MS
					};
	}
	/** @param {number | undefined} time */
	function hoverStackSlot(time) {
		stackHover = time === undefined ? undefined : { start: time, end: time + window.slotMs };
	}
	let stackHour = $derived(
		stackHover === undefined ? null : Math.floor((stackHover.start - PROFILE_DAY_START) / HOUR_MS)
	);
	/** The card under the pointer. Breakdown: the table highlights its
	 * technology's row. Stacked: the table outlines the column the card plots
	 * (Energy for the radial bars, Av power for the area), and `stackSeries`
	 * (the series under the pointer on either chart) picks the row, as on
	 * Timeline, and stands out on both charts. */
	let hoveredCard = $state(/** @type {string | null} */ (null));
	let stackSeries = $state(/** @type {string | null} */ (null));
	/** @param {string} key @param {boolean} hovered */
	function hoverCard(key, hovered) {
		if (hovered) hoveredCard = key;
		else if (hoveredCard === key) hoveredCard = null;
	}
	/** The part of a breakdown chart under the pointer, as the table reads it
	 * (`profileChartPart`): a day (ridgeline ridge, heatmap ring or multi-line
	 * day), the multi-line average, or a percentile band or median. Every card
	 * emphasises it, and the table focuses its columns. */
	let chartPart = $state(/** @type {string | null} */ (null));
	/** Breakdown: one chart per series, by series key. */
	let seriesCharts = $state.raw(/** @type {Record<string, ProfileChart | null>} */ ({}));
	let seriesInspectTime = $derived(
		Object.values(seriesCharts)
			.map((chart) => chart?.getInspectTime())
			.find((time) => time !== undefined)
	);
	// Only one display is mounted, so at most one chart reports; the ridgeline
	// reports through the shared breakdown hover.
	let inspectTime = $derived(stackInspectTime ?? seriesInspectTime ?? breakdownHover);
	/** What the table and range readout inspect: a radial clock's hovered hour,
	 * else the inspected chart slot. */
	let inspectRange = $derived(
		!breakdown && stackHover
			? stackHover
			: breakdown && style === 'radial' && radialHour !== null
				? {
						start: PROFILE_DAY_START + radialHour * HOUR_MS,
						end: PROFILE_DAY_START + (radialHour + 1) * HOUR_MS
					}
				: inspectTime === undefined
					? undefined
					: { start: inspectTime, end: inspectTime + window.slotMs }
	);

	// Fuel-tech table: the average day's technologies, or the inspected slot.
	/** Units picked from the table headers; session-only, as in Timeline. */
	let tableUnits = $state.raw(/** @type {import('./table-units.js').TableUnits} */ ({}));
	// Contribution follows Timeline's URL-owned basis; gross demand loads only
	// while the table shows its share.
	let contributionMode = $derived(selection.contributionMode);
	let byDemand = $derived(contributionMode === 'demand');
	const demandData = createProfileDemand(() => ({
		region,
		zone,
		window,
		enabled: byDemand && selection.tablePanelOpen
	}));
	let demandProfile = $derived(
		byDemand ? buildDailyProfile(demandData.rows, DEMAND_GROSS_SERIES_ID, window) : null
	);
	let tablePending = $derived(powerData.pending || (byDemand && demandData.pending));
	let tableError = $derived(powerData.error ?? (byDemand ? demandData.error : null));
	/** Some breakdown styles swap the table's window columns for their own
	 * average-power columns: percentile bands show each technology's range,
	 * the day-by-day styles its average and each day. */
	let tablePowerColumns = $derived(
		!breakdown
			? undefined
			: style === 'bands'
				? PERCENTILE_TABLE_COLUMNS
				: style === 'lines' || style === 'ridgeline' || style === 'heatmap'
					? [
							{ key: 'average', label: 'Average' },
							...window.dates.map((date) => ({ key: date, label: formatProfileDay(date) }))
						]
					: undefined
	);
	let averageRows = $derived(
		stackMeta && !powerData.error
			? averageDayTableRows({
					layers,
					meta: stackMeta,
					loadSeriesIds: loadGroupsFor(group),
					hidden,
					mode: contributionMode,
					demand: demandProfile,
					slotMs: window.slotMs,
					range: inspectRange
				})
			: null
	);
	/** Each technology's values for the view's own columns: across the inspected
	 * slot's days, else across each day's average power. Loads read as
	 * magnitudes, like the rest of the table.
	 * @param {ReturnType<typeof buildDailyProfile>} profile @param {boolean} load
	 * @param {number | undefined} minute */
	function powerValues(profile, load, minute) {
		/** @param {number | null} value */
		const shownValue = (value) => (value === null || !load ? value : -value || 0);
		if (style === 'bands') {
			const range = profileRange(profile, minute);
			// Negating reverses the order, so a load's 10% is minus the raw 90%.
			return load
				? {
						p10: shownValue(range.p90),
						p25: shownValue(range.p75),
						p50: shownValue(range.p50),
						p75: shownValue(range.p25),
						p90: shownValue(range.p10)
					}
				: range;
		}
		const slot = minute === undefined ? null : profile.find((row) => row.minute === minute);
		const days = slot ? slot.values : dailyAverages(profile);
		const available = /** @type {number[]} */ (days.filter((value) => value !== null));
		return {
			average: shownValue(
				slot
					? slot.average
					: available.length
						? available.reduce((sum, value) => sum + value, 0) / available.length
						: null
			),
			...Object.fromEntries(window.dates.map((date, day) => [date, shownValue(days[day])]))
		};
	}
	let tableRows = $derived.by(() => {
		if (!averageRows || !tablePowerColumns) return averageRows;
		const minute =
			inspectTime === undefined ? undefined : (inspectTime - PROFILE_DAY_START) / 60_000;
		return averageRows.map((row) => {
			const profile = techProfiles.get(row.id);
			return profile ? { ...row, powerValues: powerValues(profile, row.isLoad, minute) } : row;
		});
	});
	/** @param {import('./types.js').ContributionMode} value */
	const selectContribution = (value) => session.select('contributionMode', value);
	function retryTable() {
		powerData.retry();
		if (byDemand) demandData.retry();
	}
	/** Same rules as Timeline's table: ⌘/Ctrl solos, hiding the last visible row restores all.
	 * @param {string} name @param {boolean} [exclusive] */
	function toggleSeries(name, exclusive = false) {
		const next = toggleSeriesVisibility(
			{
				hiddenSeries: hidden,
				overlays: selection.overlays,
				rowIds: stackMeta?.seriesNames ?? []
			},
			name,
			exclusive
		);
		session.selectVisibility(next.hiddenSeries, next.overlays);
	}

	export function getControls() {
		return controls;
	}
	/** The navigation and both cards share this visual loading lifecycle. */
	export function isLoading() {
		return breakdown ? gridLoading.active : stackLoading.active;
	}
	/** The selected complete days, for the top-nav range readout. */
	export function getRangeLabel() {
		return formatDateRange(new Date(window.start), new Date(window.end - 1), session.ianaTimeZone, {
			alwaysYear: true
		});
	}
	/** The hovered or pinned slot, replacing the range readout while it lasts. */
	export function getInspectLabel() {
		return inspectRange && `${profileClock(inspectRange.start)}–${profileClock(inspectRange.end)}`;
	}
	/** Whether the shown display can export: the stack's technologies, or the
	 * breakdown's picked series. */
	export function canExport() {
		return breakdown
			? !gridPending && !gridError && gridAvailable
			: !powerData.pending && !powerData.error && stackAvailable;
	}
	/** The shown display as a CSV dataset: every technology's average day, or the
	 * picked series (every day too in multi-line). Null until it can export. */
	export function exportDataset() {
		if (!canExport()) return null;
		const series = breakdown
			? picked.map(({ label, unit, profile }) => ({ label, unit, profile }))
			: (stackMeta?.seriesNames ?? []).map((name) => ({
					label: stackMeta?.seriesLabels[name] ?? name,
					unit: 'MW',
					profile: buildDailyProfile(powerData.rows, name, window)
				}));
		return profileDataset({
			series,
			dates: window.dates,
			daily: breakdown,
			region: regionLabel,
			timeZone: zone
		});
	}
	export function exportFileName() {
		return trackerFileName({
			scope: region,
			dataset: 'time-of-day',
			range: window.lastDate,
			extension: 'csv'
		});
	}
</script>

{#snippet controls()}
	<Switch
		buttons={PROFILE_DISPLAY_OPTIONS}
		selected={selection.profileDisplay}
		compact
		rounded="rounded-lg"
		darkSelected
		aria-label="Profile display"
		onchange={(option) => session.select('profileDisplay', normaliseProfileDisplay(option.value))}
	/>
	<!-- The window and its last day read as one phrase: "7 days to 30/09/2026". -->
	<div class="flex shrink-0 items-center gap-2">
		<FilterSelect
			selected={String(days)}
			options={PROFILE_DAY_OPTIONS}
			listLabel="Window"
			defaultValue="7"
			compact
			onchange={(value) => session.select('profileDays', normaliseProfileDays(value))}
		/>
		<span class="text-xs text-mid-grey">to</span>
		<!-- The app's date picker: its border darkens once a past last day is
		     picked, and its calendar offers the way back to the latest days. -->
		<DatePicker
			date={window.lastDate}
			minDate={PROFILE_MIN_DATE}
			maxDate={window.maxDate}
			label="Last day"
			active={!!selection.profileEnd}
			onchange={(date) => session.select('profileEnd', date)}
		>
			{#snippet footer({ close })}
				<button
					type="button"
					disabled={!selection.profileEnd}
					class="w-full rounded-lg border border-warm-grey px-3 py-2 text-xs font-medium text-dark-grey transition-colors hover:border-dark-grey disabled:cursor-default disabled:opacity-50 disabled:hover:border-warm-grey"
					onclick={() => {
						close();
						session.select('profileEnd', '');
					}}>Latest complete days</button
				>
			{/snippet}
		</DatePicker>
	</div>
	<FilterSelect
		selected={interval}
		options={PROFILE_INTERVAL_OPTIONS}
		listLabel="Interval"
		defaultValue="30m"
		compact
		onchange={(value) => session.select('profileInterval', normaliseProfileInterval(value))}
	/>
{/snippet}

<!-- Grouping and contribution basis live with the table, as in Timeline: its
     header options and the collapsed rail. Profile has no column choices. -->
{#snippet fuelTechOptions()}
	<FuelTechOptions
		group={groupId}
		ongroupchange={(value) => session.select('group', value)}
		{contributionMode}
		oncontributionchange={selectContribution}
	/>
{/snippet}

{#snippet unavailable(
	/** @type {string | null} */ error,
	/** @type {string} */ retryLabel,
	/** @type {() => void} */ retry,
	/** @type {string} */ empty
)}
	{#if error}
		<div role="alert" class="flex flex-col items-center gap-3 px-4 py-16 text-center text-sm">
			<p class="m-0">{error}</p>
			<button
				type="button"
				class="rounded border border-mid-warm-grey px-3 py-2 text-xs hover:bg-warm-grey"
				onclick={retry}>{retryLabel}</button
			>
		</div>
	{:else}
		<p role="status" class="m-0 px-4 py-16 text-center text-sm text-mid-grey">{empty}</p>
	{/if}
{/snippet}

<!-- One radial chart by key (the stacked dial, or a breakdown card's), shared
     by the cards and the lightbox (`large`: bigger labels and readout) so
     both draw the same chart on the same hover state. -->
{#snippet dial(/** @type {string} */ key, large = false)}
	{#if key === STACK_DIAL}
		<!-- Read as energy: an hour's average MW is its MWh, the same figure the
		     table's Energy column gives for that hour. -->
		<RadialClock
			{daylight}
			{large}
			layers={stackLayers}
			unit="MWh"
			label={windowTitle}
			bind:active={() => stackHour, hoverStackHour}
			bind:activeLayer={stackSeries}
		/>
	{:else}
		{@const card = cards.find((candidate) => candidate.key === key)}
		{#if card?.radial}
			<RadialClock
				{daylight}
				{large}
				layers={[
					{
						key: card.key,
						label: card.label,
						colour: card.radial.colour,
						hours: card.radial.hours
					}
				]}
				today={card.radial.today}
				unit={card.unit}
				label={card.label}
				bind:active={radialHour}
			/>
		{:else if card?.heatmap}
			<RadialHeatmap
				{daylight}
				{large}
				days={card.heatmap.days}
				colour={card.heatmap.colour}
				slotMs={window.slotMs}
				unit={card.unit}
				label={card.label}
				syncHoverTime={breakdownHover}
				activeDay={chartPart}
				onhoverchange={(time) => (breakdownHover = time)}
				onhoverday={(date) => (chartPart = date)}
			/>
		{/if}
	{/if}
{/snippet}

<!-- Breakdown's own options sit in a bar under the top nav, as Timeline's
     metrics strip does, sliding open or shut with the display. -->
{#if breakdown}
	<div class="shrink-0" transition:slide={{ duration: reducedMotion.current ? 0 : 200 }}>
		<section
			aria-label="Breakdown options"
			class="axis-ticks-bg flex items-center gap-4 overflow-x-auto border-b border-warm-grey bg-white px-8 py-2"
		>
			<div class="shrink-0 whitespace-nowrap">
				<Toggle
					compact
					label="Show today"
					checked={showToday}
					disabled={!todayApplies}
					onclick={() => session.select('profileToday', !selection.profileToday)}
				/>
			</div>
			<div
				class="h-8 shrink-0 border-l border-warm-grey"
				role="separator"
				aria-orientation="vertical"
			></div>
			<Switch
				buttons={STYLE_BUTTONS}
				selected={style}
				compact
				rounded="rounded-lg"
				darkSelected
				aria-label="Style"
				onchange={(option) => session.select('profileStyle', normaliseProfileStyle(option.value))}
			/>
		</section>
	</div>
{/if}
<section aria-label="Profile analysis" aria-busy={gridPending} class="flex min-h-0 flex-1 flex-col">
	<TrackerSplitLayout
		config={FUEL_TECH_SPLIT}
		open={selection.tablePanelOpen}
		onopenchange={(open) => session.select('tablePanelOpen', open)}
		controls="tracker-table-panel"
		resizeLabel="Resize table panel"
		railLabel="Show fuel tech table"
		bind:engaged={panZoomEngaged}
		pngContext={`${regionLabel} · ${window.dates[0]} to ${window.lastDate} · UTC${zone} · ${group.label}`}
	>
		{#if !breakdown}
			<!-- The stacked radial bars and the stacked area side by side: the same
			     average day by hour and by slot. -->
			<div class="grid items-start gap-4 md:grid-cols-2">
				<ChartCard
					title={STACK_DIAL_TITLE}
					highlighted={hoveredCard === 'stack-radial'}
					onhover={(hovered) => hoverCard('stack-radial', hovered)}
					mini
					loading={stackLoading.active}
					png={{
						id: 'profile-stack-radial',
						label: STACK_DIAL_TITLE,
						ready: stackAvailable && !powerData.pending,
						caption: windowTitle
					}}
				>
					{#if stackUnavailable}
						{@render unavailable(
							powerData.error,
							'Retry average day',
							powerData.retry,
							'No complete average-day stack available for this window.'
						)}
					{:else}
						<div class="[--dial-max:560px]">
							{@render dial(STACK_DIAL)}
						</div>
					{/if}
				</ChartCard>
				<ChartCard
					title={windowTitle}
					highlighted={hoveredCard === 'stack'}
					onhover={(hovered) => hoverCard('stack', hovered)}
					loading={stackLoading.active}
					png={{
						id: 'profile-stack',
						label: windowTitle,
						ready: stackAvailable && !powerData.pending,
						caption: stackChart?.getCaption()
					}}
					engaged={panZoomEngaged}
					heightStorageKey="tracker-profile-height-stack"
					defaultHeightPx={320}
				>
					{#snippet children(heightPx)}
						{#if stackUnavailable}
							{@render unavailable(
								powerData.error,
								'Retry average day',
								powerData.retry,
								'No complete average-day stack available for this window.'
							)}
						{:else}
							<ProfileChart
								bind:this={stackChart}
								bind:engaged={panZoomEngaged}
								rows={stackRows}
								names={stackMeta?.seriesNames ?? []}
								labels={stackMeta?.seriesLabels ?? {}}
								colours={stackMeta?.seriesColours ?? {}}
								hiddenSeriesNames={hidden}
								title="Power"
								label={windowTitle}
								{heightPx}
								slotMs={window.slotMs}
								syncHoverTime={stackHover?.start}
								onhoverchange={hoverStackSlot}
								activeKey={stackSeries}
								onhoverkeychange={(key) => (stackSeries = key ?? null)}
							/>
						{/if}
					{/snippet}
				</ChartCard>
			</div>
		{:else if !gridError && (gridPending || gridAvailable)}
			<!-- Each technology, then spot price, on the stacked view's chart in its
			     own card, two columns wide. As on Timeline, the card names the
			     subject and the chart the metric (spot price: Market / Spot price). Each card's drag handle spaces the rows. -->
			<!-- Radial bars and heatmaps are near-square cards flowing in as many columns as
			     fit; the other styles keep two columns. -->
			<div
				class="grid gap-x-4 {style === 'radial' || style === 'heatmap'
					? 'grid-cols-[repeat(auto-fill,minmax(240px,1fr))]'
					: 'grid-cols-1 md:grid-cols-2'}"
			>
				<!-- Keyed with the radial flag: a card's height storage is fixed at mount,
				     and radial cards size themselves instead. -->
				{#each cards as card (`${card.key}:${card.radial || card.heatmap ? 'square' : 'chart'}`)}
					<!-- Hovering a card, whatever its style, highlights its technology's
					     table row and outlines the card (spot price has no row, so no outline). -->
					<ChartCard
						title={card.price ? 'Market' : card.label}
						mini={Boolean(card.radial || card.heatmap)}
						loading={gridLoading.active}
						png={{
							id: `profile-${card.key}`,
							label: card.label,
							ready: !gridPending,
							caption: card.radial
								? 'Average by hour'
								: card.ridgeline
									? 'One curve per day'
									: card.heatmap
										? 'Each ring is a day'
										: seriesCharts[card.key]?.getCaption()
						}}
						engaged={panZoomEngaged}
						highlighted={!card.price && hoveredCard === card.key}
						onhover={(hovered) => hoverCard(card.key, hovered)}
						heightStorageKey={card.radial || card.heatmap ? '' : 'tracker-profile-height-series'}
						onexpand={card.radial || card.heatmap ? () => (enlarged = card.key) : undefined}
					>
						{#snippet children(heightPx)}
							{#if card.radial || card.heatmap}
								{@render dial(card.key)}
							{:else if card.ridgeline}
								<Ridgeline
									days={card.ridgeline.days}
									today={card.ridgeline.today}
									average={card.ridgeline.average}
									colour={card.ridgeline.colour}
									slotMs={window.slotMs}
									unit={card.unit}
									label={card.label}
									step={card.price}
									{heightPx}
									syncHoverTime={breakdownHover}
									onhoverchange={(time) => (breakdownHover = time)}
									onhoverday={(date) => (chartPart = date)}
									activeDay={chartPart}
								/>
							{:else if card.chart}
								<ProfileChart
									bind:this={
										() => seriesCharts[card.key] ?? null,
										(chart) => (seriesCharts = { ...seriesCharts, [card.key]: chart })
									}
									panZoom={false}
									focusTime={breakdownPin}
									onfocuschange={(time) => (pinnedSlot = time)}
									rows={card.chart.rows}
									names={card.chart.names}
									labels={card.chart.labels}
									colours={card.chart.colours}
									overlays={card.chart.overlays}
									readout={card.chart.readout}
									price={card.price}
									syncHoverTime={breakdownHover}
									onhoverchange={(time) => (breakdownHover = time)}
									activeKey={profileChartPart(style, chartPart, isLoad(card.key))}
									onhoverkeychange={(key) =>
										(chartPart = profileChartPart(style, key, isLoad(card.key)))}
									title={card.price ? 'Spot price' : 'Power'}
									label={card.label}
									{heightPx}
									slotMs={window.slotMs}
								/>
							{/if}
						{/snippet}
					</ChartCard>
				{/each}
			</div>
		{:else}
			<ChartCard title={windowTitle}>
				{@render unavailable(
					gridError,
					'Retry profile',
					() => {
						powerData.retry();
						if (showPrice) priceData.retry();
					},
					'No profile data available for this selection.'
				)}
			</ChartCard>
		{/if}

		{#snippet panel(/** @type {import('./types.js').TrackerDock} */ dock)}
			<FuelTechPanel
				bind:closeButton={dock.closer}
				onclose={dock.close}
				options={fuelTechOptions}
				loading={stackLoading.active}
				rows={tableRows}
				valuesPending={tablePending}
				error={tableError}
				onretry={retryTable}
				basis="power"
				tableColumns={DEFAULT_TABLE_COLUMNS}
				powerColumns={tablePowerColumns}
				notes={tableNotes}
				focusColumns={breakdown
					? profileFocusColumns(style, chartPart)
					: hoveredCard === 'stack-radial'
						? ['energy']
						: hoveredCard
							? ['power']
							: []}
				focusRow={(breakdown ? hoveredCard : stackSeries) ?? undefined}
				{contributionMode}
				oncontributionchange={selectContribution}
				{tableUnits}
				onunitchange={(key, prefix) => (tableUnits = { ...tableUnits, [key]: prefix })}
				group={groupId}
				ongroupchange={(value) => session.select('group', value)}
				hiddenCount={hidden.length}
				onshowall={() => session.selectVisibility([])}
				ontoggle={toggleSeries}
			/>
		{/snippet}
		{#snippet rail()}{@render fuelTechOptions()}{/snippet}
	</TrackerSplitLayout>
	<ChartLightbox items={lightboxItems} bind:active={enlarged}>
		{#snippet children(key)}{@render dial(key, true)}{/snippet}
	</ChartLightbox>
</section>
