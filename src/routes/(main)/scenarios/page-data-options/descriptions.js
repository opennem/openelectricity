/**
 * @type {ScenarioContent}
 */
export const scenarioLabels = {
	aemo2026final: {
		step_change: 'AEMO Step Change 2026',
		accelerated_transition: 'AEMO Accelerated Transition 2026',
		slower_growth: 'AEMO Slower Growth 2026',
		step_change_higher_demand: 'AEMO Step Change – Higher Demand 2026',
		step_change_higher_energy_efficiency: 'AEMO Step Change – Higher Energy Efficiency 2026',
		step_change_lower_energy_efficiency: 'AEMO Step Change – Lower Energy Efficiency 2026',
		step_change_constrained_delivery: 'AEMO Step Change – Constrained Delivery 2026',
		step_change_no_further_cer_coordination: 'AEMO Step Change – No Further CER Coordination 2026',
		step_change_no_further_vpp_uptake: 'AEMO Step Change – No Further VPP Uptake 2026'
	},
	aemo2026draft: {
		step_change: 'AEMO Step Change 2026 (Draft)',
		accelerated_transition: 'AEMO Accelerated Transition 2026 (Draft)',
		slower_growth: 'AEMO Slower Growth 2026 (Draft)'
	},
	aemo2024: {
		step_change: 'AEMO Step Change 2024',
		progressive_change: 'AEMO Progressive Change 2024',
		green_energy_exports: 'AEMO Green Energy Exports 2024'
	},
	aemo2024draft: {
		step_change: 'AEMO Step Change 2024 (Draft)',
		progressive_change: 'AEMO Progressive Change 2024 (Draft)',
		green_energy_exports: 'AEMO Green Energy Exports 2024 (Draft)'
	},
	aemo2022: {
		step_change: 'AEMO Step Change 2022',
		progressive_change: 'AEMO Progressive Change 2022',
		slow_change: 'AEMO Slow Change 2022',
		hydrogen_superpower: 'AEMO Hydrogen Superpower 2022'
	},
	aemo2022draft: {
		step_change: 'AEMO Step Change 2022 (Draft)',
		progressive_change: 'AEMO Progressive Change 2022 (Draft)',
		slow_change: 'AEMO Slow Change 2022 (Draft)',
		hydrogen_superpower: 'AEMO Hydrogen Superpower 2022 (Draft)'
	},
	aemo2020: {
		step_change: 'AEMO Step Change 2020',
		slow_change: 'AEMO Slow Change 2020',
		central: 'AEMO Central 2020'
	},
	aemo2020draft: {
		step: 'AEMO Step 2020 (Draft)',
		fast: 'AEMO Fast 2020 (Draft)',
		slow: 'AEMO Slow 2020 (Draft)',
		central: 'AEMO Central 2020 (Draft)',
		high_der: 'AEMO High DER 2020 (Draft)'
	},
	aemo2018: {
		neutral: 'AEMO Neutral 2018',
		neutral_with_storage: 'AEMO Neutral with Storage 2018',
		fast: 'AEMO Fast 2018',
		slow: 'AEMO Slow 2018',
		high_der: 'AEMO High DER 2018',
		irfg: 'AEMO IRFG 2018'
	}
};

/**
 * @type {ScenarioContent}
 */
