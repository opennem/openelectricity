<script>
	/**
	 * CMS Facility Explorer — IDE / Inspector Panel
	 *
	 * Two-panel layout: master list on left, detail inspector on right.
	 * Keyboard navigable, technical/dense presentation of all CMS data.
	 */

	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import { MapLibre, GeoJSONSource, CircleLayer, FillLayer, LineLayer, NavigationControl } from 'svelte-maplibre-gl';
	import { Search, MapPin, Image, LogOut } from '@lucide/svelte';
	import { slide } from 'svelte/transition';
	import { getContext, onDestroy, onMount, tick, untrack } from 'svelte';
	import { PanelHeader, DragHandle, createDragHandler } from '$lib/components/ui/panel';
	import FacilityDetail from './_components/FacilityDetail.svelte';
	import LoginGate from '$lib/components/auth/LoginGate.svelte';
	import { getClerkState } from '$lib/auth/clerk.svelte.js';
	import { fetchOsmPolygon, isOsmCached } from './_utils/osm.js';

	const clerkState = getClerkState();

	// Go fullscreen to remove nav/footer — lets us own the full viewport
	/** @type {{ setFullscreen: (value: boolean) => void } | undefined} */
	const layoutContext = getContext('layout-fullscreen');
	layoutContext?.setFullscreen(true);
	onDestroy(() => layoutContext?.setFullscreen(false));

	/** @type {{ data: { facilities: any[], sanity: any } }} */
	let { data } = $props();

	// Local mutable copy of facilities so edits from FacilityDetail persist
	let facilities = $state(/** @type {any[]} */ ([]));
	$effect(() => {
		facilities = data.facilities;
	});

	let switchingDataset = $state(false);
	let detailBusy = $state(false);
	let datasetDropdownOpen = $state(false);
	let isProduction = $derived(data.sanity.dataset === 'production');
	let isStaging = $derived(data.sanity.dataset === 'staging');
	let searchQuery = $state('');
	let showMap = $state(
		typeof localStorage !== 'undefined'
			? localStorage.getItem('cms-explorer-show-map') === 'true'
			: false
	);

	$effect(() => {
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('cms-explorer-show-map', String(showMap));
		}
	});

	// URL-driven selection via optional route params
	const BASE_PATH = '/studio/cms-facilities';
	let facilityCode = $derived(page.params.facility_code ?? null);
	let unitCode = $derived(page.params.unit_code ?? null);

	/** @type {HTMLElement | null} */
	let listContainer = $state(null);

	/** @type {any | null} */
	let mapInstance = $state(null);

	/** @type {GeoJSON.Feature | null} */
	let osmPolygon = $state(null);
	/** @type {'idle' | 'loading' | 'ok' | 'not-found' | 'error'} */
	let osmStatus = $state('idle');

	// Delay rendering until client-side to prevent SSR/hydration flash
	// when localStorage widths differ from defaults
	let mounted = $state(false);
	onMount(() => {
		mounted = true;

		/** @param {PointerEvent} e */
		function closeDropdown(e) {
			if (datasetDropdownOpen) datasetDropdownOpen = false;
		}
		document.addEventListener('pointerdown', closeDropdown);
		return () => document.removeEventListener('pointerdown', closeDropdown);
	});

	// Resizable facility list width
	const listDrag = createDragHandler({
		axis: 'x',
		min: 200,
		max: 600,
		initial: 250,
		storageKey: 'cms-explorer-list-width'
	});

	// Resizable map height
	const mapDrag = createDragHandler({
		axis: 'y',
		min: 150,
		max: 600,
		initial: 300,
		storageKey: 'cms-explorer-map-height'
	});

	// Debounced search
	/** @type {ReturnType<typeof setTimeout> | null} */
	let debounceTimer = $state(null);
	let debouncedQuery = $state('');

	/** @param {string} value */
	function handleSearch(value) {
		searchQuery = value;
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			debouncedQuery = value;
		}, 150);
	}

	// Filter facilities
	let filteredFacilities = $derived.by(() => {
		const q = debouncedQuery.toLowerCase().trim();
		if (!q) return facilities;
		return facilities.filter((f) => {
			if (f.name?.toLowerCase().includes(q)) return true;
			if (f.code?.toLowerCase().includes(q)) return true;
			if (f.network?.name?.toLowerCase().includes(q)) return true;
			if (f.region?.name?.toLowerCase().includes(q)) return true;
			if (f.units?.some((/** @type {any} */ u) => u.code?.toLowerCase().includes(q))) return true;
			if (
				f.units?.some((/** @type {any} */ u) =>
					u.fuel_technology?.name?.toLowerCase().includes(q)
				)
			)
				return true;
			return false;
		});
	});

	// Selected facility (from URL param)
	let selected = $derived(
		facilityCode ? facilities.find((/** @type {any} */ f) => f.code === facilityCode) ?? null : null
	);

	// Stats
	let stats = $derived.by(() => {
		const allUnits = facilities.flatMap((/** @type {any} */ f) => f.units || []);
		const operatingCap = allUnits
			.filter((/** @type {any} */ u) => u.status === 'operating')
			.reduce(
				(/** @type {number} */ s, /** @type {any} */ u) => s + (u.capacity_registered || 0),
				0
			);
		const committedCap = allUnits
			.filter((/** @type {any} */ u) => u.status === 'committed')
			.reduce(
				(/** @type {number} */ s, /** @type {any} */ u) => s + (u.capacity_registered || 0),
				0
			);
		const retiredCap = allUnits
			.filter((/** @type {any} */ u) => u.status === 'retired')
			.reduce(
				(/** @type {number} */ s, /** @type {any} */ u) => s + (u.capacity_registered || 0),
				0
			);
		return {
			totalFacilities: facilities.length,
			totalUnits: allUnits.length,
			operatingCap,
			committedCap,
			retiredCap,
			withPhotos: facilities.filter((/** @type {any} */ f) => f.photos?.length > 0).length,
			withLocation: facilities.filter(
				(/** @type {any} */ f) => f.location?.lat && f.location?.lng
			).length,
			missingLocation: facilities.filter(
				(/** @type {any} */ f) => !f.location?.lat || !f.location?.lng
			).length,
			withDescription: facilities.filter(
				(/** @type {any} */ f) => f.description?.length > 0
			).length
		};
	});

	// GeoJSON for map
	let geojson = $derived.by(
		() =>
			/** @type {GeoJSON.FeatureCollection} */ ({
				type: 'FeatureCollection',
				features: facilities
					.filter((/** @type {any} */ f) => f.location?.lat && f.location?.lng)
					.map((/** @type {any} */ f) => {
						const primaryFt = f.units?.[0]?.fuel_technology?.code;
						const colour = primaryFt
							? fuelTechColourMap[
									/** @type {keyof typeof fuelTechColourMap} */ (primaryFt)
								] || '#888'
							: '#888';
						return {
							type: 'Feature',
							geometry: {
								type: 'Point',
								coordinates: [f.location.lng, f.location.lat]
							},
							properties: { id: f._id, name: f.name, code: f.code, colour }
						};
					})
			})
	);

	/** @param {string} code */
	function selectFacility(code) {
		if (facilityCode === code) {
			deselectFacility();
			return;
		}
		goto(`${BASE_PATH}/${code}`, { noScroll: true, keepFocus: true });
	}

	function deselectFacility() {
		goto(BASE_PATH, { noScroll: true, keepFocus: true });
	}

	/** @param {string | null} code */
	function selectUnit(code) {
		if (!facilityCode) return;
		if (code) {
			goto(`${BASE_PATH}/${facilityCode}/${code}`, { noScroll: true, keepFocus: true });
		} else {
			goto(`${BASE_PATH}/${facilityCode}`, { noScroll: true, keepFocus: true });
		}
	}

	/**
	 * @param {number | null | undefined} val
	 * @returns {string}
	 */
	function fmtCap(val) {
		if (val == null) return '—';
		return val.toLocaleString('en-AU', { maximumFractionDigits: 1 });
	}

	/**
	 * Get fuel tech colour for a code
	 * @param {string | undefined} code
	 * @returns {string}
	 */
	function ftColour(code) {
		if (!code) return '#ccc';
		return (
			fuelTechColourMap[/** @type {keyof typeof fuelTechColourMap} */ (code)] || '#888'
		);
	}

	/** @param {any} e */
	function handleMapClick(e) {
		const feature = e.features?.[0];
		if (!feature) return;
		const code = feature.properties?.code;
		if (code) selectFacility(code);
	}

	/** Keyboard navigation for facility list */
	function handleListKeydown(/** @type {KeyboardEvent} */ e) {
		if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
		e.preventDefault();
		const list = filteredFacilities;
		if (!list.length) return;
		const idx = facilityCode ? list.findIndex((/** @type {any} */ f) => f.code === facilityCode) : -1;
		let next;
		if (e.key === 'ArrowDown') {
			next = idx < list.length - 1 ? idx + 1 : 0;
		} else {
			next = idx > 0 ? idx - 1 : list.length - 1;
		}
		selectFacility(list[next].code);
		tick().then(() => {
			const el = listContainer?.querySelector(`[data-fid="${list[next].code}"]`);
			el?.scrollIntoView({ block: 'nearest' });
		});
	}

	// CircleLayer filter — show only selected facility when one is active
	let circleFilter = $derived(
		facilityCode ? /** @type {any} */ (['==', ['get', 'code'], facilityCode]) : undefined
	);

	// Switch to satellite when zoomed into a facility
	let mapStyle = $derived(
		facilityCode ? '/map-styles/satellite.json' : '/map-styles/positron.json'
	);

	// GeoJSON for OSM polygon layer
	/** @type {GeoJSON.FeatureCollection} */
	const emptyFeatureCollection = { type: 'FeatureCollection', features: [] };
	let osmGeoJson = $derived(
		osmPolygon
			? /** @type {GeoJSON.FeatureCollection} */ ({
					type: 'FeatureCollection',
					features: [osmPolygon]
				})
			: emptyFeatureCollection
	);

	/**
	 * Compute a bounding box from a GeoJSON polygon feature.
	 * @param {GeoJSON.Feature} feature
	 * @returns {[[number, number], [number, number]]}
	 */
	function featureBounds(feature) {
		const geom = feature.geometry;
		const coords =
			geom.type === 'MultiPolygon'
				? /** @type {number[][]} */ (/** @type {any} */ (geom).coordinates.flat(2))
				: /** @type {number[][]} */ (/** @type {any} */ (geom).coordinates.flat(1));

		let minLng = Infinity;
		let maxLng = -Infinity;
		let minLat = Infinity;
		let maxLat = -Infinity;
		for (const [lng, lat] of coords) {
			if (lng < minLng) minLng = lng;
			if (lng > maxLng) maxLng = lng;
			if (lat < minLat) minLat = lat;
			if (lat > maxLat) maxLat = lat;
		}

		return [
			[minLng, minLat],
			[maxLng, maxLat]
		];
	}

	/**
	 * Zoom the map to a facility — prefers cached OSM polygon bounds, falls back to point.
	 * @param {any} facility
	 */
	function zoomToFacility(facility) {
		if (!facility?.location?.lat || !facility?.location?.lng || !mapInstance) return;

		if (facility.osm_way_id && isOsmCached(facility.osm_way_id)) {
			fetchOsmPolygon(facility.osm_way_id).then((feature) => {
				if (facilityCode !== facility.code) return;
				if (feature) {
					osmPolygon = feature;
					osmStatus = 'ok';
					const bounds = featureBounds(feature);
					mapInstance?.fitBounds(bounds, { padding: 40, maxZoom: 16, duration: 600 });
				} else {
					mapInstance?.flyTo({
						center: [facility.location.lng, facility.location.lat],
						zoom: 14,
						duration: 600
					});
				}
			});
		} else {
			mapInstance.flyTo({
				center: [facility.location.lng, facility.location.lat],
				zoom: 14,
				duration: 600
			});
		}
	}

	// Fly to selected facility on selection change
	$effect(() => {
		const facility = selected;

		if (!facility) {
			osmPolygon = null;
			osmStatus = 'idle';
			if (mapInstance) {
				mapInstance.flyTo({ center: [134, -25], zoom: 3.5, duration: 600 });
			}
			return;
		}

		// Reset OSM state and check cache for the new facility
		osmPolygon = null;
		osmStatus = facility.osm_way_id && isOsmCached(facility.osm_way_id) ? 'ok' : 'idle';

		// Zoom to facility (only if map is already open)
		if (untrack(() => showMap)) {
			tick().then(() => zoomToFacility(facility));
		}
	});

	/** Zoom to selected facility when the map first loads */
	function handleMapLoad() {
		zoomToFacility(selected);
	}

	/** Fetch OSM polygon on demand (called from FacilityDetail button) */
	function handleOsmFetch() {
		const facility = selected;
		if (!facility?.osm_way_id || osmStatus === 'loading') return;

		// If already cached, just show the polygon and zoom
		if (osmStatus === 'ok' && osmPolygon) {
			showMap = true;
			tick().then(() => {
				if (mapInstance) {
					const bounds = featureBounds(osmPolygon);
					mapInstance.fitBounds(bounds, { padding: 40, maxZoom: 16, duration: 600 });
				}
			});
			return;
		}

		osmStatus = 'loading';
		fetchOsmPolygon(facility.osm_way_id)
			.then((feature) => {
				if (facilityCode !== facility.code) return;
				osmPolygon = feature;
				if (feature) {
					osmStatus = 'ok';
					showMap = true;
					tick().then(() => {
						if (mapInstance) {
							const bounds = featureBounds(feature);
							mapInstance.fitBounds(bounds, { padding: 40, maxZoom: 16, duration: 600 });
						}
					});
				} else {
					osmStatus = 'not-found';
				}
			})
			.catch(() => {
				if (facilityCode !== facility.code) return;
				osmStatus = 'error';
			});
	}
	/** @param {any} updated */
	function handleFacilityUpdate(updated) {
		const idx = facilities.findIndex((/** @type {any} */ f) => f._id === updated._id);
		if (idx >= 0) facilities[idx] = updated;
	}
