import { scaleQuantile, scaleLinear } from 'd3-scale';
export const colourRanges = [0, 0.0625, 0.0656, 0.0688, 0.0813, 0.125, 0.375, 1];
export const colours = [
	'#F2F1EE',
	'#D1D0CD',
	'#B0B0AE',
	'#91918F',
	'#737372',
	'#565655',
	'#3B3B3B',
	'#222222'
];
export const labels = ['-$1k', '$0', '$50', '$100', '$300', '$1k', '$5k', '$15k'];
export const stops = [
	{ offset: '0%', color: '#21956C' },
	{ offset: '25%', color: '#8BB97A' },
	{ offset: '50%', color: '#E9FFAA' },
	{ offset: '75%', color: '#A6A36F' },
	{ offset: '100%', color: '#594929' }
];

// [0, 0.0625, 0.0656, 0.0688, 0.0813, 0.125, 0.375, 1],
// [-1000, 0, 50, 100, 300, 1000, 5000, 15000],

export const priceColour = scaleQuantile(
	[-1000, 0, 50, 100, 300, 1000, 5000, 15000],
	['#F2F1EE', '#D1D0CD', '#B0B0AE', '#91918F', '#737372', '#565655', '#3B3B3B', '#222222']
);

export const intensityColour = scaleLinear(
	[0, 100, 200, 300, 400],
	['#21956C', '#8BB97A', '#E9FFAA', '#A6A36F', '#594929']
);

console.log('priceColour', priceColour(3000));
console.log('intensityColour', intensityColour(250));