export const scenarioDescriptions = {
	aemo2026final: {
		step_change:
			"The most likely scenario, reflecting an accelerated energy transition consistent with Australia's emissions reduction targets and a growing economy.",
		accelerated_transition:
			'A faster transition pathway driven by stronger policy action, higher electrification and more rapid coal retirements.',
		slower_growth:
			'A scenario with slower economic growth and a more gradual pace of energy transition, resulting in delayed investment and coal retirements.',
		step_change_higher_demand:
			'A Step Change sensitivity testing stronger electricity demand growth, requiring more generation, storage and transmission to keep pace.',
		step_change_higher_energy_efficiency:
			'A Step Change sensitivity with stronger energy-efficiency uptake, moderating demand growth and easing the build-out of new capacity.',
		step_change_lower_energy_efficiency:
			'A Step Change sensitivity with weaker energy-efficiency uptake, lifting electricity demand and the need for additional generation and firming.',
		step_change_constrained_delivery:
			'A Step Change sensitivity in which supply-chain and delivery constraints slow the roll-out of new generation, storage and transmission.',
		step_change_no_further_cer_coordination:
			'A Step Change sensitivity assuming no further coordination of consumer energy resources, reducing the system value of distributed solar and batteries.',
		step_change_no_further_vpp_uptake:
			'A Step Change sensitivity assuming no further growth in virtual power plants, lowering the contribution of aggregated home batteries to firming.'
	},
	aemo2026draft: {
		step_change:
			"The most likely scenario, reflecting an accelerated energy transition consistent with Australia's emissions reduction targets and a growing economy.",
		accelerated_transition:
			'A faster transition pathway driven by stronger policy action, higher electrification and more rapid coal retirements.',
		slower_growth:
			'A scenario with slower economic growth and a more gradual pace of energy transition, resulting in delayed investment and coal retirements.'
	},
	aemo2024: {
		step_change:
			"Considered the most likely scenario, Step Change forecasts a rapid energy transition aligned with Australia's emissions reductions commitments within a growing economy.",
		progressive_change:
			'This scenario reflects a more moderate pace of transition compared to Step Change, characterised by slower economic growth and energy investment.',
		green_energy_exports:
			'This scenario envisions very strong industrial decarbonisation coupled with an aggressive pursuit of low-emission energy exports.'
	},
	aemo2022: {
		step_change:
			"This scenario envisions a rapid, consumer-led transformation of the energy sector, with coordinated actions taken across the economy to fulfil Australia's net-zero policy commitments quickly.",
		progressive_change:
			'Under this scenario, Australia pursues a net-zero emissions target for 2050 progressively, with emissions reduction goals being ramped up over time.',
		slow_change:
			'This scenario envisions a challenging economic environment, where industrial closures are more likely, and the pace towards net-zero emissions is slow.',
		hydrogen_superpower:
			'With strong global action and significant technological breakthroughs, this scenario nearly quadruples NEM energy consumption to support a hydrogen export industry.'
	},
	aemo2020: {
		step_change:
			'A rapid consumer-driven transition to clean energy, with strong electrification and distributed energy resource uptake across the NEM.',
		slow_change:
			'A slower pace of transition reflecting weaker economic conditions and reduced policy ambition for emissions reduction.',
		central:
			'The central reference case balancing current policy settings, moderate economic growth and steady technology cost reductions.'
	},
	aemo2020draft: {
		step: 'An accelerated transition scenario with strong consumer-led adoption of distributed energy and electrification.',
		fast: 'A fast-paced transition driven by strong global action on climate change and rapid technology cost reductions.',
		slow: 'A slower transition with reduced investment and continued reliance on existing generation infrastructure.',
		central:
			'The central reference case reflecting current policy settings and moderate economic assumptions.',
		high_der:
			'A scenario with very high uptake of distributed energy resources including rooftop solar and battery storage.'
	},
	aemo2018: {
		neutral:
			'The neutral planning scenario reflecting moderate assumptions about economic growth, technology costs and policy settings.',
		neutral_with_storage:
			'The neutral scenario with additional consideration of emerging battery storage technologies and their impact on the generation mix.',
		fast: 'An accelerated transition scenario with strong renewable energy deployment and faster coal retirements.',
		slow: 'A slower transition reflecting weaker economic conditions and reduced renewable energy investment.',
		high_der:
			'High uptake of distributed energy resources, with significant rooftop solar and battery installations driving a more decentralised energy system.',
		irfg: 'The ISP Reference Generation scenario, maintaining the existing generation fleet with minimal new investment beyond committed projects.'
	}
};

/**
 * @type {ScenarioContent}
 */
