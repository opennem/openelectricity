<script>
	import { untrack } from 'svelte';
	import Meta from '$lib/components/Meta.svelte';
	import PageHeaderSimple from '$lib/components/PageHeaderSimple.svelte';
	import FuelTechSelector from './components/FuelTechSelector.svelte';
	import GenerationChart from './components/GenerationChart.svelte';
	import init from './helpers/init';
	import {
		processGenerationTrendsData,
		processCombinedGenerationTrendsData,
		processCumulativeGenerationTrendsData
	} from './helpers/process';
	import { transformGenerationTrendsProfiles } from '$lib/utils/data-transform';

	let { data } = $props();

	$inspect('data', data);

	// Format date range for display
	let dateRange = $derived.by(() => {
		if (!data?.queryParams?.dateStart || !data?.queryParams?.dateEnd) return '';

		const startDate = new Date(data.queryParams.dateStart);
		const endDate = new Date(data.queryParams.dateEnd);

		const formatOptions = { year: 'numeric', month: 'short' };
		const startFormatted = startDate.toLocaleDateString('en', formatOptions);
		const endFormatted = endDate.toLocaleDateString('en', formatOptions);

		return `${startFormatted} – ${endFormatted}`;
	});

	// Check if data is loaded
	let isLoading = $derived(!data || !data.order || Object.keys(data?.data || {}).length === 0);

	// Initialize chart contexts once with initial server data (intentionally non-reactive)
	let { chartCxts } = untrack(() => init(data));

	// Transform the API data for profiles view (month x-axis, year lines)
	let profilesData = $derived(transformGenerationTrendsProfiles(data));

	// Get fuel tech names and labels
	let fuelTechNames = $derived(data?.order || []);
	let fuelTechLabels = $derived.by(() => {
		const labels = {};
		fuelTechNames.forEach((tech) => {
			labels[tech] = tech.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
		});
		return labels;
	});

	// View toggle state - tracks which view (chart/table) is active for each fuel tech
	let viewStates = $state({});

	// View states for combined and cumulative charts
	let combinedViewState = $state('chart');
	let cumulativeViewState = $state('chart');

	// Fuel tech selection state - using array for FormMultiSelect compatibility
	let selectedFuelTechs = $state([]);

	// Initialize selected fuel techs when fuel tech names are available
	$effect(() => {
		if (fuelTechNames.length > 0) {
			selectedFuelTechs = [...fuelTechNames];
		}
	});

	// Create fuel tech options for FormMultiSelect
	let fuelTechOptions = $derived.by(() => {
		return fuelTechNames.map((fuelTech) => ({
			value: fuelTech,
			label: fuelTechLabels[fuelTech]
		}));
	});

	// Get processed data for tables
	let combinedTableData = $derived.by(() => {
		if (Object.keys(profilesData).length > 0 && selectedFuelTechs.length > 0) {
			return processCombinedGenerationTrendsData(data, selectedFuelTechs);
		}
		return null;
	});

	let cumulativeTableData = $derived.by(() => {
		if (Object.keys(profilesData).length > 0 && selectedFuelTechs.length > 0) {
			return processCumulativeGenerationTrendsData(data, selectedFuelTechs);
		}
		return null;
	});

	// Helper function to get view state with default
	function getViewState(fuelTech) {
		return viewStates[fuelTech] || 'chart';
	}

	// Helper function to set view state
	function setViewState(fuelTech, view) {
		viewStates[fuelTech] = view;
	}

	// Handle fuel tech selection change (following Records page pattern)
	/**
	 * @param {string} value
	 * @param {boolean} isMetaPressed
	 */
	function handleFuelTechChange(value, isMetaPressed) {
		if (isMetaPressed) {
			selectedFuelTechs = [value];
		} else if (selectedFuelTechs.includes(value)) {
			selectedFuelTechs = selectedFuelTechs.filter((item) => item !== value);
		} else {
			selectedFuelTechs = [...selectedFuelTechs, value];
		}
	}

	// Process and update chart contexts with data
	$effect(() => {
		if (Object.keys(profilesData).length > 0) {
			fuelTechNames.forEach((fuelTech) => {
				const processedData = processGenerationTrendsData(data, fuelTech);
				const cxt = chartCxts[fuelTech];

				if (processedData && cxt) {
					cxt.seriesData = processedData.seriesData;
					cxt.seriesNames = processedData.seriesNames;
					cxt.seriesColours = processedData.seriesColours;
					cxt.seriesLabels = processedData.seriesLabels;

					// Set up monthly x-axis formatting
					cxt.xTicks = 12; // Show all 12 months

					cxt.formatTickX = (/** @type {Date} */ date) => {
						if (date instanceof Date) {
							return date.toLocaleDateString('en', { month: 'short' });
						}
						return '';
					};

					// Set formatX for tooltip display (shows month name)
					cxt.formatX = (/** @type {Date} */ date) => {
						if (date instanceof Date) {
							return date.toLocaleDateString('en', { month: 'long' });
						}
						return '';
					};

					// Set formatXWithTimeZone for tooltip display
					cxt.formatXWithTimeZone = (/** @type {Date} */ date) => {
						if (date instanceof Date) {
							return date.toLocaleDateString('en', { month: 'long' });
						}
						return '';
					};

					// Set x-domain to cover all 12 months - end on December 1st
					cxt.xDomain = [new Date(2000, 0, 1), new Date(2000, 11, 1)];
				} else {
					// Initialize with empty data to prevent errors
					if (cxt) {
						cxt.seriesData = [];
						cxt.seriesNames = [];
						cxt.seriesColours = {};
						cxt.seriesLabels = {};
					}
				}
			});
		} else {
			// Initialize all contexts with empty data to prevent errors
			fuelTechNames.forEach((fuelTech) => {
				const cxt = chartCxts[fuelTech];
				if (cxt) {
					cxt.seriesData = [];
					cxt.seriesNames = [];
					cxt.seriesColours = {};
					cxt.seriesLabels = {};
				}
			});

			// Initialize combined chart with empty data
			const combinedCxt = chartCxts['combined'];
			if (combinedCxt) {
				combinedCxt.seriesData = [];
				combinedCxt.seriesNames = [];
				combinedCxt.seriesColours = {};
				combinedCxt.seriesLabels = {};
			}
			// Initialize cumulative chart with empty data
			const cumulativeCxt = chartCxts['cumulative'];
			if (cumulativeCxt) {
				cumulativeCxt.seriesData = [];
				cumulativeCxt.seriesNames = [];
				cumulativeCxt.seriesColours = {};
				cumulativeCxt.seriesLabels = {};
			}
		}
	});

	// Process combined chart data when selected fuel techs change
	$effect(() => {
		if (Object.keys(profilesData).length > 0 && selectedFuelTechs.length > 0) {
			const combinedProcessedData = processCombinedGenerationTrendsData(data, selectedFuelTechs);
			const combinedCxt = chartCxts['combined'];

			if (combinedProcessedData && combinedCxt) {
				combinedCxt.seriesData = combinedProcessedData.seriesData;
				combinedCxt.seriesNames = combinedProcessedData.seriesNames;
				combinedCxt.seriesColours = combinedProcessedData.seriesColours;
				combinedCxt.seriesLabels = combinedProcessedData.seriesLabels;

				// Set up monthly x-axis formatting (same as individual charts)
				combinedCxt.xTicks = 12;
				combinedCxt.formatTickX = (/** @type {Date} */ date) => {
					if (date instanceof Date) {
						return date.toLocaleDateString('en', { month: 'short' });
					}
					return '';
				};
				combinedCxt.formatX = (/** @type {Date} */ date) => {
					if (date instanceof Date) {
						return date.toLocaleDateString('en', { month: 'long' });
					}
					return '';
				};
				combinedCxt.formatXWithTimeZone = (/** @type {Date} */ date) => {
					if (date instanceof Date) {
						return date.toLocaleDateString('en', { month: 'long' });
					}
					return '';
				};
				combinedCxt.xDomain = [new Date(2000, 0, 1), new Date(2000, 11, 1)];

				// Calculate custom y-domain from dataset minimum with padding
				const allValues = [];
				combinedProcessedData.seriesData.forEach(
					/** @type {any} */ (dataPoint) => {
						combinedProcessedData.seriesNames.forEach(
							/** @type {string} */ (seriesName) => {
								const value = dataPoint[seriesName];
								if (value != null && !isNaN(value)) {
									allValues.push(value);
								}
							}
						);
					}
				);

				if (allValues.length > 0) {
					const minValue = Math.min(...allValues);
					const maxValue = Math.max(...allValues);
					const range = maxValue - minValue;
					const padding = range * 0.1; // 10% padding
					combinedCxt.customYDomain = [
						Math.max(0, minValue - padding), // Don't go below 0
						maxValue + padding
					];
				}
			}
		}
	});

	// Process cumulative chart data when selected fuel techs change
	$effect(() => {
		if (Object.keys(profilesData).length > 0 && selectedFuelTechs.length > 0) {
			const cumulativeProcessedData = processCumulativeGenerationTrendsData(
				data,
				selectedFuelTechs
			);
			const cumulativeCxt = chartCxts['cumulative'];

			if (cumulativeProcessedData && cumulativeCxt) {
				cumulativeCxt.seriesData = cumulativeProcessedData.seriesData;
				cumulativeCxt.seriesNames = cumulativeProcessedData.seriesNames;
				cumulativeCxt.seriesColours = cumulativeProcessedData.seriesColours;
				cumulativeCxt.seriesLabels = cumulativeProcessedData.seriesLabels;

				// Set up monthly x-axis formatting (same as other charts)
				cumulativeCxt.xTicks = 12;
				cumulativeCxt.formatTickX = (/** @type {Date} */ date) => {
					if (date instanceof Date) {
						return date.toLocaleDateString('en', { month: 'short' });
					}
					return '';
				};
				cumulativeCxt.formatX = (/** @type {Date} */ date) => {
					if (date instanceof Date) {
						return date.toLocaleDateString('en', { month: 'long' });
					}
					return '';
				};
				cumulativeCxt.formatXWithTimeZone = (/** @type {Date} */ date) => {
					if (date instanceof Date) {
						return date.toLocaleDateString('en', { month: 'long' });
					}
					return '';
				};
				cumulativeCxt.xDomain = [new Date(2000, 0, 1), new Date(2000, 11, 1)];
			}
		}
	});

	/**
	 * Update hover state across all chart contexts
	 * @param {string | undefined} hoverKey
	 * @param {any | undefined} hoverData
	 */
	function updateChartHover(hoverKey, hoverData) {
		// loop through all charts and update the hover time and key
		Object.values(chartCxts).forEach((cxt) => {
			cxt.hoverTime = hoverData ? hoverData.time : undefined;
			cxt.hoverKey = hoverKey;
		});
	}

	/**
	 * Update focus state across all chart contexts
	 * @param {number} time
	 */
	function updateChartFocus(time) {
		Object.values(chartCxts).forEach((cxt) => {
			const isSame = cxt.focusTime === time;
			cxt.focusTime = isSame ? undefined : time;
		});
	}

	/**
	 * Handle mouse interactions for charts
	 * @param {{ data: any, key?: string } | any} evt
	 */
	function onmousemove(evt) {
		if (!evt) return;
		let key = /** @type {string | undefined} */ (evt.key);
		let data = key
			? /** @type {any | undefined} */ (evt.data)
			: /** @type {any | undefined} */ (evt);
		updateChartHover(key, data);
	}

	function onmouseout() {
		updateChartHover(undefined, undefined);
	}

	/**
	 * Handle click/tap interactions
	 * @param {any} evt
	 */
	function onpointerup(evt) {
		updateChartFocus(evt.time);
	}
