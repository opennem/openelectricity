import { describe, it, expect } from 'vitest';
import proportion from '../proportion';

describe('proportion', () => {
	it('should calculate proportions correctly for positive values', () => {
		const data = {
			coal: 100,
			gas: 50,
			solar: 50,
			time: new Date('2023-01-01').getTime(),
			date: new Date('2023-01-01')
		};

		const domains = ['coal', 'gas', 'solar'];
		const result = proportion(data, domains);

		expect(result.coal).toBe(50); // (100/200) * 100
		expect(result.gas).toBe(25); // (50/200) * 100
		expect(result.solar).toBe(25); // (50/200) * 100
	});

	it('should handle zero values correctly', () => {
		const data = {
			coal: 120,
			gas: 0,
			solar: 80,
			time: new Date('2023-01-01').getTime(),
			date: new Date('2023-01-01')
		};

		const domains = ['coal', 'gas', 'solar'];
		const result = proportion(data, domains);

		expect(result.coal).toBe(60); // (120/200) * 100
		expect(result.gas).toBe(0);
		expect(result.solar).toBe(40); // (80/200) * 100
	});

	it('should handle negative values by treating them as 0', () => {
		const data = {
			coal: 100,
			gas: -50,
			solar: 100,
			time: new Date('2023-01-01').getTime(),
			date: new Date('2023-01-01')
		};

		const domains = ['coal', 'gas', 'solar'];
		const result = proportion(data, domains);

		expect(result.coal).toBe(50); // (100/200) * 100
		expect(result.gas).toBe(0);
		expect(result.solar).toBe(50); // (100/200) * 100
	});

	it('should handle all zero values', () => {
		const data = {
			coal: 0,
			gas: 0,
			solar: 0,
			time: new Date('2023-01-01').getTime(),
			date: new Date('2023-01-01')
		};

		const domains = ['coal', 'gas', 'solar'];
		const result = proportion(data, domains);

		expect(result.coal).toBe(0);
		expect(result.gas).toBe(0);
		expect(result.solar).toBe(0);
	});
});
