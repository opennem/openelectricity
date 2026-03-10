import { describe, it, expect } from 'vitest';
import generateDescription from './record-description';

describe('generateDescription', () => {
	describe('missing params', () => {
		it('returns empty string when period is missing', () => {
			expect(generateDescription('', 'high', 'power')).toBe('');
		});

		it('returns empty string when aggregate is missing', () => {
			expect(generateDescription('day', '', 'power')).toBe('');
		});

		it('returns empty string when metric is missing', () => {
			expect(generateDescription('day', 'high', '')).toBe('');
		});
	});

	describe('interval period', () => {
		it('power with no fuel tech', () => {
			expect(generateDescription('interval', 'high', 'power')).toBe(
				'Highest ever generation power'
			);
		});

		it('power with fuel tech', () => {
			expect(generateDescription('interval', 'high', 'power', 'solar')).toBe(
				'Highest ever solar generation'
			);
		});

		it('power low with fuel tech', () => {
			expect(generateDescription('interval', 'low', 'power', 'wind')).toBe(
				'Lowest ever wind generation'
			);
		});

		it('battery', () => {
			expect(generateDescription('interval', 'high', 'power', 'battery_discharging')).toBe(
				'Highest ever battery discharge'
			);
		});

		it('demand omits generation', () => {
			expect(generateDescription('interval', 'high', 'power', 'demand')).toBe(
				'Highest ever demand'
			);
		});

		it('pumps', () => {
			expect(generateDescription('interval', 'high', 'power', 'pumps')).toBe(
				'Highest ever pumped-storage'
			);
		});

		it('price', () => {
			expect(generateDescription('interval', 'high', 'price')).toBe('Highest ever price');
		});

		it('emissions', () => {
			expect(generateDescription('interval', 'low', 'emissions')).toBe(
				'Lowest ever emissions'
			);
		});

		it('renewable_proportion', () => {
			expect(generateDescription('interval', 'high', 'renewable_proportion')).toBe(
				'Highest ever renewable proportion'
			);
		});
	});

	describe('non-interval periods', () => {
		describe('demand omits generation', () => {
			it('day', () => {
				expect(generateDescription('day', 'high', 'power', 'demand')).toBe(
					'Highest demand over a day'
				);
			});

			it('week', () => {
				expect(generateDescription('7d', 'low', 'energy', 'demand')).toBe(
					'Lowest demand over a week'
				);
			});

			it('month', () => {
				expect(generateDescription('month', 'high', 'power', 'demand')).toBe(
					'Highest demand over a calendar month'
				);
			});

			it('year', () => {
				expect(generateDescription('year', 'low', 'power', 'demand')).toBe(
					'Lowest demand over a calendar year'
				);
			});
		});

		describe('pumps', () => {
			it('day', () => {
				expect(generateDescription('day', 'high', 'power', 'pumps')).toBe(
					'Highest pumped-storage over a day'
				);
			});
		});

		describe('battery', () => {
			it('power metric', () => {
				expect(
					generateDescription('day', 'high', 'power', 'battery_discharging')
				).toBe('Highest instantaneous battery discharge');
			});

			it('energy metric', () => {
				expect(
					generateDescription('day', 'high', 'energy', 'battery_charging')
				).toBe('Highest battery charge over a day');
			});
		});

		describe('price/emissions/market_value/renewable_proportion', () => {
			it('price over a day', () => {
				expect(generateDescription('day', 'high', 'price')).toBe(
					'Highest price over a day'
				);
			});

			it('market value over a month', () => {
				expect(generateDescription('month', 'low', 'market_value')).toBe(
					'Lowest market value over a calendar month'
				);
			});

			it('emissions over a year', () => {
				expect(generateDescription('year', 'high', 'emissions')).toBe(
					'Highest emissions over a calendar year'
				);
			});

			it('renewable proportion over a week', () => {
				expect(generateDescription('7d', 'high', 'renewable_proportion')).toBe(
					'Highest renewable proportion over a week'
				);
			});
		});

		describe('power metric with fuel tech', () => {
			it('day high solar', () => {
				expect(generateDescription('day', 'high', 'power', 'solar')).toBe(
					'Highest instantaneous solar generation'
				);
			});

			it('month low wind', () => {
				expect(generateDescription('month', 'low', 'power', 'wind')).toBe(
					'Lowest generation wind '
				);
			});
		});

		describe('energy metric with fuel tech', () => {
			it('day high solar', () => {
				expect(generateDescription('day', 'high', 'energy', 'solar')).toBe(
					'Highest solar generation over a day'
				);
			});

			it('year low coal', () => {
				expect(generateDescription('year', 'low', 'energy', 'coal')).toBe(
					'Lowest coal generation over a calendar year'
				);
			});
		});
	});

	describe('fallback for unhandled combinations', () => {
		it('returns basic description for unknown period/aggregate', () => {
			expect(generateDescription('unknown', 'high', 'power', 'solar')).toBe(
				'Highest solar power'
			);
		});

		it('uses low label in fallback', () => {
			expect(generateDescription('unknown', 'low', 'energy', 'wind')).toBe(
				'Lowest wind energy'
			);
		});
	});
});
