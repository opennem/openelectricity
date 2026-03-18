import { describe, it, expect } from 'vitest';
import {
	AEMO_2026_ISP_DRAFT,
	AEMO_2024_ISP,
	AEMO_2024_ISP_DRAFT,
	AEMO_2022_ISP,
	AEMO_2022_ISP_DRAFT,
	AEMO_2020_ISP,
	AEMO_2020_ISP_DRAFT,
	AEMO_2018_ISP,
	modelScenarios,
	modelPathways,
	modelPaths,
	modelOptions,
	defaultModelPathway,
	scenarioColourMap,
	scenarioOptions,
	modelScenarioPathwayOptions
} from './models';

describe('model constants', () => {
	it('defines all model constants', () => {
		expect(AEMO_2026_ISP_DRAFT).toBe('aemo2026draft');
		expect(AEMO_2024_ISP).toBe('aemo2024');
		expect(AEMO_2024_ISP_DRAFT).toBe('aemo2024draft');
		expect(AEMO_2022_ISP).toBe('aemo2022');
		expect(AEMO_2022_ISP_DRAFT).toBe('aemo2022draft');
		expect(AEMO_2020_ISP).toBe('aemo2020');
		expect(AEMO_2020_ISP_DRAFT).toBe('aemo2020draft');
		expect(AEMO_2018_ISP).toBe('aemo2018');
	});
});

describe('modelPaths', () => {
	it('has entries for all models', () => {
		expect(modelPaths[AEMO_2026_ISP_DRAFT]).toBe('/data/scenarios/2026_ISP_draft');
		expect(modelPaths[AEMO_2024_ISP]).toBe('/data/scenarios/2024_ISP_final');
		expect(modelPaths[AEMO_2024_ISP_DRAFT]).toBe('/data/scenarios/2024_ISP_draft');
		expect(modelPaths[AEMO_2022_ISP]).toBe('/data/scenarios/2022_ISP_final');
		expect(modelPaths[AEMO_2022_ISP_DRAFT]).toBe('/data/scenarios/2022_ISP_draft');
		expect(modelPaths[AEMO_2020_ISP]).toBe('/data/scenarios/2020_ISP_final');
		expect(modelPaths[AEMO_2020_ISP_DRAFT]).toBe('/data/scenarios/2020_ISP_draft');
		expect(modelPaths[AEMO_2018_ISP]).toBe('/data/scenarios/2018_ISP');
	});
});

describe('modelScenarios', () => {
	it('defines scenarios for all models', () => {
		expect(modelScenarios[AEMO_2026_ISP_DRAFT]).toBeDefined();
		expect(modelScenarios[AEMO_2024_ISP]).toBeDefined();
		expect(modelScenarios[AEMO_2024_ISP_DRAFT]).toBeDefined();
		expect(modelScenarios[AEMO_2022_ISP]).toBeDefined();
		expect(modelScenarios[AEMO_2022_ISP_DRAFT]).toBeDefined();
		expect(modelScenarios[AEMO_2020_ISP]).toBeDefined();
		expect(modelScenarios[AEMO_2020_ISP_DRAFT]).toBeDefined();
		expect(modelScenarios[AEMO_2018_ISP]).toBeDefined();
	});

	it('draft scenarios match final scenarios for 2024 and 2022', () => {
		const final2024Ids = modelScenarios[AEMO_2024_ISP].map((s) => s.id);
		const draft2024Ids = modelScenarios[AEMO_2024_ISP_DRAFT].map((s) => s.id);
		expect(draft2024Ids).toEqual(final2024Ids);

		const final2022Ids = modelScenarios[AEMO_2022_ISP].map((s) => s.id);
		const draft2022Ids = modelScenarios[AEMO_2022_ISP_DRAFT].map((s) => s.id);
		expect(draft2022Ids).toEqual(final2022Ids);
	});

	it('2026 draft has 3 scenarios', () => {
		expect(modelScenarios[AEMO_2026_ISP_DRAFT]).toHaveLength(3);
	});

	it('2020 final has 3 scenarios', () => {
		expect(modelScenarios[AEMO_2020_ISP]).toHaveLength(3);
	});

	it('2020 draft has 5 scenarios', () => {
		expect(modelScenarios[AEMO_2020_ISP_DRAFT]).toHaveLength(5);
	});

	it('2018 has 6 scenarios', () => {
		expect(modelScenarios[AEMO_2018_ISP]).toHaveLength(6);
	});
});