</script>

<LoginGate redirectUrl="/studio/cms-facilities">
{#if mounted}
<div class="flex flex-col h-dvh overflow-hidden font-mono">
	<!-- Header bar -->
	<div
		class="flex items-center gap-3 px-4 py-2 border-b transition-colors {isProduction ? 'border-red/20 bg-red/5' : isStaging ? '' : 'border-warm-grey bg-light-warm-grey/50'}"
		style={isStaging ? 'border-color: rgb(202 138 4 / 0.2); background: rgb(254 243 199 / 0.4)' : ''}
	>
		<span class="text-[11px] font-medium text-dark-grey tracking-wide uppercase"
			>CMS Facilities</span
		>
		<!-- Dataset switcher -->
		{#if data.sanity.availableDatasets.length > 1}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="relative" onpointerdown={(e) => e.stopPropagation()}>
				<button
					class="text-[10px] px-1.5 py-0.5 border rounded transition-colors flex items-center gap-1 {isProduction ? 'text-red border-red/30 bg-red/5 hover:border-red/50' : isStaging ? '' : 'text-mid-grey border-warm-grey hover:border-dark-grey'}"
				style={isStaging ? 'color: rgb(161 98 7); border-color: rgb(202 138 4 / 0.3); background: rgb(254 243 199 / 0.5)' : ''}
					disabled={switchingDataset || detailBusy}
					onclick={() => (datasetDropdownOpen = !datasetDropdownOpen)}
				>
					{data.sanity.dataset}
					{#if switchingDataset}
						<span class="animate-pulse">…</span>
					{:else}
						<svg class="w-2.5 h-2.5 transition-transform {datasetDropdownOpen ? 'rotate-180' : ''}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6l4 4 4-4" /></svg>
					{/if}
				</button>
				{#if datasetDropdownOpen}
					<div class="absolute left-0 top-full z-20 mt-1 min-w-[120px] rounded border border-warm-grey bg-white shadow-sm overflow-hidden">
						{#each data.sanity.availableDatasets as ds}
							<button
								class="w-full text-left px-2 py-1.5 text-[10px] transition-colors {ds === data.sanity.dataset ? 'bg-warm-grey/40 font-medium text-dark-grey' : 'text-mid-grey hover:bg-warm-grey/30 hover:text-dark-grey'}"
								onclick={async () => {
									datasetDropdownOpen = false;
									if (ds === data.sanity.dataset) return;
									switchingDataset = true;
									document.cookie = `cms-dataset=${ds};path=/;max-age=${60 * 60 * 24 * 365}`;
									await invalidateAll();
									switchingDataset = false;
								}}
							>
								{ds}
							</button>
						{/each}
					</div>
				{/if}
			</div>
		{:else}
			<span class="text-[10px] text-mid-grey">{data.sanity.dataset}</span>
		{/if}
		<span class="ml-auto"></span>
		{#if clerkState.user}
			<span class="text-[10px] text-mid-grey">{clerkState.user.primaryEmailAddress?.emailAddress}</span>
			<button
				onclick={() => clerkState.instance?.signOut({ redirectUrl: window.location.href })}
				class="text-[10px] px-1.5 py-0.5 border border-warm-grey rounded text-mid-grey hover:text-dark-grey hover:border-dark-grey transition-colors inline-flex items-center gap-1"
			>
				<LogOut size={10} />
				SIGN OUT
			</button>
		{/if}
	</div>

	<!-- Map -->
	{#if showMap}
		<div transition:slide={{ duration: 200 }}>
			<div style="height: {mapDrag.value}px;">
				<MapLibre
					style={mapStyle}
					center={{ lng: 134, lat: -25 }}
					zoom={3.5}
					class="w-full h-full"
					bind:map={mapInstance}
					onload={handleMapLoad}
				>
					<NavigationControl position="top-right" />
					<GeoJSONSource data={geojson}>
						<CircleLayer
							paint={{
								'circle-radius': facilityCode ? 6 : 4,
								'circle-color': ['get', 'colour'],
								'circle-stroke-width': facilityCode ? 2 : 1,
								'circle-stroke-color': '#fff'
							}}
							filter={circleFilter}
							onclick={handleMapClick}
						/>
					</GeoJSONSource>

					<!-- OSM polygon -->
					<GeoJSONSource id="osm-polygon" data={osmGeoJson}>
						<FillLayer
							paint={{
								'fill-color': '#3b82f6',
								'fill-opacity': 0.3
							}}
						/>
						<LineLayer
							paint={{
								'line-color': '#2563eb',
								'line-width': 2
							}}
						/>
					</GeoJSONSource>
				</MapLibre>
			</div>

			<DragHandle axis="y" onstart={mapDrag.start} active={mapDrag.isDragging} class="border-b border-warm-grey" />
		</div>
	{/if}

	<!-- Main split pane -->
	<div class="flex flex-1 min-h-0">
		<!-- LEFT: Facility list -->
		<div class="shrink-0 border-r border-warm-grey flex flex-col min-h-0" style="width: {listDrag.value}px;">
			<PanelHeader>
				<span class="text-[12px] font-medium text-dark-grey flex-1 truncate">Facilities</span>
				<span class="text-[10px] text-mid-grey tabular-nums">{filteredFacilities.length}/{facilities.length}</span>
				<button
					onclick={() => (showMap = !showMap)}
					class="text-[10px] px-1.5 py-0.5 border rounded transition-colors ml-1 {showMap
						? 'border-dark-grey bg-dark-grey text-white'
						: 'border-warm-grey text-mid-grey hover:text-dark-grey hover:border-dark-grey'}"
				>
					MAP
				</button>
			</PanelHeader>

			<!-- Search -->
			<div class="px-3 py-2 border-b border-warm-grey">
				<div class="relative">
					<Search
						class="absolute left-2 top-1/2 -translate-y-1/2 text-mid-grey"
						size={12}
					/>
					<input
						type="search"
						value={searchQuery}
						oninput={(e) => handleSearch(e.currentTarget.value)}
						placeholder="Filter..."
						class="w-full pl-7 pr-3 py-1.5 text-[11px] font-mono border border-warm-grey rounded bg-white hover:border-dark-grey focus:border-dark-grey focus:outline-none"
					/>
				</div>
			</div>

			<!-- List -->
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="flex-1 overflow-y-auto"
				bind:this={listContainer}
				onkeydown={handleListKeydown}
				tabindex="0"
			>
				{#each filteredFacilities as facility (facility._id)}
					{@const cap = facility.units?.reduce(
						(/** @type {number} */ s, /** @type {any} */ u) =>
							s + (u.capacity_registered || 0),
						0
					)}
					<button
						data-fid={facility.code}
						onclick={() => selectFacility(facility.code)}
						class="w-full text-left px-3 py-2 grid grid-cols-[8px_1fr_12px_12px_50px] items-center gap-2 border-b border-warm-grey/60 transition-colors cursor-pointer hover:bg-warm-grey/50
						{facilityCode === facility.code ? 'bg-warm-grey' : ''}"
					>
						<span
							class="w-2 h-2 rounded-full"
							style="background: {ftColour(facility.units?.[0]?.fuel_technology?.code)}"
						></span>
						<span class="text-[11px] text-dark-grey truncate"
							>{facility.name || 'Unnamed'}</span
						>
						<span class="flex justify-center">
							{#if facility.photos?.length > 0}
								<Image size={10} class="text-mid-grey/70" />
							{/if}
						</span>
						<span class="flex justify-center">
							{#if facility.location?.lat && facility.location?.lng}
								<MapPin size={10} class="text-mid-grey/70" />
							{/if}
						</span>
						<span class="text-[10px] text-mid-grey tabular-nums text-right">{fmtCap(cap)}</span>
					</button>
				{/each}

				{#if filteredFacilities.length === 0}
					<div class="px-3 py-8 text-center text-[11px] text-mid-grey">No results</div>
				{/if}
			</div>
		</div>

		<DragHandle axis="x" onstart={listDrag.start} active={listDrag.isDragging} class="border-r border-warm-grey" />

		<!-- RIGHT: Detail inspector -->
		<div class="flex-1 flex flex-col min-h-0">
			{#if selected}
				<FacilityDetail facility={selected} dataset={data.sanity.dataset} selectedUnitCode={unitCode} {osmStatus} onclose={deselectFacility} onselectunit={selectUnit} onfetchosm={handleOsmFetch} onupdate={handleFacilityUpdate} onbusy={(b) => detailBusy = b} />
			{:else}
				<!-- Empty state -->
				<div class="flex-1 flex items-center justify-center text-[11px] text-mid-grey">
					Select a facility
				</div>
			{/if}
		</div>
	</div>

	<!-- Stats bar -->
	<div
		class="border-t border-warm-grey bg-light-warm-grey/50 px-4 py-1.5 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[10px] text-mid-grey"
	>
		<span><strong class="text-dark-grey">{stats.totalFacilities}</strong> fac</span>
		<span><strong class="text-dark-grey">{stats.totalUnits}</strong> units</span>
		<span class="border-l border-warm-grey pl-4"
			>oper <strong class="text-dark-grey">{fmtCap(stats.operatingCap)}</strong></span
		>
		<span>commit <strong class="text-dark-grey">{fmtCap(stats.committedCap)}</strong></span>
		<span>ret <strong class="text-dark-grey">{fmtCap(stats.retiredCap)}</strong> MW</span>
		<span class="border-l border-warm-grey pl-4"
			>photos:<strong class="text-dark-grey">{stats.withPhotos}</strong></span
		>
		<span>loc:<strong class="text-dark-grey">{stats.withLocation}</strong></span>
		<span>no-loc:<strong class="text-dark-grey">{stats.missingLocation}</strong></span>
		<span>desc:<strong class="text-dark-grey">{stats.withDescription}</strong></span>
	</div>
</div>
{/if}
</LoginGate>
