/**
 * @type {ScenarioContent}
 */
export const scenarioLabels = {
	aemo2024: {
		step_change: 'AEMO Step Change 2024',
		progressive_change: 'AEMO Progressive Change 2024',
		green_energy_exports: 'AEMO Green Energy Exports 2024'
	},
	aemo2022: {
		step_change: 'AEMO Step Change 2022',
		progressive_change: 'AEMO Progressive Change 2022',
		slow_change: 'AEMO Slow Change 2022',
		hydrogen_superpower: 'AEMO Hydrogen Superpower 2022'
	}
};

/**
 * @type {ScenarioContent}
 */
export const scenarioDescriptions = {
	aemo2024: {
		step_change:
			'Considered the most likely scenario, Step Change forecasts a rapid energy transition aligned with Australia’s emissions reductions commitments within a growing economy.',
		progressive_change:
			'This scenario reflects a more moderate pace of transition compared to Step Change, characterised by slower economic growth and energy investment.',
		green_energy_exports:
			'This scenario envisions very strong industrial decarbonisation coupled with an aggressive pursuit of low-emission energy exports.'
	},
	aemo2022: {
		step_change:
			'This scenario envisions a rapid, consumer-led transformation of the energy sector, with coordinated actions taken across the economy to fulfil Australia’s net-zero policy commitments quickly.',
		progressive_change:
			'Under this scenario, Australia pursues a net-zero emissions target for 2050 progressively, with emissions reduction goals being ramped up over time.',
		slow_change:
			'This scenario envisions a challenging economic environment, where industrial closures are more likely, and the pace towards net-zero emissions is slow.',
		hydrogen_superpower:
			'With strong global action and significant technological breakthroughs, this scenario nearly quadruples NEM energy consumption to support a hydrogen export industry.'
	}
};

/**
 * @type {ScenarioContent}
 */
export const scenarioSummary = {
	aemo2024: {
		step_change:
			'An accelerated transition which fulfils Australia’s emissions reduction commitments in a growing economy, with faster coal retirements and significant investments in new technologies.',
		progressive_change:
			'A steady transition towards renewable energy that reflects slower economic growth and slower transition of the energy sector.',
		green_energy_exports:
			'A transformational scenario where Australia expands “green commodity” exports, involving rapid delivery of a larger energy system.'
	},
	aemo2022: {
		step_change:
			'A rapid consumer-led transition to renewable energy, aiming to achieve net zero emissions ahead of 2050.',
		progressive_change:
			'A moderate pace of transition focussed on steady progress towards a net zero emissions 2050 target.',
		slow_change:
			'A slower pace of transition that does not achieve the goals set in Australia’s Emissions Reductions Plan.',
		hydrogen_superpower:
			'Australia becomes a global leader in renewable energy exports, particularly hydrogen, nearly quadrupling NEM energy consumption.'
	}
};

/**
 * @type {ScenarioContent}
 */
export const scenarioKeyPoints = {
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
	}
};

/**
 * @type {ScenarioContent}
 */
