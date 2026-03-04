<script>
	/**
	 * CMS Facility Explorer — IDE / Inspector Panel
	 *
	 * Two-panel layout: master list on left, detail inspector on right.
	 * Keyboard navigable, technical/dense presentation of all CMS data.
	 */

	import { urlFor } from '$lib/sanity';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import { MapLibre, GeoJSONSource, CircleLayer, NavigationControl } from 'svelte-maplibre-gl';
	import {
		Search,
		Map as MapIcon,
		MapPin,
		Image,
		ChevronRight,
		ExternalLink,
		X
	} from '@lucide/svelte';
	import { fly } from 'svelte/transition';
	import { getContext, onDestroy, onMount, tick } from 'svelte';
	import FacilityStatusIcon from '../../../facilities/_components/FacilityStatusIcon.svelte';

	// Go fullscreen to remove nav/footer — lets us own the full viewport
	/** @type {{ setFullscreen: (value: boolean) => void } | undefined} */
	const layoutContext = getContext('layout-fullscreen');
	layoutContext?.setFullscreen(true);
	onDestroy(() => layoutContext?.setFullscreen(false));

	/** @type {{ data: { facilities: any[] } }} */
	let { data } = $props();

	let searchQuery = $state('');
	let showMap = $state(false);
	/** @type {string | null} */
	let selectedId = $state(null);
	/** @type {string | null} */
	let selectedUnitId = $state(null);

	/** @type {HTMLElement | null} */
	let listContainer = $state(null);

	// Delay rendering until client-side to prevent SSR/hydration flash
	// when localStorage widths differ from defaults
	let mounted = $state(false);
	onMount(() => {
		mounted = true;
	});

	/**
	 * Read a persisted width from localStorage, clamped to [min, max].
	 * @param {string} key
	 * @param {number} min
	 * @param {number} max
	 * @param {number} fallback
	 * @returns {number}
	 */
	function loadWidth(key, min, max, fallback) {
		if (typeof localStorage !== 'undefined') {
			const saved = localStorage.getItem(key);
			if (saved) {
				const w = parseInt(saved, 10);
				if (w >= min && w <= max) return w;
			}
		}
		return fallback;
	}

	// Resizable facility list width — persisted to localStorage
	const LIST_STORAGE_KEY = 'cms-explorer-list-width';
	const LIST_MIN = 200;
	const LIST_MAX = 600;
	const LIST_DEFAULT = 250;

	let listWidth = $state(loadWidth(LIST_STORAGE_KEY, LIST_MIN, LIST_MAX, LIST_DEFAULT));
	let isListDragging = $state(false);

	/** @param {MouseEvent} e */
	function startListDrag(e) {
		e.preventDefault();
		isListDragging = true;
		const startX = e.clientX;
		const startWidth = listWidth;

		/** @param {MouseEvent} moveEvent */
		function onMove(moveEvent) {
			const delta = moveEvent.clientX - startX;
			listWidth = Math.min(LIST_MAX, Math.max(LIST_MIN, startWidth + delta));
		}

		function onUp() {
			isListDragging = false;
			window.removeEventListener('mousemove', onMove);
			window.removeEventListener('mouseup', onUp);
			if (typeof localStorage !== 'undefined') {
				localStorage.setItem(LIST_STORAGE_KEY, String(listWidth));
			}
		}

		window.addEventListener('mousemove', onMove);
		window.addEventListener('mouseup', onUp);
	}

	// Resizable unit panel width — persisted to localStorage
	const PANEL_STORAGE_KEY = 'cms-explorer-unit-panel-width';
	const PANEL_MIN = 360;
	const PANEL_MAX = 800;
	const PANEL_DEFAULT = 480;

	let unitPanelWidth = $state(loadWidth(PANEL_STORAGE_KEY, PANEL_MIN, PANEL_MAX, PANEL_DEFAULT));
	let isDragging = $state(false);

	/** @param {MouseEvent} e */
	function startDrag(e) {
		e.preventDefault();
		isDragging = true;
		const startX = e.clientX;
		const startWidth = unitPanelWidth;

		/** @param {MouseEvent} moveEvent */
		function onMove(moveEvent) {
			const delta = startX - moveEvent.clientX;
			unitPanelWidth = Math.min(PANEL_MAX, Math.max(PANEL_MIN, startWidth + delta));
		}

		function onUp() {
			isDragging = false;
			window.removeEventListener('mousemove', onMove);
			window.removeEventListener('mouseup', onUp);
			if (typeof localStorage !== 'undefined') {
				localStorage.setItem(PANEL_STORAGE_KEY, String(unitPanelWidth));
			}
		}

		window.addEventListener('mousemove', onMove);
		window.addEventListener('mouseup', onUp);
	}

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
		if (!q) return data.facilities;
		return data.facilities.filter((f) => {
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

	// Selected facility
	let selected = $derived(
		selectedId ? data.facilities.find((/** @type {any} */ f) => f._id === selectedId) : null
	);

	// Total capacity for selected facility
	let selectedCapacity = $derived(
		selected?.units?.reduce(
			(/** @type {number} */ s, /** @type {any} */ u) => s + (u.capacity_registered || 0),
			0
		) ?? 0
	);

	// Stats
	let stats = $derived.by(() => {
		const allUnits = data.facilities.flatMap((/** @type {any} */ f) => f.units || []);
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
			totalFacilities: data.facilities.length,
			totalUnits: allUnits.length,
			operatingCap,
			committedCap,
			retiredCap,
			withPhotos: data.facilities.filter((/** @type {any} */ f) => f.photos?.length > 0).length,
			withLocation: data.facilities.filter(
				(/** @type {any} */ f) => f.location?.lat && f.location?.lng
			).length,
			missingLocation: data.facilities.filter(
				(/** @type {any} */ f) => !f.location?.lat || !f.location?.lng
			).length,
			withDescription: data.facilities.filter(
				(/** @type {any} */ f) => f.description?.length > 0
			).length
		};
	});

	// GeoJSON for map
	let geojson = $derived.by(
		() =>
			/** @type {GeoJSON.FeatureCollection} */ ({
				type: 'FeatureCollection',
				features: data.facilities
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

	/** @param {string} id */
	function selectFacility(id) {
		selectedId = id;
		selectedUnitId = null;
	}

	// Selected unit object
	// Close unit panel when the selected unit no longer exists (e.g. facility changed)
	let selectedUnit = $derived.by(() => {
		if (!selectedUnitId || !selected?.units) return null;
		const unit = selected.units.find((/** @type {any} */ u) => u._id === selectedUnitId);
		if (!unit) {
			// Use queueMicrotask to avoid mutating state during derivation
			queueMicrotask(() => {
				selectedUnitId = null;
			});
			return null;
		}
		return unit;
	});

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
		const feature = e.detail?.features?.[0];
		if (!feature) return;
		const id = feature.properties?.id;
		if (id) selectFacility(id);
	}

	/** Keyboard navigation for facility list */
	function handleListKeydown(/** @type {KeyboardEvent} */ e) {
		if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
		e.preventDefault();
		const list = filteredFacilities;
		if (!list.length) return;
		const idx = selectedId ? list.findIndex((/** @type {any} */ f) => f._id === selectedId) : -1;
		let next;
		if (e.key === 'ArrowDown') {
			next = idx < list.length - 1 ? idx + 1 : 0;
		} else {
			next = idx > 0 ? idx - 1 : list.length - 1;
		}
		selectFacility(list[next]._id);
		tick().then(() => {
			const el = listContainer?.querySelector(`[data-fid="${list[next]._id}"]`);
			el?.scrollIntoView({ block: 'nearest' });
		});
	}
</script>

{#snippet kv(/** @type {string} */ label, /** @type {any} */ value)}
	<div class="grid grid-cols-3 gap-2 py-[3px] border-b border-warm-grey/60">
		<span class="text-[11px] text-mid-grey font-mono truncate" title={label}>{label}</span>
		{#if value != null && value !== ''}
			<span class="text-[12px] text-dark-grey font-mono break-all col-span-2">{value}</span>
		{:else}
			<span class="text-[12px] text-mid-grey/50 font-mono col-span-2">—</span>
		{/if}
	</div>
{/snippet}

{#if mounted}
<div class="flex flex-col h-dvh overflow-hidden font-mono">
	<!-- Header bar -->
	<div class="flex items-center gap-3 px-4 py-2 border-b border-warm-grey bg-light-warm-grey/50">
		<a
			href="/studio/facility-explorer"
			class="text-[11px] text-mid-grey hover:text-dark-grey">&larr;</a
		>
		<span class="text-[11px] font-medium text-dark-grey tracking-wide uppercase"
			>CMS Facilities</span
		>
		<span class="text-[10px] text-mid-grey ml-auto"
			>{filteredFacilities.length}/{data.facilities.length}</span
		>
		<button
			onclick={() => (showMap = !showMap)}
			class="text-[10px] px-2 py-1 border rounded transition-colors {showMap
				? 'border-dark-grey bg-dark-grey text-white'
				: 'border-warm-grey text-mid-grey hover:text-dark-grey hover:border-dark-grey'}"
		>
			MAP
		</button>
	</div>

	<!-- Map -->
	{#if showMap}
		<div class="border-b border-warm-grey" transition:fly={{ y: -10, duration: 200 }}>
			<div class="h-[300px]">
				<MapLibre
					style="/map-styles/positron.json"
					center={{ lng: 134, lat: -25 }}
					zoom={3.5}
					class="w-full h-full"
				>
					<NavigationControl position="top-right" />
					<GeoJSONSource data={geojson}>
						<CircleLayer
							paint={{
								'circle-radius': 4,
								'circle-color': ['get', 'colour'],
								'circle-stroke-width': 1,
								'circle-stroke-color': '#fff'
							}}
							onclick={handleMapClick}
						/>
					</GeoJSONSource>
				</MapLibre>
			</div>
		</div>
	{/if}

	<!-- Main split pane -->
	<div class="flex flex-1 min-h-0">
		<!-- LEFT: Facility list -->
		<div class="flex-shrink-0 border-r border-warm-grey flex flex-col min-h-0" style="width: {listWidth}px;">
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
						data-fid={facility._id}
						onclick={() => selectFacility(facility._id)}
						class="w-full text-left px-3 py-2 grid grid-cols-[8px_1fr_12px_12px_50px] items-center gap-2 border-b border-warm-grey/60 transition-colors cursor-pointer hover:bg-warm-grey/50
						{selectedId === facility._id ? 'bg-warm-grey' : ''}"
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

		<!-- List resize handle -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="w-3 h-full cursor-col-resize flex-shrink-0 flex items-center justify-center group border-r border-warm-grey bg-light-warm-grey hover:bg-warm-grey active:bg-mid-warm-grey transition-colors {isListDragging ? 'bg-mid-warm-grey' : ''}"
			onmousedown={startListDrag}
		>
			<div class="flex flex-col gap-1">
				<span class="block w-1 h-1 rounded-full bg-mid-grey group-hover:bg-dark-grey transition-colors"></span>
				<span class="block w-1 h-1 rounded-full bg-mid-grey group-hover:bg-dark-grey transition-colors"></span>
				<span class="block w-1 h-1 rounded-full bg-mid-grey group-hover:bg-dark-grey transition-colors"></span>
				<span class="block w-1 h-1 rounded-full bg-mid-grey group-hover:bg-dark-grey transition-colors"></span>
				<span class="block w-1 h-1 rounded-full bg-mid-grey group-hover:bg-dark-grey transition-colors"></span>
			</div>
		</div>

		<!-- RIGHT: Detail inspector -->
		<div class="relative flex-1 overflow-y-auto min-h-0">
			{#if selected}
				<div class="p-5">
					<!-- Facility header -->
					<div class="flex items-start gap-3 mb-5">
						<span
							class="w-3 h-3 rounded-full mt-1 flex-shrink-0"
							style="background: {ftColour(
								selected.units?.[0]?.fuel_technology?.code
							)}"
						></span>
						<div class="flex-1 min-w-0">
							<h2 class="text-sm font-medium text-dark-grey">
								{selected.name || 'Unnamed'}
							</h2>
							<div class="flex items-center gap-3 mt-0.5 text-[10px] text-mid-grey">
								<span>{selected.code}</span>
								<span>{selected.network?.name || '—'}</span>
								<span>{selected.region?.name || '—'}</span>
								<span>{selected.units?.length || 0} units</span>
								<span>{fmtCap(selectedCapacity)} MW</span>
							</div>
						</div>
						<!-- Links -->
						{#if selected.website}
							<a
								href={selected.website}
								target="_blank"
								rel="noopener noreferrer"
								class="text-[10px] text-mid-grey hover:text-dark-grey flex items-center gap-0.5"
							>
								<ExternalLink size={10} /> web
							</a>
						{/if}
						{#if selected.wikipedia}
							<a
								href={selected.wikipedia}
								target="_blank"
								rel="noopener noreferrer"
								class="text-[10px] text-mid-grey hover:text-dark-grey flex items-center gap-0.5"
							>
								<ExternalLink size={10} /> wiki
							</a>
						{/if}
					</div>

					<!-- Photos -->
					{#if selected.photos?.length > 0}
						<div class="flex gap-2 mb-5 overflow-x-auto pb-1">
							{#each selected.photos as photo, i (photo._key || i)}
								<div class="flex-shrink-0">
									<img
										src={photo.asset
											? urlFor(photo).width(400).height(240).url()
											: photo.url}
										alt={photo.alt ||
											photo.caption ||
											`${selected.name} photo ${i + 1}`}
										class="rounded border border-warm-grey object-cover h-[120px] max-w-[200px]"
									/>
									{#if photo.caption || photo.attribution}
										<p class="text-[9px] text-mid-grey mt-1 truncate max-w-[200px]">
											{photo.caption || ''}{#if photo.attribution}{photo.caption
												? ' — '
												: ''}{photo.attribution}{/if}
										</p>
									{/if}
								</div>
							{/each}
						</div>
					{/if}

					<!-- Facility section -->
					<div class="mb-5">
						<div
							class="text-[10px] text-mid-grey uppercase tracking-widest mb-2 pb-1 border-b border-dark-grey"
						>
							Facility
						</div>
						{@render kv('code', selected.code)}
						{@render kv('network', selected.network?.name)}
						{@render kv('region', selected.region?.name)}
						{@render kv(
							'location',
							selected.location?.lat && selected.location?.lng
								? `${selected.location.lat.toFixed(5)}, ${selected.location.lng.toFixed(5)}`
								: null
						)}
						{@render kv('website', selected.website)}
						{@render kv('wikipedia', selected.wikipedia)}
						{@render kv('wikidata_id', selected.wikidata_id)}
						{@render kv('osm_way_id', selected.osm_way_id)}
						{@render kv('npi_id', selected.npiId)}
					</div>

					<!-- Description -->
					{#if selected.description?.length > 0}
						<div class="mb-5">
							<div
								class="text-[10px] text-mid-grey uppercase tracking-widest mb-2 pb-1 border-b border-dark-grey"
							>
								Description
							</div>
							<div class="text-[12px] text-dark-grey leading-relaxed font-sans">
								{#each selected.description as block, i (block._key || i)}
									{#if block._type === 'block'}
										<p class="mb-1.5">
											{block.children
												?.map((/** @type {any} */ c) => c.text)
												.join('') || ''}
										</p>
									{/if}
								{/each}
							</div>
						</div>
					{/if}

					<!-- Owners -->
					{#if selected.owners?.length > 0}
						<div class="mb-5">
							<div
								class="text-[10px] text-mid-grey uppercase tracking-widest mb-2 pb-1 border-b border-dark-grey"
							>
								Owners
							</div>
							{#each selected.owners as owner (owner._id)}
								<div class="flex items-baseline gap-2 py-[3px] border-b border-warm-grey/60">
									<span class="text-[12px] text-dark-grey"
										>{owner.name || owner.legal_name}</span
									>
									{#if owner.website}
										<a
											href={owner.website}
											target="_blank"
											rel="noopener noreferrer"
											class="text-[10px] text-mid-grey hover:text-dark-grey"
											>[web]</a
										>
									{/if}
									{#if owner.contact_email}
										<span class="text-[10px] text-mid-grey"
											>{owner.contact_email}</span
										>
									{/if}
								</div>
							{/each}
						</div>
					{/if}

					<!-- Metadata -->
					{#if selected.metadata_array?.length > 0}
						<div class="mb-5">
							<div
								class="text-[10px] text-mid-grey uppercase tracking-widest mb-2 pb-1 border-b border-dark-grey"
							>
								Metadata
							</div>
							{#each selected.metadata_array as meta, i (i)}
								{@render kv(meta.key, meta.value)}
							{/each}
						</div>
					{/if}

					<!-- Units -->
					{#if selected.units?.length > 0}
						<div>
							<div
								class="text-[10px] text-mid-grey uppercase tracking-widest mb-2 pb-1 border-b border-dark-grey"
							>
								Units ({selected.units.length})
							</div>
							{#each selected.units as unit (unit._id)}
								<button
									onclick={() => (selectedUnitId = unit._id)}
									class="w-full text-left grid grid-cols-[16px_8px_1fr_50px_14px] items-center gap-2 py-1.5 px-1 hover:bg-warm-grey/50 rounded transition-colors {selectedUnitId === unit._id ? 'bg-warm-grey/30' : ''}"
								>
									<FacilityStatusIcon status={unit.status || 'operating'} />
									<span
										class="w-2 h-2 rounded-full"
										style="background: {ftColour(unit.fuel_technology?.code)}"
									></span>
									<span class="text-[11px] text-dark-grey truncate"
										>{unit.code || '—'}</span
									>
									<span class="text-[10px] text-mid-grey tabular-nums text-right"
										>{fmtCap(unit.capacity_registered)}</span
									>
									<ChevronRight
										size={10}
										class="text-mid-grey/50"
									/>
								</button>
							{/each}
						</div>
					{/if}
				</div>
			{:else}
				<!-- Empty state -->
				<div class="flex items-center justify-center h-full text-[11px] text-mid-grey">
					Select a facility
				</div>
			{/if}

			<!-- Unit detail slide-in panel -->
			{#if selectedUnit}
				<div
					class="absolute inset-y-0 right-0 flex z-20 shadow-lg"
					style="width: {unitPanelWidth}px;"
					transition:fly={{ x: unitPanelWidth, duration: 200 }}
				>
					<!-- Drag handle -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="w-3 h-full cursor-col-resize flex-shrink-0 flex items-center justify-center group border-l border-warm-grey bg-light-warm-grey hover:bg-warm-grey active:bg-mid-warm-grey transition-colors {isDragging ? 'bg-mid-warm-grey' : ''}"
						onmousedown={startDrag}
					>
						<div class="flex flex-col gap-1">
							<span class="block w-1 h-1 rounded-full bg-mid-grey group-hover:bg-dark-grey transition-colors"></span>
							<span class="block w-1 h-1 rounded-full bg-mid-grey group-hover:bg-dark-grey transition-colors"></span>
							<span class="block w-1 h-1 rounded-full bg-mid-grey group-hover:bg-dark-grey transition-colors"></span>
							<span class="block w-1 h-1 rounded-full bg-mid-grey group-hover:bg-dark-grey transition-colors"></span>
							<span class="block w-1 h-1 rounded-full bg-mid-grey group-hover:bg-dark-grey transition-colors"></span>
						</div>
					</div>
					<div class="flex-1 bg-white border-l border-warm-grey flex flex-col overflow-hidden">
						<!-- Panel header (sticky) -->
						<div class="flex items-center gap-2 px-4 py-3 border-b border-warm-grey flex-shrink-0">
							<FacilityStatusIcon status={selectedUnit.status || 'operating'} />
							<span
								class="w-2.5 h-2.5 rounded-full flex-shrink-0"
								style="background: {ftColour(selectedUnit.fuel_technology?.code)}"
							></span>
							<span class="text-[12px] font-medium text-dark-grey flex-1 truncate"
								>{selectedUnit.code}</span
							>
							<button
								onclick={() => (selectedUnitId = null)}
								class="p-1 hover:bg-warm-grey rounded transition-colors"
							>
								<X size={12} class="text-mid-grey" />
							</button>
						</div>

						<!-- Scrollable content -->
					<div class="flex-1 overflow-y-auto p-4">
						<!-- Unit fields -->
						{@render kv('code', selectedUnit.code)}
						{@render kv('fuel_technology', selectedUnit.fuel_technology?.name)}
						{@render kv('ft_code', selectedUnit.fuel_technology?.code)}
						{@render kv(
							'renewable',
							selectedUnit.fuel_technology?.renewable != null
								? String(selectedUnit.fuel_technology.renewable)
								: null
						)}
						{@render kv('dispatch_type', selectedUnit.dispatch_type)}
						{@render kv(
							'ft_dispatch_type',
							selectedUnit.fuel_technology?.dispatch_type
						)}
						{@render kv('status', selectedUnit.status)}
						{@render kv(
							'capacity_registered',
							selectedUnit.capacity_registered != null
								? `${selectedUnit.capacity_registered} MW`
								: null
						)}
						{@render kv(
							'capacity_maximum',
							selectedUnit.capacity_maximum != null
								? `${selectedUnit.capacity_maximum} MW`
								: null
						)}
						{@render kv(
							'storage_capacity',
							selectedUnit.storage_capacity != null
								? `${selectedUnit.storage_capacity} MWh`
								: null
						)}
						{@render kv(
							'min_generation',
							selectedUnit.min_generation_capacity != null
								? `${selectedUnit.min_generation_capacity} MW`
								: null
						)}
						{@render kv(
							'grid_forming',
							selectedUnit.grid_forming != null
								? String(selectedUnit.grid_forming)
								: null
						)}
						{@render kv('marginal_loss_factor', selectedUnit.marginal_loss_factor)}
						{@render kv('emissions_co2', selectedUnit.emissions_factor_co2)}
						{@render kv('emissions_source', selectedUnit.emissions_factor_source)}
						{@render kv('data_first_seen', selectedUnit.data_first_seen)}
						{@render kv('data_last_seen', selectedUnit.data_last_seen)}
						{@render kv(
							'commissioning_confirmed',
							selectedUnit.commissioning_confirmed != null
								? String(selectedUnit.commissioning_confirmed)
								: null
						)}
						{@render kv('expected_operation', selectedUnit.expected_operation_date)}
						{@render kv(
							'expected_op_specificity',
							selectedUnit.expected_operation_date_specificity
						)}
						{@render kv('expected_closure', selectedUnit.expected_closure_date)}
						{@render kv(
							'expected_cl_specificity',
							selectedUnit.expected_closure_date_specificity
						)}
						{@render kv('commencement_date', selectedUnit.commencement_date)}
						{@render kv(
							'commencement_specificity',
							selectedUnit.commencement_date_specificity
						)}
						{@render kv('closure_date', selectedUnit.closure_date)}
						{@render kv(
							'closure_specificity',
							selectedUnit.closure_date_specificity
						)}
						{@render kv('construction_start', selectedUnit.construction_start_date)}
						{@render kv('construction_cost', selectedUnit.construction_cost)}
						{@render kv(
							'cis_tender_recipient',
							selectedUnit.cis_tender_recipient != null
								? String(selectedUnit.cis_tender_recipient)
								: null
						)}

						<!-- Unit types -->
						{#if selectedUnit.unit_types?.length > 0}
							<div class="mt-3 pt-3 border-t border-warm-grey/60">
								<div
									class="text-[9px] text-mid-grey uppercase tracking-widest mb-1"
								>
									Unit Types ({selectedUnit.unit_types.length})
								</div>
								{#each selectedUnit.unit_types as ut, i (ut._id || i)}
									{#if i > 0}
										<div class="border-t border-warm-grey/40 mt-1 pt-1"></div>
									{/if}
									{@render kv('unit_number', ut.unit_number)}
									{@render kv('unit_size', ut.unit_size)}
									{@render kv(
										'capacity',
										ut.capacity != null ? `${ut.capacity} MW` : null
									)}
									{@render kv('brand', ut.unit_brand)}
									{@render kv('model', ut.unit_model)}
									{@render kv('model_year', ut.unit_model_year)}
									{@render kv('model_url', ut.unit_model_url)}
									{@render kv(
										'height',
										ut.unit_height != null ? `${ut.unit_height} m` : null
									)}
									{@render kv(
										'weight',
										ut.unit_weight != null ? `${ut.unit_weight} t` : null
									)}
									{@render kv('mounting_type', ut.mounting_type)}
									{@render kv(
										'efficiency',
										ut.unit_efficiency != null
											? `${ut.unit_efficiency}%`
											: null
									)}
								{/each}
							</div>
						{/if}

						<!-- Unit metadata -->
						{#if selectedUnit.metadata_array?.length > 0}
							<div class="mt-3 pt-3 border-t border-warm-grey/60">
								<div
									class="text-[9px] text-mid-grey uppercase tracking-widest mb-1"
								>
									Metadata
								</div>
								{#each selectedUnit.metadata_array as meta, i (i)}
									{@render kv(meta.key, meta.value)}
								{/each}
							</div>
						{/if}
					</div>
					</div>
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
