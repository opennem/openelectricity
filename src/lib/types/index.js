/** @typedef {import('$lib/types/fuel_tech.types').FuelTechCode} FuelTechCode */
/** @typedef {{label: string, value: string, order: FuelTechCode[], fuelTechs: Object.<FuelTechCode, FuelTechCode[]>, labels: Object.<FuelTechCode, string>, fuelTechNameReducer: * }} FuelTechGroup */

/** @typedef {import('$lib/types/stats.types').Stats} Stats */
/** @typedef {import('$lib/types/stats.types').StatsType} StatsType */
/** @typedef {import('$lib/types/stats.types').StatsData} StatsData */
/** @typedef {import('$lib/types/stats.types').StatsInstance} StatsInstance */
/** @typedef {import('$lib/types/chart.types').TimeSeriesInstance} TimeSeriesInstance */
/** @typedef {import('$lib/types/chart.types').TimeSeriesData} TimeSeriesData */
/** @typedef {import('$lib/types/chart.types').TimeSeriesGroupData} TimeSeriesGroupData */
/** @typedef {import('$lib/types/scenario.types').ScenarioKey} ScenarioKey */
/** @typedef {import('$lib/types/data_range.types').DataRange} DataRange */
/** @typedef {import('$lib/types/article.types').Article} Article */
/** @typedef {import('$lib/types/stats.types').StatsInterval} StatsInterval */
/** @typedef {import('$lib/types/filters.types').TechnologyFilterDict} TechnologyFilterDict */
/** @typedef {import('$lib/types/filters.types').TechnologyFilterKey} TechnologyFilterKey  */

/** @typedef {'technology' | 'scenario' | 'region'} ScenarioViewSection */
/** @typedef {'energy' | 'emissions' | 'capacity'} ScenarioDataType */

/** @typedef {{ value: string, label?: string, icon: *, size: string}} ViewSectionOption */

/** @typedef {Object.<string, Object<string, string | string[]>>} ScenarioContent */
/** @typedef {{id: string, value: string, model: string, label: string, colour: string}} ScenarioPathwayOption */
/** @typedef {{id: string, value: string, model: string, pathway: string}} ScenarioPathway */
/** @typedef {{id: string, model: string, scenario: string, pathway: string}} ScenarioSelect */
/** @typedef {'' | 'k' | 'M' | 'G' | 'T'} SiPrefix */

/** @typedef {import('$lib/types/processed-data-viz.types').ProcessedDataViz} ProcessedDataViz */

/** @typedef {import('$lib/types/record.types').MilestoneRecord} MilestoneRecord */
/** @typedef {import('$lib/types/record.types').Period} Period */
/** @typedef {import('$lib/types/ember-bridge.types').EmberCountry} EmberCountry */

/** @typedef {'7d' | 'monthly' | '12-month-rolling' | 'yearly'} RangeType */
