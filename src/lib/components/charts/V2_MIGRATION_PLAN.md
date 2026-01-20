# V2 Chart Components Migration Plan

This document tracks the migration from old chart components to the new v2 chart system.

## Migration Status

### Pages/Features to Migrate

| Status | Page/Feature        | Old Components Used                     | Files to Update                             |
| ------ | ------------------- | --------------------------------------- | ------------------------------------------- |
| [ ]    | **Scenarios**       | `StackedAreaChart`, `LineChart`         | `ScenarioChart.svelte`, `MiniCharts.svelte` |
| [ ]    | **RecordHistory**   | `DateBrush`, `LensChart`, `WithContext` | `RecordHistory/index.svelte`                |
| [ ]    | **lens-on-ember**   | `DateBrush`, `LensChart`, `WithContext` | `lens-on-ember/+page.svelte`                |
| [x]    | **lens-on-au-grid** | `StratumChart`, `v2/DateBrush`          | `lens-on-au-grid/+page.svelte`              |
| [ ]    | **GenerationChart** | `LensChart`                             | `GenerationChart.svelte`                    |
| [x]    | **Widget**          | `LensChart`                             | `widget/+page.svelte`                       |
| [ ]    | **MiniTracker**     | `LensChart`                             | 2 MiniTracker components                    |
| [ ]    | **Info-graphics**   | Old `elements/`                         | 6+ infographic components                   |

### Old Files to Remove (after migrations complete)

#### Folders

- [ ] `src/lib/components/charts/elements/` (12 files)
- [ ] `src/lib/components/charts/elements2/` (3 files)
- [ ] `src/lib/components/charts/stores/` (5 files)

#### Top-level Components

- [ ] `StackedAreaChart.svelte`
- [ ] `LineChart.svelte`
- [ ] `LineChartWithContext.svelte`
- [ ] `DateBrush.svelte`
- [ ] `DateBrushWithContext.svelte`
- [ ] `LensChart.svelte`
- [ ] `ChartHeader.svelte`
- [ ] `ChartHeaderWithContext.svelte`
- [ ] `ChartOptions.svelte`
- [ ] `ChartOptionsWithContext.svelte`
- [ ] `ChartTooltipWithContext.svelte`
- [ ] `StackedAreaLineChartWithContext.svelte`

## V2 Component Mapping

| Old Component      | V2 Replacement                                |
| ------------------ | --------------------------------------------- |
| `LensChart`        | `StratumChart`                                |
| `StackedAreaChart` | `v2/StackedAreaChart`                         |
| `LineChart`        | `v2/StackedAreaChart` (with `display="line"`) |
| `DateBrush`        | `v2/DateBrush`                                |
| `ChartHeader`      | `v2/ChartHeader`                              |
| `ChartOptions`     | `v2/ChartControls`                            |
| `*WithContext`     | Use `v2/ChartStore` directly                  |

### Element Components

| Old Element                  | V2 Replacement            |
| ---------------------------- | ------------------------- |
| `elements/AxisX`             | `v2/elements/AxisX`       |
| `elements/AxisY`             | `v2/elements/AxisY`       |
| `elements/Line`              | `v2/elements/Line`        |
| `elements/AreaStacked`       | `v2/elements/StackedArea` |
| `elements/HoverLayer`        | `v2/elements/HoverLayer`  |
| `elements/annotations/LineX` | `v2/elements/LineX`       |
| `elements/annotations/Dot`   | `v2/elements/Dot`         |
| `elements/defs/ClipPath`     | `v2/elements/ClipPath`    |
| `elements2/StackedAreaLine`  | `v2/elements/StackedArea` |

### Store Files

| Old Store                         | V2 Replacement               |
| --------------------------------- | ---------------------------- |
| `stores/chart.svelte.js`          | `v2/ChartStore.svelte.js`    |
| `stores/chart-options.svelte.js`  | `v2/ChartOptions.svelte.js`  |
| `stores/chart-styles.svelte.js`   | `v2/ChartStyles.svelte.js`   |
| `stores/chart-tooltips.svelte.js` | `v2/ChartTooltips.svelte.js` |
| `stores/data-viz.js`              | (review if still needed)     |

## Usage References

### Files using old components

**StackedAreaChart.svelte:**

- `src/routes/(main)/scenarios/components/ScenarioChart.svelte`

**LineChart.svelte:**

- `src/routes/(main)/scenarios/components/ScenarioChart.svelte`
- `src/routes/(main)/scenarios/components/MiniCharts.svelte`

**DateBrush.svelte (old):**

- `src/routes/(main)/records/[id]/RecordHistory/index.svelte`
- `src/routes/(main)/studio/lens-on-ember/+page.svelte`

**LensChart.svelte:**

- `src/routes/(main)/studio/generation-trends-profiles/components/GenerationChart.svelte`
- ~~`src/routes/(micro)/widget/+page.svelte`~~ → migrated to v2
- `src/routes/(micro)/record/[id]/components/MiniTracker.svelte`
- `src/routes/(main)/records/[id]/RecordHistory/index.svelte`
- `src/routes/(main)/records/[id]/MiniTracker/index.svelte`
- ~~`src/routes/(main)/studio/lens-on-au-grid/+page.svelte`~~ → migrated to v2
- `src/routes/(main)/studio/lens-on-ember/+page.svelte`

**Old elements/:**

- `src/lib/components/info-graphics/scenarios-explorer/homepage/Chart.svelte`
- `src/lib/components/info-graphics/scenarios-explorer/Chart.svelte`
- `src/lib/components/info-graphics/integrated-system-plan/SparkLineArea.svelte`
- `src/lib/components/info-graphics/integrated-system-plan/OverviewChart.svelte`
- `src/routes/records-checker/components/RecordHistoryChart.svelte`
- `src/lib/components/info-graphics/system-snapshot/ColourLegend.svelte`
- `src/lib/components/info-graphics/fossil-fuels-renewables/Chart.svelte`

**Old stores/:**

- `src/routes/(main)/studio/generation-trends-profiles/helpers/init.js`
- `src/routes/(main)/scenarios/+page.svelte`
- ~~`src/routes/(micro)/widget/TopTips.svelte`~~ → migrated to v2
- ~~`src/routes/(micro)/widget/BottomTips.svelte`~~ → migrated to v2
- ~~`src/routes/(micro)/widget/helpers/init.js`~~ → migrated to v2
- `src/routes/(micro)/record/[id]/components/MiniTracker.svelte`
- `src/routes/(main)/records/[id]/RecordHistory/helpers/init.js`
- `src/routes/(main)/records/[id]/MiniTracker/helpers/init.js`
- ~~`src/routes/(main)/studio/lens-on-au-grid/helpers/init.js`~~ → migrated to v2
- `src/routes/(main)/studio/lens-on-ember/page-data-options/init.js`
- `src/lib/components/info-graphics/nem-7-day-generation/helpers/init.js`
