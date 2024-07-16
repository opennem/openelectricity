import { startOfYear } from 'date-fns';
import { AEMO_2022_ISP, AEMO_2024_ISP } from './models';

/** @type {Object.<string, Date[]>} */
export const chartXTicks = {
	[AEMO_2024_ISP]: [
		startOfYear(new Date('2011-01-01')),
		startOfYear(new Date('2025-01-01')),
		startOfYear(new Date('2038-01-01')),
		startOfYear(new Date('2052-01-01'))
	],
	[AEMO_2022_ISP]: [
		startOfYear(new Date('2011-01-01')),
		startOfYear(new Date('2024-01-01')),
		startOfYear(new Date('2037-01-01')),
		startOfYear(new Date('2051-01-01'))
	]
};
