<!--
	FacilitiesScene — mock facilities layer for the shell spike.
	~15 hardcoded points around Australia with fueltech-ish colours/sizes.
-->
<script module>
	// Inline mock data per the spike brief; exported from the module script so
	// the facilities panel page can list the same names without a second copy.
	export const MOCK_FACILITIES = [
		{
			id: 'bayswater',
			name: 'Bayswater',
			lng: 150.948,
			lat: -32.395,
			colour: '#131313',
			radius: 10
		},
		{ id: 'eraring', name: 'Eraring', lng: 151.52, lat: -33.06, colour: '#131313', radius: 10 },
		{
			id: 'loy-yang-a',
			name: 'Loy Yang A',
			lng: 146.578,
			lat: -38.255,
			colour: '#131313',
			radius: 9
		},
		{ id: 'callide', name: 'Callide', lng: 150.612, lat: -24.341, colour: '#131313', radius: 8 },
		{
			id: 'torrens-island',
			name: 'Torrens Island',
			lng: 138.527,
			lat: -34.802,
			colour: '#F48E1B',
			radius: 7
		},
		{ id: 'kwinana', name: 'Kwinana', lng: 115.77, lat: -32.194, colour: '#F48E1B', radius: 6 },
		{ id: 'tumut-3', name: 'Tumut 3', lng: 148.3, lat: -35.58, colour: '#4582B4', radius: 8 },
		{ id: 'gordon', name: 'Gordon', lng: 145.97, lat: -42.73, colour: '#4582B4', radius: 7 },
		{
			id: 'hornsdale-battery',
			name: 'Hornsdale Power Reserve',
			lng: 138.55,
			lat: -33.08,
			colour: '#3145CE',
			radius: 5
		},
		{
			id: 'victorian-big-battery',
			name: 'Victorian Big Battery',
			lng: 144.36,
			lat: -38.15,
			colour: '#3145CE',
			radius: 5
		},
		{
			id: 'coopers-gap',
			name: 'Coopers Gap Wind Farm',
			lng: 151.42,
			lat: -26.75,
			colour: '#417505',
			radius: 7
		},
		{
			id: 'macarthur',
			name: 'Macarthur Wind Farm',
			lng: 142.18,
			lat: -38.02,
			colour: '#417505',
			radius: 7
		},
		{
			id: 'musselroe',
			name: 'Musselroe Wind Farm',
			lng: 148.1,
			lat: -40.83,
			colour: '#417505',
			radius: 6
		},
		{
			id: 'nyngan-solar',
			name: 'Nyngan Solar Plant',
			lng: 147.05,
			lat: -31.55,
			colour: '#FED500',
			radius: 6
		},
		{
			id: 'merredin-solar',
			name: 'Merredin Solar Farm',
			lng: 118.28,
			lat: -31.48,
			colour: '#FED500',
			radius: 5
		}
	];
</script>

<script>
	import { GeoJSONSource, CircleLayer } from 'svelte-maplibre-gl';

	/** @type {{ active?: boolean }} */
	let { active = true } = $props();

	// Static mock data — plain module constant, no reactivity needed.
	const geojson = {
		type: /** @type {'FeatureCollection'} */ ('FeatureCollection'),
		features: MOCK_FACILITIES.map((f) => ({
			type: /** @type {'Feature'} */ ('Feature'),
			geometry: {
				type: /** @type {'Point'} */ ('Point'),
				coordinates: [f.lng, f.lat]
			},
			properties: { id: f.id, colour: f.colour, radius: f.radius }
		}))
	};

	// Opacity handling: circle-opacity is bound to a $derived 0/0.85. When
	// `active` flips, svelte-maplibre-gl calls setPaintProperty and MapLibre's
	// built-in paint-property transition (~300ms) cross-fades the layer —
	// no CSS involved, chosen over an instant snap for the mounted-scenes mode.
	let opacity = $derived(active ? 0.85 : 0);
	let strokeOpacity = $derived(active ? 1 : 0);
</script>

<GeoJSONSource id="shell-facilities" data={geojson}>
	<CircleLayer
		id="shell-facilities-circles"
		paint={{
			'circle-color': ['get', 'colour'],
			'circle-radius': ['get', 'radius'],
			'circle-stroke-width': 1,
			'circle-stroke-color': '#ffffff',
			'circle-opacity': opacity,
			'circle-stroke-opacity': strokeOpacity
		}}
	/>
</GeoJSONSource>