export const scenarioSummary = {
	aemo2026final: {
		step_change:
			"An accelerated transition aligned with Australia's emissions targets, featuring faster coal retirements and significant new renewable and storage investment.",
		accelerated_transition:
			'A more ambitious transition pathway with stronger policy drivers, higher electrification and earlier coal closures than Step Change.',
		slower_growth:
			'A more gradual transition reflecting slower economic growth, with delayed coal retirements and reduced pace of renewable deployment.',
		step_change_higher_demand:
			'Step Change under higher demand growth, increasing the generation, storage and network capacity needed to meet load.',
		step_change_higher_energy_efficiency:
			'Step Change with greater energy-efficiency improvements that temper demand growth and reduce new-build requirements.',
		step_change_lower_energy_efficiency:
			'Step Change with weaker energy-efficiency gains, raising demand and the need for additional capacity and firming.',
		step_change_constrained_delivery:
			'Step Change where supply-chain and delivery constraints slow the pace at which new generation, storage and transmission can be built.',
		step_change_no_further_cer_coordination:
			'Step Change without further coordination of consumer energy resources, lowering the system contribution of distributed solar and batteries.',
		step_change_no_further_vpp_uptake:
			'Step Change without further virtual power plant uptake, reducing aggregated home-battery firming.'
	},
	aemo2026draft: {
		step_change:
			"An accelerated transition aligned with Australia's emissions targets, featuring faster coal retirements and significant new renewable and storage investment.",
		accelerated_transition:
			'A more ambitious transition pathway with stronger policy drivers, higher electrification and earlier coal closures than Step Change.',
		slower_growth:
			'A more gradual transition reflecting slower economic growth, with delayed coal retirements and reduced pace of renewable deployment.'
	},
	aemo2024: {
		step_change:
			"An accelerated transition which fulfils Australia's emissions reduction commitments in a growing economy, with faster coal retirements and significant investments in new technologies.",
		progressive_change:
			'A steady transition towards renewable energy that reflects slower economic growth and slower transition of the energy sector.',
		green_energy_exports:
			'A transformational scenario where Australia expands "green commodity" exports, involving rapid delivery of a larger energy system.'
	},
	aemo2022: {
		step_change:
			'A rapid consumer-led transition to renewable energy, aiming to achieve net zero emissions ahead of 2050.',
		progressive_change:
			'A moderate pace of transition focussed on steady progress towards a net zero emissions 2050 target.',
		slow_change:
			"A slower pace of transition that does not achieve the goals set in Australia's Emissions Reductions Plan.",
		hydrogen_superpower:
			'Australia becomes a global leader in renewable energy exports, particularly hydrogen, nearly quadrupling NEM energy consumption.'
	},
	aemo2020: {
		step_change:
			'A rapid consumer-led shift to clean energy with strong distributed energy uptake and accelerated coal retirements.',
		slow_change:
			'A slow transition with weaker investment signals and prolonged reliance on existing fossil fuel generation.',
		central:
			'A moderate transition balancing current policies, steady economic growth and incremental technology improvements.'
	},
	aemo2020draft: {
		step: 'An accelerated consumer-driven transition with strong distributed energy and electrification uptake.',
		fast: 'A fast-paced global transition with rapid technology improvements and strong climate policy action.',
		slow: 'A slower transition with reduced investment and continued reliance on existing infrastructure.',
		central:
			'A moderate transition reflecting current policy settings and steady economic conditions.',
		high_der:
			'Very high uptake of rooftop solar and batteries, driving a significantly more decentralised energy system.'
	},
	aemo2018: {
		neutral:
			'A moderate planning scenario with balanced assumptions about economic growth and technology development.',
		neutral_with_storage:
			'The neutral scenario augmented with emerging storage technologies altering the generation mix.',
		fast: 'An accelerated transition with strong renewable deployment and earlier coal retirements.',
		slow: 'A slower transition with weaker investment and continued reliance on existing generation.',
		high_der:
			'High distributed energy uptake with significant rooftop solar and battery installations.',
		irfg: 'A reference scenario maintaining the existing generation fleet with minimal new investment.'
	}
};

/**
 * @type {ScenarioContent}
 */