</script>

<Meta
	title="The Studio — Generation Trends & Profiles"
	description="Explore generation trends and profiles of energy sources across different time periods and regions."
	image="/img/preview.jpg"
/>

<PageHeaderSimple>
	<div slot="main-heading">
		<h1 class="tracking-widest text-center">Generation Trends & Profiles</h1>
	</div>
	<div slot="sub-heading">
		{#if dateRange}
			<p class="text-lg text-gray-600 text-center mt-2">{dateRange}</p>
		{/if}
	</div>
</PageHeaderSimple>

<!-- Fuel Technology Selector -->
{#if Object.keys(profilesData).length > 0}
	<FuelTechSelector
		{fuelTechOptions}
		{selectedFuelTechs}
		{fuelTechLabels}
		onFuelTechChange={handleFuelTechChange}
	/>
{/if}

<div class="container mx-auto px-4 py-8">
	{#if Object.keys(profilesData).length > 0}
		<!-- Combined and Cumulative Charts Side by Side -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
			<!-- Combined Chart -->
			<GenerationChart
				chartContext={chartCxts['combined']}
				tableData={combinedTableData}
				{selectedFuelTechs}
				viewState={combinedViewState}
				onViewStateChange={(value) => (combinedViewState = value)}
				{onmousemove}
				{onmouseout}
				{onpointerup}
				emptyStateMessage="Select at least one fuel technology to view the combined profile"
			/>

			<!-- Cumulative Chart -->
			<GenerationChart
				chartContext={chartCxts['cumulative']}
				tableData={cumulativeTableData}
				{selectedFuelTechs}
				viewState={cumulativeViewState}
				onViewStateChange={(value) => (cumulativeViewState = value)}
				{onmousemove}
				{onmouseout}
				{onpointerup}
				emptyStateMessage="Select at least one fuel technology to view the cumulative profile"
				tooltipSuffix=" (cumulative)"
			/>
		</div>

		<!-- Individual Fuel Technology Charts -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 mt-8 border-t border-warm-grey pt-8">
			{#each fuelTechNames as fuelTech (fuelTech)}
				{@const fuelData = profilesData[fuelTech]}
				<GenerationChart
					chartContext={chartCxts[fuelTech]}
					{fuelData}
					fuelTechName={fuelTech}
					viewState={getViewState(fuelTech)}
					onViewStateChange={(value) => setViewState(fuelTech, value)}
					{onmousemove}
					{onmouseout}
					{onpointerup}
					emptyStateMessage="No data available for {fuelTechLabels[fuelTech]}"
				/>
			{/each}
		</div>

		<!-- Summary section -->
		<div class="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
			<div class="bg-gray-50 p-4 rounded-lg">
				<h3 class="font-semibold mb-2">Individual Charts</h3>
				<p class="text-2xl font-bold text-blue-600">{fuelTechNames.length}</p>
				<p class="text-sm text-gray-600">Fuel technology profiles</p>
			</div>
			<div class="bg-gray-50 p-4 rounded-lg">
				<h3 class="font-semibold mb-2">Combined Chart</h3>
				<p class="text-2xl font-bold text-orange-600">{selectedFuelTechs.length}</p>
				<p class="text-sm text-gray-600">Monthly totals</p>
			</div>
			<div class="bg-gray-50 p-4 rounded-lg">
				<h3 class="font-semibold mb-2">Cumulative Chart</h3>
				<p class="text-2xl font-bold text-teal-600">{selectedFuelTechs.length}</p>
				<p class="text-sm text-gray-600">Running totals</p>
			</div>
			<div class="bg-gray-50 p-4 rounded-lg">
				<h3 class="font-semibold mb-2">Time Period</h3>
				<p class="text-2xl font-bold text-green-600">Monthly</p>
				<p class="text-sm text-gray-600">Jan to Dec profiles</p>
			</div>
			<div class="bg-gray-50 p-4 rounded-lg">
				<h3 class="font-semibold mb-2">Data Type</h3>
				<p class="text-2xl font-bold text-purple-600">Multi-Year</p>
				<p class="text-sm text-gray-600">Yearly comparisons</p>
			</div>
		</div>
	{:else}
		<div class="text-center py-12">
			<div class="bg-gray-50 rounded-lg p-8 max-w-md mx-auto">
				<h3 class="text-lg font-semibold mb-2">No Data Available</h3>
				<p class="text-gray-600">
					Generation trends data is not available for the current selection. Try adjusting your
					filters or date range.
				</p>
			</div>
		</div>
	{/if}
</div>