describe('modelPathways', () => {
	it('2026 Draft has 24 pathways (CDP1-23 + Counterfactual, with CDP4 as ODP)', () => {
		expect(modelPathways[AEMO_2026_ISP_DRAFT]).toHaveLength(24);
		expect(modelPathways[AEMO_2026_ISP_DRAFT]).toContain('CDP4 (ODP)');
		expect(modelPathways[AEMO_2026_ISP_DRAFT]).toContain('CDP23');
		expect(modelPathways[AEMO_2026_ISP_DRAFT]).not.toContain('CDP24');
		expect(modelPathways[AEMO_2026_ISP_DRAFT]).toContain('Counterfactual');
	});

	it('2024 Final has 26 pathways (CDP1-25 + Counterfactual)', () => {
		expect(modelPathways[AEMO_2024_ISP]).toHaveLength(26);
		expect(modelPathways[AEMO_2024_ISP]).toContain('CDP25');
		expect(modelPathways[AEMO_2024_ISP]).toContain('Counterfactual');
	});

	it('2024 Draft has 18 pathways (CDP1-17 + Counterfactual)', () => {
		expect(modelPathways[AEMO_2024_ISP_DRAFT]).toHaveLength(18);
		expect(modelPathways[AEMO_2024_ISP_DRAFT]).toContain('CDP17');
		expect(modelPathways[AEMO_2024_ISP_DRAFT]).not.toContain('CDP18');
		expect(modelPathways[AEMO_2024_ISP_DRAFT]).toContain('Counterfactual');
	});

	it('2022 Final has 10 pathways', () => {
		expect(modelPathways[AEMO_2022_ISP]).toHaveLength(10);
		expect(modelPathways[AEMO_2022_ISP]).toContain('Counterfactual');
	});

	it('2022 Draft has 14 pathways (CDP1-13 + Counterfactual)', () => {
		expect(modelPathways[AEMO_2022_ISP_DRAFT]).toHaveLength(14);
		expect(modelPathways[AEMO_2022_ISP_DRAFT]).toContain('CDP13');
		expect(modelPathways[AEMO_2022_ISP_DRAFT]).not.toContain('CDP14');
		expect(modelPathways[AEMO_2022_ISP_DRAFT]).toContain('Counterfactual');
	});

	it('2020 Final has 8 pathways (DP1-8)', () => {
		expect(modelPathways[AEMO_2020_ISP]).toHaveLength(8);
		expect(modelPathways[AEMO_2020_ISP]).toContain('DP1');
		expect(modelPathways[AEMO_2020_ISP]).toContain('DP8');
	});

	it('2020 Draft has 1 pathway (default)', () => {
		expect(modelPathways[AEMO_2020_ISP_DRAFT]).toHaveLength(1);
		expect(modelPathways[AEMO_2020_ISP_DRAFT]).toContain('default');
	});

	it('2018 has 1 pathway (default)', () => {
		expect(modelPathways[AEMO_2018_ISP]).toHaveLength(1);
		expect(modelPathways[AEMO_2018_ISP]).toContain('default');
	});
});

describe('defaultModelPathway', () => {
	it('has defaults for all models', () => {
		expect(defaultModelPathway[AEMO_2026_ISP_DRAFT]).toBeDefined();
		expect(defaultModelPathway[AEMO_2024_ISP]).toBeDefined();
		expect(defaultModelPathway[AEMO_2024_ISP_DRAFT]).toBeDefined();
		expect(defaultModelPathway[AEMO_2022_ISP]).toBeDefined();
		expect(defaultModelPathway[AEMO_2022_ISP_DRAFT]).toBeDefined();
		expect(defaultModelPathway[AEMO_2020_ISP]).toBeDefined();
		expect(defaultModelPathway[AEMO_2020_ISP_DRAFT]).toBeDefined();
		expect(defaultModelPathway[AEMO_2018_ISP]).toBeDefined();
	});

	it('default pathway exists in each models pathway list', () => {
		for (const [model, pathway] of Object.entries(defaultModelPathway)) {
			expect(modelPathways[model]).toContain(pathway);
		}
	});
});

describe('modelOptions', () => {
	it('has 8 entries with 2026 draft first', () => {
		expect(modelOptions).toHaveLength(8);
		expect(modelOptions[0].value).toBe(AEMO_2026_ISP_DRAFT);
		expect(modelOptions[1].value).toBe(AEMO_2024_ISP);
		expect(modelOptions[2].value).toBe(AEMO_2024_ISP_DRAFT);
		expect(modelOptions[3].value).toBe(AEMO_2022_ISP);
		expect(modelOptions[4].value).toBe(AEMO_2022_ISP_DRAFT);
		expect(modelOptions[5].value).toBe(AEMO_2020_ISP);
		expect(modelOptions[6].value).toBe(AEMO_2020_ISP_DRAFT);
		expect(modelOptions[7].value).toBe(AEMO_2018_ISP);
	});

	it('draft entries have draft: true', () => {
		for (const model of modelOptions) {
			if (model.label.includes('(Draft)')) {
				expect(model.draft).toBe(true);
			} else {
				expect(model.draft).toBe(false);
			}
		}
	});
});

describe('scenarioColourMap', () => {
	it('assigns a colour to every scenario option', () => {
		for (const scenario of scenarioOptions) {
			expect(scenarioColourMap[scenario.id]).toBeDefined();
			expect(scenarioColourMap[scenario.id]).not.toBe('#000');
		}
	});

	it('has the correct number of entries', () => {
		expect(Object.keys(scenarioColourMap)).toHaveLength(scenarioOptions.length);
	});
});

describe('modelScenarioPathwayOptions', () => {
	it('generates entries for all model/scenario/pathway combinations', () => {
		const expected = modelOptions.reduce(
			(total, model) => total + model.scenarios.length * model.pathways.length,
			0
		);
		expect(modelScenarioPathwayOptions).toHaveLength(expected);
	});

	it('each entry has a unique id', () => {
		const ids = modelScenarioPathwayOptions.map((o) => o.id);
		expect(new Set(ids).size).toBe(ids.length);
	});
});
