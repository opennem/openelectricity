import { describe, it, expect } from 'vitest';
import {
	AEMO_2022_ISP,
	AEMO_2022_ISP_DRAFT,
	AEMO_2024_ISP,
	AEMO_2024_ISP_DRAFT,
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
	it('defines all four model constants', () => {
		expect(AEMO_2024_ISP).toBe('aemo2024');
		expect(AEMO_2024_ISP_DRAFT).toBe('aemo2024draft');
		expect(AEMO_2022_ISP).toBe('aemo2022');
		expect(AEMO_2022_ISP_DRAFT).toBe('aemo2022draft');
	});
});

describe('modelPaths', () => {
	it('has entries for all four models', () => {
		expect(modelPaths[AEMO_2024_ISP]).toBe('/data/scenarios/2024_ISP_final');
		expect(modelPaths[AEMO_2024_ISP_DRAFT]).toBe('/data/scenarios/2024_ISP_draft');
		expect(modelPaths[AEMO_2022_ISP]).toBe('/data/scenarios/2022_ISP_final');
		expect(modelPaths[AEMO_2022_ISP_DRAFT]).toBe('/data/scenarios/2022_ISP_draft');
	});
});

describe('modelScenarios', () => {
	it('defines scenarios for all four models', () => {
		expect(modelScenarios[AEMO_2024_ISP]).toBeDefined();
		expect(modelScenarios[AEMO_2024_ISP_DRAFT]).toBeDefined();
		expect(modelScenarios[AEMO_2022_ISP]).toBeDefined();
		expect(modelScenarios[AEMO_2022_ISP_DRAFT]).toBeDefined();
	});

	it('draft scenarios match final scenarios for each year', () => {
		const final2024Ids = modelScenarios[AEMO_2024_ISP].map((s) => s.id);
		const draft2024Ids = modelScenarios[AEMO_2024_ISP_DRAFT].map((s) => s.id);
		expect(draft2024Ids).toEqual(final2024Ids);

		const final2022Ids = modelScenarios[AEMO_2022_ISP].map((s) => s.id);
		const draft2022Ids = modelScenarios[AEMO_2022_ISP_DRAFT].map((s) => s.id);
		expect(draft2022Ids).toEqual(final2022Ids);
	});
});

describe('modelPathways', () => {
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
});

describe('defaultModelPathway', () => {
	it('has defaults for all four models', () => {
		expect(defaultModelPathway[AEMO_2024_ISP]).toBeDefined();
		expect(defaultModelPathway[AEMO_2024_ISP_DRAFT]).toBeDefined();
		expect(defaultModelPathway[AEMO_2022_ISP]).toBeDefined();
		expect(defaultModelPathway[AEMO_2022_ISP_DRAFT]).toBeDefined();
	});

	it('default pathway exists in each models pathway list', () => {
		for (const [model, pathway] of Object.entries(defaultModelPathway)) {
			expect(modelPathways[model]).toContain(pathway);
		}
	});
});

describe('modelOptions', () => {
	it('has 4 entries in correct order', () => {
		expect(modelOptions).toHaveLength(4);
		expect(modelOptions[0].value).toBe(AEMO_2024_ISP);
		expect(modelOptions[1].value).toBe(AEMO_2024_ISP_DRAFT);
		expect(modelOptions[2].value).toBe(AEMO_2022_ISP);
		expect(modelOptions[3].value).toBe(AEMO_2022_ISP_DRAFT);
	});

	it('labels include (Final) or (Draft)', () => {
		expect(modelOptions[0].label).toContain('(Final)');
		expect(modelOptions[1].label).toContain('(Draft)');
		expect(modelOptions[2].label).toContain('(Final)');
		expect(modelOptions[3].label).toContain('(Draft)');
	});

	it('draft entries have draft: true', () => {
		expect(modelOptions[0].draft).toBe(false);
		expect(modelOptions[1].draft).toBe(true);
		expect(modelOptions[2].draft).toBe(false);
		expect(modelOptions[3].draft).toBe(true);
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
