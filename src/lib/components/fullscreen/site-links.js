import { AppWindow, BookOpen, ScrollText } from '@lucide/svelte';

/**
 * Where Open Electricity's data comes from, and its own resources: the
 * fullscreen footer links them, and the Tracker's phone About sheet
 * (`TrackerAboutSheet`) lists them with their descriptions.
 */

/** @type {ReadonlyArray<{ href: string, label: string, description: string }>} */
export const DATA_SOURCES = [
	{ href: 'https://www.aemo.com.au/', label: 'AEMO', description: 'Market and generation data' },
	{ href: 'https://apvi.org.au/', label: 'APVI', description: 'Rooftop solar' }
];

/** @type {ReadonlyArray<{ href: string, label: string, icon: typeof AppWindow }>} */
export const RESOURCE_LINKS = [
	{ href: 'https://platform.openelectricity.org.au/', label: 'Platform and API', icon: AppWindow },
	{ href: 'https://docs.openelectricity.org.au/', label: 'Documentation', icon: BookOpen },
	{
		href: 'https://platform.openelectricity.org.au/license',
		label: 'Data licence',
		icon: ScrollText
	}
];
