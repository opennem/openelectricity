import { describe, it, expect } from 'vitest';
import changeSince from '../change-since';

describe('changeSince', () => {
	it('should return original data if dataset is empty', () => {
		const input = {
			time: new Date('2023-01-01').getTime(),
			date: new Date('2023-01-01'),
			value1: 100,
			value2: 200
		};

		const result = changeSince({
			datapoint: input,
			dataset: [],
			domains: ['value1', 'value2']
		});

		expect(result).toEqual(input);
	});

	it('should calculate changes since first dataset entry', () => {
		const currentData = {
			time: new Date('2023-01-02').getTime(),
			date: new Date('2023-01-02'),
			value1: 150,
			value2: 250
		};

		const dataset = [
			{
				time: new Date('2023-01-01').getTime(),
				date: new Date('2023-01-01'),
				value1: 100,
				value2: 200
			}
		];

		const result = changeSince({
			datapoint: currentData,
			dataset,
			domains: ['value1', 'value2']
		});

		expect(result).toEqual({
			time: new Date('2023-01-02').getTime(),
			date: new Date('2023-01-02'),
			value1: 50, // 150 - 100
			value2: 50 // 250 - 200
		});
	});

	it('should handle missing values in comparison data', () => {
		const currentData = {
			time: new Date('2023-01-02').getTime(),
			date: new Date('2023-01-02'),
			value1: 150,
			value2: 250
		};

		const dataset = [
			{
				time: new Date('2023-01-01').getTime(),
				date: new Date('2023-01-01'),
				value1: 100
				// value2 is missing
			}
		];

		const result = changeSince({
			datapoint: currentData,
			dataset,
			domains: ['value1', 'value2']
		});

		expect(result).toEqual({
			time: new Date('2023-01-02').getTime(),
			date: new Date('2023-01-02'),
			value1: 50, // 150 - 100
			value2: 250 // 250 - 0 (missing value defaults to 0)
		});
	});

	it('should preserve non-domain properties', () => {
		const currentData = {
			time: new Date('2023-01-02').getTime(),
			date: new Date('2023-01-02'),
			value1: 150,
			value2: 250,
			otherValue: 42
		};

		const dataset = [
			{
				time: new Date('2023-01-01').getTime(),
				date: new Date('2023-01-01'),
				value1: 100,
				value2: 200,
				otherValue: 42
			}
		];

		const result = changeSince({
			datapoint: currentData,
			dataset,
			domains: ['value1', 'value2']
		});

		expect(result).toEqual({
			time: new Date('2023-01-02').getTime(),
			date: new Date('2023-01-02'),
			value1: 50,
			value2: 50,
			otherValue: 42
		});
	});
});