export const scenarioKeyPoints = {
	aemo2026final: {
		step_change: [
			'Accelerated timeline for coal plant retirements aligned with announced closure dates',
			'Significant investment in utility-scale renewables and battery storage',
			'Strong electrification of transport and industry',
			'Increased distributed energy resource uptake across the NEM',
			'New transmission infrastructure to support renewable energy zones'
		],
		accelerated_transition: [
			'Faster coal retirements than Step Change driven by stronger policy action',
			'Higher rates of electrification across transport and heating',
			'More rapid deployment of large-scale renewables and firming capacity',
			'Stronger emissions reduction trajectory aligned with 1.5°C pathways',
			'Greater investment in transmission and grid infrastructure'
		],
		slower_growth: [
			'Slower economic growth reducing electricity demand growth',
			'Delayed coal retirements compared to Step Change',
			'Reduced pace of renewable energy and storage deployment',
			'Lower electrification rates for transport and industry',
			'More gradual transmission investment timeline'
		],
		step_change_higher_demand: [
			'Tests stronger growth in electricity demand than the central Step Change',
			'Greater electrification of transport and industry lifting consumption',
			'More utility-scale renewables, storage and firming required to meet load',
			'Additional transmission needed to deliver higher volumes of energy'
		],
		step_change_higher_energy_efficiency: [
			'Stronger uptake of energy-efficiency measures across the economy',
			'Lower electricity demand growth than the central Step Change',
			'Reduced need for new generation and storage investment',
			'More gradual transmission build-out'
		],
		step_change_lower_energy_efficiency: [
			'Weaker uptake of energy-efficiency measures',
			'Higher electricity demand than the central Step Change',
			'Additional generation and firming capacity required',
			'Greater pressure on transmission and network investment'
		],
		step_change_constrained_delivery: [
			'Supply-chain, labour and approval constraints slow new project delivery',
			'Renewable, storage and transmission build-out proceeds more slowly',
			'Greater reliance on existing generation during the transition',
			'Higher risk to reliability if replacement capacity is delayed'
		],
		step_change_no_further_cer_coordination: [
			'Assumes no further coordination of consumer energy resources (CER)',
			'Distributed solar and home batteries deliver less system value',
			'Greater need for utility-scale firming and storage',
			'Higher operational challenges from uncoordinated distributed generation'
		],
		step_change_no_further_vpp_uptake: [
			'Assumes no further growth in virtual power plants (VPPs)',
			'Less aggregated home-battery capacity available for firming',
			'Increased reliance on grid-scale storage and gas firming',
			'Reduced consumer participation in balancing the grid'
		]
	},
	aemo2026draft: {
		step_change: [
			'Accelerated timeline for coal plant retirements aligned with announced closure dates',
			'Significant investment in utility-scale renewables and battery storage',
			'Strong electrification of transport and industry',
			'Increased distributed energy resource uptake across the NEM',
			'New transmission infrastructure to support renewable energy zones'
		],
		accelerated_transition: [
			'Faster coal retirements than Step Change driven by stronger policy action',
			'Higher rates of electrification across transport and heating',
			'More rapid deployment of large-scale renewables and firming capacity',
			'Stronger emissions reduction trajectory aligned with 1.5°C pathways',
			'Greater investment in transmission and grid infrastructure'
		],
		slower_growth: [
			'Slower economic growth reducing electricity demand growth',
			'Delayed coal retirements compared to Step Change',
			'Reduced pace of renewable energy and storage deployment',
			'Lower electrification rates for transport and industry',
			'More gradual transmission investment timeline'
		]
	},
	aemo2024: {
		step_change: [
			'Accelerated timeline for coal plant retirements',
			'Significant investments in battery storage and gas-powered generation',
			'Increased adoption of EVs (97% by 2050)',
			'About 10,000km of transmission required by 2050',
			'Early investments in transmission infrastructure and firming capacity'
		],

		progressive_change: [
			'Steady deployment of renewable energy and consumer-owned storage',
			'Gradual retirement of coal-fired power plants to 4GW capacity by 2034-35',
			'63% adoption of EVs by 2050',
			'About 10,000km of transmission required by 2050',
			'Significant role of consumer energy resources'
		],

		green_energy_exports: [
			'Major increase in renewable energy capacity for hydrogen production and export of green commodities',
			'Extensive new transmission infrastructure',
			'Substantial economic impact and job creation',
			'Strong decarbonisation activities to limit temperature increase to 1.5°C',
			'About 26,000km of new transmission required by 2050'
		]
	},
	aemo2022: {
		step_change: [
			'Fast-paced transition to renewable energy',
			'Strong policy commitments and economic incentives',
			'Rapid decline in coal-fired power generation',
			'Accelerated adoption of EVs and hydrogen production',
			'Significant investments in battery storage and digitisation'
		],

		progressive_change: [
			'Moderate pace of renewable energy adoption',
			'Incremental improvements in energy efficiency',
			'Gradual retirement of coal-fired power plants',
			'Steady increase in EV adoption',
			'Domestic hydrogen production emerging after 2045'
		],
		slow_change: [
			'Least likely scenario, according to energy industry stakeholders',
			'Delayed transmission rollout',
			'Prolonged reliance on coal-fired power generation',
			'EV adoption falls short of targets',
			'Does not achieve net zero emissions by 2050'
		],
		hydrogen_superpower: [
			'Focus on hydrogen production and export',
			'Significant technological breakthroughs',
			'Extensive development of Renewable Energy Zones and new transmission infrastructure',
			'Dominance of large-scale wind and solar projects',
			'Major economic impact and job creation in the renewable energy sector'
		]
	},
	aemo2020: {
		step_change: [
			'Rapid consumer-led transition to clean energy',
			'Strong uptake of distributed energy resources',
			'Accelerated coal retirements across the NEM',
			'Significant investment in utility-scale renewables',
			'High electrification of transport and industry'
		],
		slow_change: [
			'Slower pace of energy transition',
			'Weaker economic conditions and reduced investment',
			'Prolonged reliance on existing fossil fuel generation',
			'Lower uptake of distributed energy resources',
			'Delayed transmission infrastructure investment'
		],
		central: [
			'Moderate pace of transition reflecting current policies',
			'Steady economic growth and technology cost reductions',
			'Gradual coal retirements as plants reach end of life',
			'Balanced uptake of distributed and utility-scale renewables',
			'Incremental improvements in energy efficiency'
		]
	},
	aemo2020draft: {
		step: [
			'Accelerated consumer-driven transition',
			'Strong distributed energy resource uptake',
			'Faster coal retirements across the NEM',
			'Significant electrification of transport',
			'High investment in battery storage'
		],
		fast: [
			'Rapid global transition driven by strong climate action',
			'Fast technology cost reductions',
			'Accelerated deployment of large-scale renewables',
			'Strong growth in electricity demand from electrification',
			'Major new transmission infrastructure investment'
		],
		slow: [
			'Slower pace of energy transition',
			'Reduced investment in new generation capacity',
			'Continued reliance on existing infrastructure',
			'Lower uptake of distributed energy resources',
			'Delayed coal retirements'
		],
		central: [
			'Moderate transition reflecting current policy settings',
			'Steady economic growth assumptions',
			'Balanced deployment of renewables and storage',
			'Gradual coal retirements over time',
			'Incremental improvements in energy efficiency'
		],
		high_der: [
			'Very high rooftop solar uptake across the NEM',
			'Significant battery storage installations behind the meter',
			'More decentralised generation mix',
			'Reduced need for some utility-scale generation',
			'Challenges for grid management from high distributed generation'
		]
	},
	aemo2018: {
		neutral: [
			'Moderate assumptions about economic and population growth',
			'Balanced technology cost assumptions',
			'Gradual transition reflecting existing policy settings',
			'Steady retirement of aging coal plants',
			'Incremental renewable energy deployment'
		],
		neutral_with_storage: [
			'Neutral assumptions augmented with emerging storage technologies',
			'Battery storage playing a growing role in the generation mix',
			'Improved grid flexibility from storage deployment',
			'Similar coal retirement timeline to the neutral scenario',
			'Additional firming capacity from battery systems'
		],
		fast: [
			'Accelerated renewable energy deployment',
			'Faster coal retirements driven by economics and policy',
			'Strong growth in distributed energy resources',
			'Higher electrification of transport',
			'Significant new transmission infrastructure'
		],
		slow: [
			'Slower pace of energy transition',
			'Weaker economic conditions reducing investment',
			'Prolonged reliance on existing coal generation',
			'Lower renewable energy deployment rates',
			'Delayed transmission infrastructure upgrades'
		],
		high_der: [
			'High uptake of rooftop solar and battery storage',
			'More decentralised energy system',
			'Reduced reliance on utility-scale generation',
			'Challenges for network management',
			'Strong consumer investment in distributed energy'
		],
		irfg: [
			'Reference scenario maintaining existing generation fleet',
			'Minimal new investment beyond committed projects',
			'Baseline for comparison with other scenarios',
			'No additional policy action assumed',
			'Focus on maintaining system reliability with existing assets'
		]
	}
};