export const scenarioParagraphs = {
	aemo2024: {
		step_change: [
			'The Step Change scenario involves a transition of the power system that is consistent with Australia’s contribution to limiting global temperature rise to 2°C.  This scenario has strong emphasis on the role and integration of consumer energy resources, such as rooftop solar and battery storage. It also includes strong electrification across transport and industry, as well as small amounts of hydrogen for domestic industrial loads.',
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
			'The Step Change scenario represents a fast-paced transition from fossil fuels to renewable energy, driven by strong policy commitments and significant investments in clean energy technologies. Unlike the Progressive Change scenario, Step Change moves much faster initially, aiming to fulfil Australia’s net zero emissions commitments and help limit global temperature rise to below 2ºC. This rapid transformation is supported by a step change in global policy commitments, rapidly falling costs of renewable energy production, and increased digitisation, which enhances demand management of grid flexibility.',
			'This scenario sees a swift decline in coal-fired power generation, replaced by large-scale renewable energy projects, including wind, solar and battery storage. By 2050, most consumers rely on electricity for heating and transport, with the global manufacture of internal-combustion vehicles nearly ceased. The accelerated adoption of EVs and hydrogen production for industrial applications further contributes to substantial emissions reductions. Strong economic and policy support drives the rapid deployment of new technologies and infrastructure, ensuring a consistently fast-paced transition from fossil fuels to renewable energy.',
			'This scenario targets net zero emissions by 2050, with a consistently fast-paced transition to renewable energy. The transition is driven by strong policy commitments, rapidly falling costs of energy production, and increased digitisation. By 2050, electricity will be the primary energy source for heating and transport, with substantial contributions from hydrogen production.'
		],
		progressive_change: [
			'The Progressive Change scenario under the 2022 ISP envisions a gradual yet consistent shift towards renewable energy, culminating with deep emissions reductions across the economy in the 2040s. This scenario anticipates a progressive build-up of momentum, with significant emissions reductions driven by government policies, consumer investments in distributed energy resources (DER), corporate emission abatement efforts and technology cost reductions. Throughout the 2020s, the NEM will continue its trends in emissions reductions, supported by technological advancements and economic incentives.',
			'As coal plants retire, renewable energy sources such as wind and solar will gradually replace fossil fuels, supported by battery storage and gas-fired generation for firming capacity. By the 2030s, commercially viable alternatives to emissions-intensive industries will emerge, paving the way for stronger economy-wide decarbonisation and industrial electrification in the 2040s. This scenario also sees a steady increase in electric vehicle (EV) adoption, contributing to emissions reductions and increased electricity demand.  Domestic hydrogen production will begin to support the transport sector and industrial applications after 2045, further aiding the transition to net zero emissions.',
			'This scenario targets net zero emissions, reaching it in 2050 ‘just in time’, after a progressive build-up of renewable energy capacity and technological advancements to reduce emissions gradually. The transition features deep cuts in emissions across the economy starting in the 2040s, driven by a combination of policy support, technological innovation and consumer behaviour changes.'
		],
		slow_change: [
			'This scenario forecasts a slow pace of transition, with continued reliance on existing fossil fuel infrastructure into the 2040s, and the gradual integration of renewable energy. Specifically, coal-fired power generation remains a significant part of the energy mix for a longer period, with a slower decline than that forecast in the Step Change and Hydrogen Superpower scenarios.',
			'The Slow Change also forecasts slower investments in new transmission lines and battery storage infrastructure, and a failure to meet EV adoption targets. The Slow Change scenario was voted the NEM’s least likely future scenario, according to a panel of energy market experts convened by AEMO.',
			'The Slow Change scenario falls short of achieving net zero emissions by 2050. The slower pace of transition and limited policy support result in moderate emissions reductions but fail to meet the net zero target.'
		],
		hydrogen_superpower: [
			'The Hydrogen Superpower scenario envisions Australia leveraging its abundant renewable energy resources to become a major exporter of hydrogen. This scenario involves strong global action on climate change and significant technological breakthroughs, which support the development of a hydrogen export industry. As a result, the demand for renewable energy nearly quadruples to meet both domestic needs and export markets, transforming transport and domestic manufacturing. Renewable energy exports become a significant part of Australia’s economy, retaining its place as a global energy resource.',
			'This scenario requires extensive development of renewable energy zones (REZs) and new transmission infrastructure to support hydrogen production and export. The energy mix is dominated by large-scale wind and solar projects, supported by battery storage and gas-fired generation for firming. The economic impact is substantial, with Australia not only securing its position as a global energy resource but also creating numerous job opportunities in the renewable energy and green energy export sectors. Households with gas connections progressively switch to a hydrogen-gas blend, with a future goal of achieving 100% hydrogen use.',
			'This scenario supports global emissions reductions by positioning Australia as a leading exporter of hydrogen. It involves nearly quadrupling NEM energy consumption to support significant domestic and international emissions reductions, transforming transport and domestic manufacturing and achieving substantial advancements in renewable energy technologies and infrastructure.'
		]
	}
};
