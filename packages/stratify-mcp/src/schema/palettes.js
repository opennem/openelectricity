/** @type {Array<{ id: string, name: string, category: string, count?: number }>} */
export const COLOUR_PALETTES = [
	// Qualitative
	{ id: 'oe-energy', name: 'OE Energy', category: 'qualitative', count: 12 },
	{ id: 'tableau10', name: 'Tableau 10', category: 'qualitative', count: 10 },
	{ id: 'set1', name: 'Set 1', category: 'qualitative', count: 9 },
	{ id: 'set2', name: 'Set 2', category: 'qualitative', count: 8 },
	{ id: 'set3', name: 'Set 3', category: 'qualitative', count: 12 },
	{ id: 'paired', name: 'Paired', category: 'qualitative', count: 12 },
	{ id: 'dark2', name: 'Dark 2', category: 'qualitative', count: 8 },
	{ id: 'pastel1', name: 'Pastel 1', category: 'qualitative', count: 9 },
	{ id: 'pastel2', name: 'Pastel 2', category: 'qualitative', count: 8 },
	{ id: 'accent', name: 'Accent', category: 'qualitative', count: 8 },
	// Sequential
	{ id: 'blues', name: 'Blues', category: 'sequential' },
	{ id: 'greens', name: 'Greens', category: 'sequential' },
	{ id: 'oranges', name: 'Oranges', category: 'sequential' },
	{ id: 'purples', name: 'Purples', category: 'sequential' },
	{ id: 'reds', name: 'Reds', category: 'sequential' },
	{ id: 'greys', name: 'Greys', category: 'sequential' },
	{ id: 'ylgn', name: 'Yellow-Green', category: 'sequential' },
	{ id: 'ylorrd', name: 'Yellow-Orange-Red', category: 'sequential' },
	{ id: 'bugn', name: 'Blue-Green', category: 'sequential' },
	{ id: 'pubu', name: 'Purple-Blue', category: 'sequential' },
	// Diverging
	{ id: 'rdbu', name: 'Red-Blue', category: 'diverging' },
	{ id: 'rdylgn', name: 'Red-Yellow-Green', category: 'diverging' },
	{ id: 'brbg', name: 'Brown-Teal', category: 'diverging' },
	{ id: 'piyg', name: 'Pink-Green', category: 'diverging' },
	{ id: 'prgn', name: 'Purple-Green', category: 'diverging' },
	{ id: 'rdylbu', name: 'Red-Yellow-Blue', category: 'diverging' },
	{ id: 'spectral', name: 'Spectral', category: 'diverging' }
];

export const PALETTE_IDS = COLOUR_PALETTES.map((p) => p.id);
