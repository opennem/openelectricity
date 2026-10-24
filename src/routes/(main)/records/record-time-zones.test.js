import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { xTickValueFormatters } from './[id]/RecordHistory/helpers/config';
import miniTrackerFormatters from './[id]/MiniTracker/helpers/xtick-value-formatters';
import groupByMonthDay from './page-data-options/group-by-month-day';

/**
 * Records carry their network's UTC offset as the time zone ('+10:00' NEM,
 * '+08:00' WEM), which older browsers' Intl rejects ("invalid time zone"):
 * the record page's load and the records list then threw.
 */
describe('record dates in browsers that reject offset time zones', () => {
	const { DateTimeFormat } = Intl;
	// 1 Jan 2022 01:00 in the NEM; still 31 Dec 2021 in the WEM.
	const NEW_YEAR = new Date('2021-12-31T15:00:00Z');

	beforeEach(() => {
		Intl.DateTimeFormat = /** @type {any} */ (
			class extends DateTimeFormat {
				/**
				 * @param {string} [locales]
				 * @param {Intl.DateTimeFormatOptions} [options]
				 */
				constructor(locales, options) {
					if (/^[+-]\d/.test(options?.timeZone ?? '')) throw new RangeError('invalid time zone');
					super(locales, options);
				}
			}
		);
	});

	afterEach(() => {
		Intl.DateTimeFormat = DateTimeFormat;
	});

	it('format every period of the record page and mini tracker', () => {
		for (const formatters of [xTickValueFormatters, miniTrackerFormatters]) {
			for (const { format, formatTick } of Object.values(formatters)) {
				for (const timeZone of ['+10:00', '+08:00']) {
					expect(format(NEW_YEAR, timeZone)).not.toBe('');
					expect(formatTick(NEW_YEAR, timeZone)).not.toBe('');
				}
			}
		}
	});

	it('read the date in the record’s network', () => {
		expect(xTickValueFormatters.year.format(NEW_YEAR, '+10:00')).toBe('2022');
		expect(xTickValueFormatters.year.format(NEW_YEAR, '+08:00')).toBe('2021');
		expect(xTickValueFormatters.quarter.format(NEW_YEAR, '+10:00')).toBe('Q1 2022');
		expect(xTickValueFormatters.quarter.format(NEW_YEAR, '+08:00')).toBe('Q4 2021');
		expect(xTickValueFormatters.day.format(NEW_YEAR, '+10:00')).toContain('1 Jan 2022');
	});

	it('group the records list by month and day', () => {
		const records = /** @type {any[]} */ ([
			{
				record_id: 'a',
				period: 'day',
				time: NEW_YEAR.getTime(),
				network_id: 'NEM',
				timeZone: '+10:00'
			},
			{
				record_id: 'b',
				period: 'day',
				time: NEW_YEAR.getTime(),
				network_id: 'WEM',
				timeZone: '+08:00'
			}
		]);
		const months = groupByMonthDay(records);
		expect([...months.keys()]).toEqual(['Jan 2022', 'Dec 2021']);
		expect([...(months.get('Jan 2022')?.keys() ?? [])][0]).toContain('1 Jan 2022');
	});
});
