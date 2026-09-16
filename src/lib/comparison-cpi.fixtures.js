import snapshot from './server/data/abs-cpi.json';

export const cpiSnapshot = () => structuredClone(snapshot);

/** Minimal SDMX structure with intentionally unordered dates. */
export function absCpiFixture() {
	const observations = [...snapshot.observations].reverse();
	return {
		data: {
			dataSets: [
				{
					attributes: [0],
					series: {
						'0:0:0:0:0': {
							attributes: [0],
							observations: Object.fromEntries(observations.map((row, i) => [i, [row.value]]))
						}
					}
				}
			],
			structures: [
				{
					dimensions: {
						series: Object.entries({
							MEASURE: '1',
							INDEX: '10001',
							TSEST: '10',
							REGION: '50',
							FREQ: 'Q'
						}).map(([id, value]) => ({ id, values: [{ id: value }] })),
						observation: [
							{ id: 'TIME_PERIOD', values: observations.map((row) => ({ id: row.period })) }
						]
					},
					attributes: {
						dataSet: [{ id: 'BASE_PERIOD', values: [{ name: snapshot.basePeriod }] }],
						series: [{ id: 'UNIT_MEASURE', values: [{ id: 'IN' }] }]
					}
				}
			]
		}
	};
}
