import { startOfYear } from 'date-fns';
import { AEMO_2022_ISP, AEMO_2024_ISP } from './models';

/** @type {Object.<string, Date[]>} */
export const chartXTicks = {
	[AEMO_2024_ISP]: [
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
	]
};
