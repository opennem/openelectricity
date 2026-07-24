<!--
	TrackerScene — mock tracker layer for the shell spike.
	Four interconnector-ish LineStrings on the east coast plus five
	region-anchor dots (NEM capital cities).
-->
<script module>
	// Inline mock data per the spike brief; exported so the tracker panel page
	// can reuse the region list without a second copy.
	export const MOCK_REGIONS = [
		{ id: 'qld', name: 'Queensland', lng: 153.026, lat: -27.471 },
		{ id: 'nsw', name: 'New South Wales', lng: 151.209, lat: -33.868 },
		{ id: 'vic', name: 'Victoria', lng: 144.963, lat: -37.814 },
		{ id: 'sa', name: 'South Australia', lng: 138.6, lat: -34.929 },
		{ id: 'tas', name: 'Tasmania', lng: 147.325, lat: -42.882 }
	];

	export const MOCK_INTERCONNECTORS = [
		{
			id: 'qni',
			name: 'QNI',
			colour: '#8A2BE2',
			coordinates: [
				[153.026, -27.471],
				[151.6, -30.5],
				[151.209, -33.868]
			]
		},
		{
			id: 'vni',
			name: 'VNI',
			colour: '#C74523',
			coordinates: [
				[151.209, -33.868],
				[147.9, -36.1],
				[144.963, -37.814]
			]
		},
		{
			id: 'heywood',
			name: 'Heywood',
			colour: '#1A6E87',
			coordinates: [
				[144.963, -37.814],
				[141.6, -37.9],
				[138.6, -34.929]
			]
		},
		{
			id: 'basslink',
			name: 'Basslink',
			colour: '#417505',
			coordinates: [
				[144.963, -37.814],
				[146.4, -40.8],
				[147.325, -42.882]
			]
		}
	];
</script>

<script>
	import { GeoJSONSource, LineLayer, CircleLayer } from 'svelte-maplibre-gl';

	/** @type {{ active?: boolean }} */
	let { active = true } = $props();

	const linesGeojson = {
		type: /** @type {'FeatureCollection'} */ ('FeatureCollection'),
		features: MOCK_INTERCONNECTORS.map((ic) => ({
			type: /** @type {'Feature'} */ ('Feature'),
			geometry: {
				type: /** @type {'LineString'} */ ('LineString'),
				coordinates: ic.coordinates
			},
			properties: { id: ic.id, colour: ic.colour }
		}))
	};

	const anchorsGeojson = {
		type: /** @type {'FeatureCollection'} */ ('FeatureCollection'),
		features: MOCK_REGIONS.map((r) => ({
			type: /** @type {'Feature'} */ ('Feature'),
			geometry: {
				type: /** @type {'Point'} */ ('Point'),
				coordinates: [r.lng, r.lat]
			},
			properties: { id: r.id }
		}))
	};

	// Same opacity handling as FacilitiesScene: bound to a $derived 0/x and
	// cross-faded by MapLibre's built-in paint-property transition (~300ms),
	// no CSS involved.
	let lineOpacity = $derived(active ? 0.9 : 0);
	let anchorOpacity = $derived(active ? 0.95 : 0);
</script>

<GeoJSONSource id="shell-tracker-interconnectors" data={linesGeojson}>
	<LineLayer
		id="shell-tracker-interconnector-lines"
		layout={{ 'line-cap': 'round', 'line-join': 'round' }}
		paint={{
			'line-color': ['get', 'colour'],
			'line-width': 3,
			'line-opacity': lineOpacity
		}}
	/>
</GeoJSONSource>

<GeoJSONSource id="shell-tracker-anchors" data={anchorsGeojson}>
	<CircleLayer
		id="shell-tracker-anchor-circles"
		paint={{
			'circle-color': '#131313',
			'circle-radius': 6,
			'circle-stroke-width': 2,
			'circle-stroke-color': '#ffffff',
			'circle-opacity': anchorOpacity,
			'circle-stroke-opacity': anchorOpacity
		}}
	/>
</GeoJSONSource>
