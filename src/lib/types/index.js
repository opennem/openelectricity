/** @typedef {import('#lib/types/fuel_tech.types.ts').FuelTechCode} FuelTechCode */
/** @typedef {{label: string, value: string, order: FuelTechCode[], fuelTechs: Object.<FuelTechCode, FuelTechCode[]>, labels: Object.<FuelTechCode, string>, fuelTechNameReducer: * }} FuelTechGroup */

/** @typedef {import('#lib/types/stats.types.ts').Stats} Stats */
/** @typedef {import('#lib/types/stats.types.ts').StatsType} StatsType */
/** @typedef {import('#lib/types/stats.types.ts').StatsData} StatsData */
/** @typedef {import('#lib/types/stats.types.ts').StatsInstance} StatsInstance */
/** @typedef {import('#lib/types/chart.types.ts').TimeSeriesInstance} TimeSeriesInstance */
/** @typedef {import('#lib/types/chart.types.ts').TimeSeriesData} TimeSeriesData */
/** @typedef {import('#lib/types/chart.types.ts').CategoryData} CategoryData */
/** @typedef {import('#lib/types/chart.types.ts').ChartData} ChartData */
/** @typedef {import('#lib/types/chart.types.ts').TimeSeriesGroupData} TimeSeriesGroupData */
/** @typedef {import('#lib/types/scenario.types.ts').ScenarioKey} ScenarioKey */
/** @typedef {import('#lib/types/data_range.types.ts').DataRange} DataRange */
/** @typedef {import('#lib/types/article.types.ts').Article} Article */
/** @typedef {import('#lib/types/stats.types.ts').StatsInterval} StatsInterval */
/** @typedef {import('#lib/types/filters.types.ts').TechnologyFilterDict} TechnologyFilterDict */
/** @typedef {import('#lib/types/filters.types.ts').TechnologyFilterKey} TechnologyFilterKey  */

/** @typedef {'technology' | 'scenario' | 'region'} ScenarioViewSection */
/** @typedef {'energy' | 'emissions' | 'capacity'} ScenarioDataType */

/** @typedef {{ value: string, label?: string, icon: *, size: string}} ViewSectionOption */

/** @typedef {Object.<string, Object<string, string | string[]>>} ScenarioContent */
/** @typedef {{id: string, value: string, model: string, label: string, colour: string}} ScenarioPathwayOption */
/** @typedef {{id: string, value: string, model: string, pathway: string}} ScenarioPathway */
/** @typedef {{id: string, model: string, scenario: string, pathway: string}} ScenarioSelect */
/** @typedef {'' | 'k' | 'M' | 'G' | 'T'} SiPrefix */

/** @typedef {import('#lib/types/processed-data-viz.types.ts').ProcessedDataViz} ProcessedDataViz */

/** @typedef {import('#lib/types/record.types.ts').MilestoneRecord} MilestoneRecord */
/** @typedef {import('#lib/types/record.types.ts').Period} Period */
/** @typedef {import('#lib/types/ember-bridge.types.ts').EmberCountry} EmberCountry */

/** @typedef {import('openelectricity').NetworkCode} NetworkCode */
/** @typedef {import('openelectricity').DataMetric} DataMetric */
/** @typedef {import('openelectricity').MarketMetric} MarketMetric */
/** @typedef {import('openelectricity').DataInterval} DataInterval */
/** @typedef {import('openelectricity').DataPrimaryGrouping} DataPrimaryGrouping */
/** @typedef {import('openelectricity').DataSecondaryGrouping} DataSecondaryGrouping */
/** @typedef {import('openelectricity').UnitFueltechGroupType} UnitFueltechGroupType */

/** @typedef {'7d' | 'monthly' | '12-month-rolling' | 'yearly'} RangeType */
