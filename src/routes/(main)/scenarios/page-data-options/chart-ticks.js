import { startOfYear } from 'date-fns';
import {
	AEMO_2018_ISP,
	AEMO_2020_ISP,
	AEMO_2020_ISP_DRAFT,
	AEMO_2022_ISP,
	AEMO_2022_ISP_DRAFT,
	AEMO_2024_ISP,
	AEMO_2024_ISP_DRAFT,
	AEMO_2026_ISP_DRAFT
} from './models';

/** @type {Object.<string, Date[]>} */
export const chartXTicks = {
	[AEMO_2026_ISP_DRAFT]: [
		startOfYear(new Date('2010-01-01')),
		startOfYear(new Date('2020-01-01')),
		startOfYear(new Date('2026-01-01')),
		startOfYear(new Date('2030-01-01')),
		startOfYear(new Date('2040-01-01')),
		startOfYear(new Date('2050-01-01'))
	],
	[AEMO_2024_ISP]: [
		startOfYear(new Date('2010-01-01')),
		startOfYear(new Date('2020-01-01')),
		startOfYear(new Date('2024-01-01')),
		startOfYear(new Date('2030-01-01')),
		startOfYear(new Date('2040-01-01')),
		startOfYear(new Date('2050-01-01'))
	],
	[AEMO_2024_ISP_DRAFT]: [
		startOfYear(new Date('2010-01-01')),
		startOfYear(new Date('2020-01-01')),
		startOfYear(new Date('2024-01-01')),
		startOfYear(new Date('2030-01-01')),
		startOfYear(new Date('2040-01-01')),
		startOfYear(new Date('2050-01-01'))
	],
	[AEMO_2022_ISP]: [
		startOfYear(new Date('2010-01-01')),
		startOfYear(new Date('2020-01-01')),
		startOfYear(new Date('2023-01-01')),
		startOfYear(new Date('2030-01-01')),
		startOfYear(new Date('2040-01-01')),
		startOfYear(new Date('2050-01-01'))
	],
	[AEMO_2022_ISP_DRAFT]: [
		startOfYear(new Date('2010-01-01')),
		startOfYear(new Date('2020-01-01')),
		startOfYear(new Date('2023-01-01')),
		startOfYear(new Date('2030-01-01')),
		startOfYear(new Date('2040-01-01')),
		startOfYear(new Date('2050-01-01'))
	],
	[AEMO_2020_ISP]: [
		startOfYear(new Date('2010-01-01')),
		startOfYear(new Date('2021-01-01')),
		startOfYear(new Date('2030-01-01')),
		startOfYear(new Date('2042-01-01'))
	],
	[AEMO_2020_ISP_DRAFT]: [
		startOfYear(new Date('2010-01-01')),
		startOfYear(new Date('2021-01-01')),
		startOfYear(new Date('2030-01-01')),
		startOfYear(new Date('2042-01-01'))
	],
	[AEMO_2018_ISP]: [
		startOfYear(new Date('2010-01-01')),
		startOfYear(new Date('2018-01-01')),
		startOfYear(new Date('2030-01-01')),
		startOfYear(new Date('2040-01-01'))
	]
};

/** @type {Object.<string, Date[]>} */
export const chartXHighlightTicks = {
	[AEMO_2026_ISP_DRAFT]: [startOfYear(new Date('2026-01-01'))],
	[AEMO_2024_ISP]: [startOfYear(new Date('2024-01-01'))],
	[AEMO_2024_ISP_DRAFT]: [startOfYear(new Date('2024-01-01'))],
	[AEMO_2022_ISP]: [startOfYear(new Date('2023-01-01'))],
	[AEMO_2022_ISP_DRAFT]: [startOfYear(new Date('2023-01-01'))],
	[AEMO_2020_ISP]: [startOfYear(new Date('2021-01-01'))],
	[AEMO_2020_ISP_DRAFT]: [startOfYear(new Date('2021-01-01'))],
	[AEMO_2018_ISP]: [startOfYear(new Date('2018-01-01'))]
};

/** @type {Object.<string, Date[]>} */
export const miniChartXTicks = {
	[AEMO_2026_ISP_DRAFT]: [
		startOfYear(new Date('2010-01-01')),
		startOfYear(new Date('2026-01-01')),
		startOfYear(new Date('2050-01-01'))
	],
	[AEMO_2024_ISP]: [
		startOfYear(new Date('2010-01-01')),
		startOfYear(new Date('2024-01-01')),
		startOfYear(new Date('2050-01-01'))
	],
	[AEMO_2024_ISP_DRAFT]: [
		startOfYear(new Date('2010-01-01')),
		startOfYear(new Date('2024-01-01')),
		startOfYear(new Date('2050-01-01'))
	],
	[AEMO_2022_ISP]: [
		startOfYear(new Date('2010-01-01')),
		startOfYear(new Date('2023-01-01')),
		startOfYear(new Date('2050-01-01'))
	],
	[AEMO_2022_ISP_DRAFT]: [
		startOfYear(new Date('2010-01-01')),
		startOfYear(new Date('2023-01-01')),
		startOfYear(new Date('2050-01-01'))
	],
	[AEMO_2020_ISP]: [
		startOfYear(new Date('2010-01-01')),
		startOfYear(new Date('2021-01-01')),
		startOfYear(new Date('2042-01-01'))
	],
	[AEMO_2020_ISP_DRAFT]: [
		startOfYear(new Date('2010-01-01')),
		startOfYear(new Date('2021-01-01')),
		startOfYear(new Date('2042-01-01'))
	],
	[AEMO_2018_ISP]: [
		startOfYear(new Date('2010-01-01')),
		startOfYear(new Date('2018-01-01')),
		startOfYear(new Date('2040-01-01'))
	]
};