/**
 * @type {ScenarioContent}
 */
export const scenarioParagraphs = {
	aemo2026final: {
		step_change: [
			"The Step Change scenario in the 2026 ISP represents AEMO's most likely pathway for the energy transition. It reflects an accelerated shift to renewable energy consistent with Australia's legislated emissions reduction targets within a growing economy. The scenario features faster coal retirements aligned with announced closure dates, significant investment in utility-scale renewables and battery storage, and strong uptake of distributed energy resources.",
			'Under this scenario, electrification of transport and industry accelerates, driving increased electricity demand. New transmission infrastructure is required to connect renewable energy zones to load centres. The scenario balances the pace of transition with practical delivery constraints, ensuring system reliability throughout the transformation.',
			'Step Change aims to achieve deep emissions reductions by 2050, driven by a combination of policy commitments, technology cost reductions and consumer behaviour change.'
		],
		accelerated_transition: [
			'The Accelerated Transition scenario models a faster energy transition than Step Change, driven by stronger global and domestic policy action on climate change. This pathway features earlier coal retirements, more rapid deployment of large-scale renewables and firming capacity, and higher rates of electrification across transport and heating.',
			'This scenario requires greater investment in transmission and grid infrastructure to support the accelerated build-out of renewable energy zones. The pace of transition is consistent with limiting global temperature rise to 1.5°C, requiring a more ambitious trajectory than current policy settings.',
			"Accelerated Transition represents the upper bound of plausible transition speed, testing the system's ability to deliver the required infrastructure and generation capacity on a compressed timeline."
		],
		slower_growth: [
			'The Slower Growth scenario reflects a future with lower economic growth, resulting in reduced electricity demand growth and a more gradual pace of energy transition. Coal retirements are delayed compared to Step Change, and the deployment of new renewable energy and storage capacity proceeds at a slower rate.',
			'Under this scenario, lower investment and reduced policy ambition lead to a more extended transition timeline. Electrification of transport and industry proceeds more slowly, and distributed energy resource uptake is more modest than in the other scenarios.',
			'Slower Growth provides an important lower-bound reference for planning, helping to identify investments that remain robust across a range of economic conditions.'
		],
		step_change_higher_demand: [
			'The Higher Demand sensitivity explores a Step Change future in which electricity demand grows more strongly than the central case, driven by faster electrification of transport and industry and higher underlying economic activity. Meeting this additional load requires more utility-scale wind and solar, more storage and firming, and additional transmission to move energy from renewable energy zones to demand centres.',
			'By stress-testing the upper end of demand, this sensitivity helps identify the generation and network investments that remain valuable if the transition draws more load onto the grid than expected.'
		],
		step_change_higher_energy_efficiency: [
			'The Higher Energy Efficiency sensitivity applies stronger improvements in how efficiently electricity is used across homes, businesses and industry. Lower demand growth eases the pace at which new generation, storage and transmission must be built, while still delivering the emissions reductions of the central Step Change scenario.'
		],
		step_change_lower_energy_efficiency: [
			'The Lower Energy Efficiency sensitivity assumes weaker uptake of efficiency measures, lifting electricity demand relative to the central Step Change. The higher load increases the need for additional generation and firming capacity and places greater pressure on transmission and network investment to maintain reliability.'
		],
		step_change_constrained_delivery: [
			'The Constrained Delivery sensitivity tests a Step Change future in which supply-chain bottlenecks, labour shortages and approval delays slow the roll-out of new generation, storage and transmission. With replacement capacity arriving more slowly, the system relies for longer on existing generation, raising the risk to reliability if coal retirements proceed ahead of new build.',
			'This sensitivity highlights the importance of timely delivery and the consequences of delays for cost and security of supply.'
		],
		step_change_no_further_cer_coordination: [
			'The No Further CER Coordination sensitivity assumes that consumer energy resources — such as rooftop solar and home batteries — receive no further coordination beyond current arrangements. Without orchestration, these distributed resources deliver less value to the wider system, increasing the need for utility-scale firming and storage and adding to the operational challenge of managing high volumes of uncoordinated distributed generation.'
		],
		step_change_no_further_vpp_uptake: [
			'The No Further VPP Uptake sensitivity assumes no additional growth in virtual power plants that aggregate home batteries into grid-scale resources. With less aggregated distributed storage available to firm renewable output, the system leans more heavily on grid-scale batteries and gas-fired firming, and consumers play a smaller role in balancing the grid.'
		]
	},
	aemo2026draft: {
		step_change: [
			"The Step Change scenario in the 2026 Draft ISP represents AEMO's most likely pathway for the energy transition. It reflects an accelerated shift to renewable energy consistent with Australia's legislated emissions reduction targets within a growing economy. The scenario features faster coal retirements aligned with announced closure dates, significant investment in utility-scale renewables and battery storage, and strong uptake of distributed energy resources.",
			'Under this scenario, electrification of transport and industry accelerates, driving increased electricity demand. New transmission infrastructure is required to connect renewable energy zones to load centres. The scenario balances the pace of transition with practical delivery constraints, ensuring system reliability throughout the transformation.',
			'Step Change aims to achieve deep emissions reductions by 2050, driven by a combination of policy commitments, technology cost reductions and consumer behaviour change.'
		],
		accelerated_transition: [
			'The Accelerated Transition scenario models a faster energy transition than Step Change, driven by stronger global and domestic policy action on climate change. This pathway features earlier coal retirements, more rapid deployment of large-scale renewables and firming capacity, and higher rates of electrification across transport and heating.',
			'This scenario requires greater investment in transmission and grid infrastructure to support the accelerated build-out of renewable energy zones. The pace of transition is consistent with limiting global temperature rise to 1.5°C, requiring a more ambitious trajectory than current policy settings.',
			"Accelerated Transition represents the upper bound of plausible transition speed, testing the system's ability to deliver the required infrastructure and generation capacity on a compressed timeline."
		],
		slower_growth: [
			'The Slower Growth scenario reflects a future with lower economic growth, resulting in reduced electricity demand growth and a more gradual pace of energy transition. Coal retirements are delayed compared to Step Change, and the deployment of new renewable energy and storage capacity proceeds at a slower rate.',
			'Under this scenario, lower investment and reduced policy ambition lead to a more extended transition timeline. Electrification of transport and industry proceeds more slowly, and distributed energy resource uptake is more modest than in the other scenarios.',
			'Slower Growth provides an important lower-bound reference for planning, helping to identify investments that remain robust across a range of economic conditions.'
		]
	},
	aemo2024: {
		step_change: [
			"The Step Change scenario involves a transition of the power system that is consistent with Australia's contribution to limiting global temperature rise to 2°C.  This scenario has strong emphasis on the role and integration of consumer energy resources, such as rooftop solar and battery storage. It also includes strong electrification across transport and industry, as well as small amounts of hydrogen for domestic industrial loads.",
			'This scenario results in a rapid transition to renewable energy, with an accelerated timeline for coal plant retirements. A faster deployment of renewable energy capacity, 6GW of new utility scale renewable energy per year, is required to replace retiring coal plants and meet increased electricity demand.  The scenario also includes substantial investments in battery storage and as well as some gas-powered generation for firming.  By 2034, over half of detached homes in the NEM would have rooftop solar, rising to 79% in 2050. The adoption of EVs is expected to rise significantly (97% by 2050), contributing to increased electricity demand and supporting the overall transition.',
			'This scenario aims to achieve net zero emissions by 2050, with a rapid transition to renewable energy driven by strong policy commitments and substantial investments in new technologies.'
		],

		progressive_change: [
			'The Progressive Change scenario under the 2024 Integrated System Plan reflects updated policies and stronger commitments to emissions reductions, targeting a 43% reduction by 2030. This scenario anticipates a slower deployment of renewable energy due to supply change headwinds and higher costs. International and economic factors result in some industrial loads closing.',
			'This scenario sees the retirement of coal-fired power stations (only 4GW would remain by 2034-35) and a gradual increase in renewable energy capacity, including solar, wind and battery storage. The adoption of EVs accelerates (63% by 2050), contributing to increased electricity demand. The integration of consumer energy resources, such as rooftop solar and batteries, plays a significant role.',
			'This scenario targets net zero emissions by 2050, with a moderate but consistent pace of transition supported by updated policies and increased investments in clean energy technologies.'
		],

		green_energy_exports: [
			'The Green Energy Exports scenario envisions Australia capitalising on its renewable energy resources to become a green energy exporter , via hydrogen and other energy-intensive products . This scenario involves a major increase in renewable energy capacity supported by significant investments in new transmission infrastructure to facilitate the development of a green energy export economy . This scenario involves a more rapid transformation of the power system, consistent with limiting global temperature rise to 1.5°C.',
			'In this scenario, the energy mix is dominated by large-scale wind and solar projects, with substantial contributions from battery storage and gas-powered generation for firming. The scenario requires over 26,000km of new transmission lines by 2050 to support the green energy export industries. The economic impact is substantial, with new job opportunities and economic growth driven by the renewable energy and export industries. This scenario supports global emissions reductions by providing low-emission energy solutions to international markets.',
			'This scenario aims to achieve a rapid transformation of the economy with a focus on green energy exports and extensive investments in renewable energy and transmission infrastructure, and consistent with limiting global temperature rise to 1.5°C.'
		]
	},
	aemo2022: {
		step_change: [
			"The Step Change scenario represents a fast-paced transition from fossil fuels to renewable energy, driven by strong policy commitments and significant investments in clean energy technologies. Unlike the Progressive Change scenario, Step Change moves much faster initially, aiming to fulfil Australia's net zero emissions commitments and help limit global temperature rise to below 2ºC. This rapid transformation is supported by a step change in global policy commitments, rapidly falling costs of renewable energy production, and increased digitisation, which enhances demand management of grid flexibility.",
			'This scenario sees a swift decline in coal-fired power generation, replaced by large-scale renewable energy projects, including wind, solar and battery storage. By 2050, most consumers rely on electricity for heating and transport, with the global manufacture of internal-combustion vehicles nearly ceased. The accelerated adoption of EVs and hydrogen production for industrial applications further contributes to substantial emissions reductions. Strong economic and policy support drives the rapid deployment of new technologies and infrastructure, ensuring a consistently fast-paced transition from fossil fuels to renewable energy.',
			'This scenario targets net zero emissions by 2050, with a consistently fast-paced transition to renewable energy. The transition is driven by strong policy commitments, rapidly falling costs of energy production, and increased digitisation. By 2050, electricity will be the primary energy source for heating and transport, with substantial contributions from hydrogen production.'
		],
		progressive_change: [
			'The Progressive Change scenario under the 2022 ISP envisions a gradual yet consistent shift towards renewable energy, culminating with deep emissions reductions across the economy in the 2040s. This scenario anticipates a progressive build-up of momentum, with significant emissions reductions driven by government policies, consumer investments in distributed energy resources (DER), corporate emission abatement efforts and technology cost reductions. Throughout the 2020s, the NEM will continue its trends in emissions reductions, supported by technological advancements and economic incentives.',
			'As coal plants retire, renewable energy sources such as wind and solar will gradually replace fossil fuels, supported by battery storage and gas-fired generation for firming capacity. By the 2030s, commercially viable alternatives to emissions-intensive industries will emerge, paving the way for stronger economy-wide decarbonisation and industrial electrification in the 2040s. This scenario also sees a steady increase in electric vehicle (EV) adoption, contributing to emissions reductions and increased electricity demand.  Domestic hydrogen production will begin to support the transport sector and industrial applications after 2045, further aiding the transition to net zero emissions.',
			"This scenario targets net zero emissions, reaching it in 2050 'just in time', after a progressive build-up of renewable energy capacity and technological advancements to reduce emissions gradually. The transition features deep cuts in emissions across the economy starting in the 2040s, driven by a combination of policy support, technological innovation and consumer behaviour changes."
		],
		slow_change: [
			'This scenario forecasts a slow pace of transition, with continued reliance on existing fossil fuel infrastructure into the 2040s, and the gradual integration of renewable energy. Specifically, coal-fired power generation remains a significant part of the energy mix for a longer period, with a slower decline than that forecast in the Step Change and Hydrogen Superpower scenarios.',
			"The Slow Change also forecasts slower investments in new transmission lines and battery storage infrastructure, and a failure to meet EV adoption targets. The Slow Change scenario was voted the NEM's least likely future scenario, according to a panel of energy market experts convened by AEMO.",
			'The Slow Change scenario falls short of achieving net zero emissions by 2050. The slower pace of transition and limited policy support result in moderate emissions reductions but fail to meet the net zero target.'
		],
		hydrogen_superpower: [
			"The Hydrogen Superpower scenario envisions Australia leveraging its abundant renewable energy resources to become a major exporter of hydrogen. This scenario involves strong global action on climate change and significant technological breakthroughs, which support the development of a hydrogen export industry. As a result, the demand for renewable energy nearly quadruples to meet both domestic needs and export markets, transforming transport and domestic manufacturing. Renewable energy exports become a significant part of Australia's economy, retaining its place as a global energy resource.",
			'This scenario requires extensive development of renewable energy zones (REZs) and new transmission infrastructure to support hydrogen production and export. The energy mix is dominated by large-scale wind and solar projects, supported by battery storage and gas-fired generation for firming. The economic impact is substantial, with Australia not only securing its position as a global energy resource but also creating numerous job opportunities in the renewable energy and green energy export sectors. Households with gas connections progressively switch to a hydrogen-gas blend, with a future goal of achieving 100% hydrogen use.',
			'This scenario supports global emissions reductions by positioning Australia as a leading exporter of hydrogen. It involves nearly quadrupling NEM energy consumption to support significant domestic and international emissions reductions, transforming transport and domestic manufacturing and achieving substantial advancements in renewable energy technologies and infrastructure.'
		]
	}
};

// Draft versions share the same content as their final counterparts
scenarioDescriptions.aemo2024draft = scenarioDescriptions.aemo2024;
scenarioDescriptions.aemo2022draft = scenarioDescriptions.aemo2022;
scenarioSummary.aemo2024draft = scenarioSummary.aemo2024;
scenarioSummary.aemo2022draft = scenarioSummary.aemo2022;
scenarioKeyPoints.aemo2024draft = scenarioKeyPoints.aemo2024;
scenarioKeyPoints.aemo2022draft = scenarioKeyPoints.aemo2022;
scenarioParagraphs.aemo2024draft = scenarioParagraphs.aemo2024;
scenarioParagraphs.aemo2022draft = scenarioParagraphs.aemo2022;
