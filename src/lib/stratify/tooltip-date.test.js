import { describe, expect, it } from 'vitest';
import {
	createAustralianDateAxisFormatter,
	createAustralianDateAxisTicks,
	formatTooltipDate
} from './tooltip-date.js';

describe('formatTooltipDate', () => {
	const date = new Date('2026-07-01T18:00:00+10:00');
	const source = '2026-07-01T18:00:00+10:00';

	it('formats date-only tooltips using the CSV wall-clock date', () => {
		expect(formatTooltipDate(date, 'date', source)).toBe('1 July 2026');
	});

	it('formats 24-hour time while preserving the time written in the CSV', () => {
		expect(formatTooltipDate(date, 'time', source)).toBe('18:00');
	});

	it('formats date and 24-hour time together', () => {
		expect(formatTooltipDate(date, 'date-time', source)).toBe('1 July 2026, 18:00');
	});

	it('falls back to deterministic UTC formatting when raw input is unavailable', () => {
		expect(formatTooltipDate(new Date('2026-07-01T08:00:00Z'), 'time')).toBe('08:00');
	});
});

describe('createAustralianDateAxisFormatter', () => {
	const referenceDate = new Date('2026-09-01T00:00:00Z');

	it('uses en-AU 24-hour time and preserves the CSV timezone on short axes', () => {
		const data = [
			{
				date: new Date('2026-07-01T00:00:00+10:00'),
				_dateStr: '2026-07-01T00:00:00+10:00'
			},
			{
				date: new Date('2026-07-01T23:00:00+10:00'),
				_dateStr: '2026-07-01T23:00:00+10:00'
			}
		];
		const format = createAustralianDateAxisFormatter(data, referenceDate);

		expect(format(data[0].date)).toBe('00:00');
		expect(format(data[1].date)).toBe('23:00');
	});

	it('uses Australian day-month order for multi-day axes', () => {
		const data = [
			{ date: new Date('2026-07-01T00:00:00Z'), _dateStr: '2026-07-01T00:00:00Z' },
			{ date: new Date('2026-08-01T00:00:00Z'), _dateStr: '2026-08-01T00:00:00Z' }
		];
		const format = createAustralianDateAxisFormatter(data, referenceDate);

		expect(format(data[0].date)).toBe('1 July');
	});

	it('includes date and 24-hour time for axes spanning several days', () => {
		const data = [
			{ date: new Date('2026-07-01T00:00:00Z'), _dateStr: '2026-07-01T00:00:00Z' },
			{ date: new Date('2026-07-08T00:00:00Z'), _dateStr: '2026-07-08T00:00:00Z' }
		];
		const format = createAustralianDateAxisFormatter(data, referenceDate);

		expect(format(new Date('2026-07-02T18:00:00Z'))).toBe('2 July, 18:00');
	});

	it('adds the year to historical time-only and day/month formats', () => {
		const shortData = [
			{ date: new Date('2025-07-01T00:00:00Z'), _dateStr: '2025-07-01T00:00:00Z' },
			{ date: new Date('2025-07-01T12:00:00Z'), _dateStr: '2025-07-01T12:00:00Z' }
		];
		const dateData = [
			{ date: new Date('2025-07-01T00:00:00Z'), _dateStr: '2025-07-01T00:00:00Z' },
			{ date: new Date('2025-08-01T00:00:00Z'), _dateStr: '2025-08-01T00:00:00Z' }
		];

		expect(createAustralianDateAxisFormatter(shortData, referenceDate)(shortData[0].date)).toBe(
			'00:00 2025'
		);
		expect(createAustralianDateAxisFormatter(dateData, referenceDate)(dateData[0].date)).toBe(
			'1 July 2025'
		);
	});
});

describe('createAustralianDateAxisTicks', () => {
	it('selects source-aligned timestamps at a readable interval', () => {
		const data = Array.from({ length: 24 }, (_, hour) => {
			const source = `2026-07-01T${String(hour).padStart(2, '0')}:00:00+10:00`;
			return { date: new Date(source), _dateStr: source };
		});
		const ticks = createAustralianDateAxisTicks(data);
		const format = createAustralianDateAxisFormatter(data, new Date('2026-09-01T00:00:00Z'));

		expect(ticks.map(format)).toEqual([
			'00:00',
			'03:00',
			'06:00',
			'09:00',
			'12:00',
			'15:00',
			'18:00',
			'21:00'
		]);
	});

	it('deduplicates timestamps repeated across facets', () => {
		const date = new Date('2026-07-01T00:00:00Z');
		expect(createAustralianDateAxisTicks([{ date }, { date }])).toEqual([date]);
	});
});
