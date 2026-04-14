---
name: fueltech-add
description: Add a new fuel-tech code to the project — updates colour map, display names, fuel-tech groupings, and optionally icons. Touches multiple files that are easy to forget. Use when the user asks to "add a fuel tech", "add a new technology", "add a fuel source" or mentions a new fueltech_id from OE API.
---

# Add a Fuel-Tech

Adding a fuel-tech code touches several files. Miss any one and you get silent fallbacks (grey colour, code shown instead of label, missing from grouped charts).

## Gather inputs

Ask (or infer from args) if not specified:

1. **Code** — e.g. `wind_floating`, `solar_thermal`, `geothermal`. Lowercase snake_case. Must match what OE API returns in `fueltech_id`.
2. **Display name** — e.g. "Wind (Floating)". Title case with parenthetical qualifiers.
3. **Colour** — hex. Check existing related colours in `src/lib/theme/openelectricity.js` for consistency (e.g. new wind variant should be green-ish). If user doesn't specify, propose a shade derived from the parent fuel-tech via `chroma-js` (`.brighten(1)` or `.darken(1)`).
4. **Parent group** — which high-level grouping does it belong to? Options: `coal`, `gas`, `bioenergy`, `hydro`, `wind`, `solar`, `battery`, `battery_charging`, `battery_discharging`, `pumps`, `distillate`, `imports`, `exports`, `demand_response`.
5. **Renewable?** — boolean. Affects which charts/toggles it appears in.

## Files to update — all of them

### 1. `src/lib/theme/openelectricity.js`

Add to `fuelTechColourMap` near related entries. Preserve the grouped layout (blank lines between fuel families).

### 2. `src/lib/fuel_techs.js`

Add to `fuelTechNameMap` with the display name. If the fuel-tech is a load (charging, pump, export), also add to the `loadFuelTechs` array.

### 3. `src/lib/fuel-tech-groups/*.js`

For each grouping file (`simple.js`, `detailed.js`, `renewables-fossils.js`, `simple-with-split-solar.js`, `sources-loads.js`, `sources-without-battery.js`, anything under `lens/` or `scenarios/`), add the new code to the appropriate group's array in `fuelTechMap`.

**Don't** blindly add to every file — check the grouping's purpose:
- `simple.js` — broad categories (all wind types → `wind`).
- `detailed.js` — preserves subtypes.
- `renewables-fossils.js` — only the renewable/fossil distinction matters.
- `sources-loads.js` — generation vs load.

When in doubt, open the existing file and match the convention for its closest sibling (e.g. adding `wind_floating` → group wherever `wind_offshore` appears).

### 4. Icon (optional)

If an SVG icon exists for the new fuel-tech, drop it under `src/lib/icons/fuel-techs/`. Follow the naming convention of existing files (e.g. `WindSm.svelte`, `SolarUtilitySm.svelte`). The user typically provides the SVG — don't invent one.

## Verification

After all edits:

1. `bun run check` — verify no new type errors, especially in `FuelTechCode` typings.
2. Grep for the new code to confirm it resolves everywhere:
   ```
   Grep "new_fueltech_code"
   ```
   Should show hits in `theme/`, `fuel_techs.js`, and at least one `fuel-tech-groups/` file.
3. Remind the user to test visually on a chart that renders the fuel-tech (homepage infographics, scenarios-explorer, facility-detail) — the skill doesn't run the dev server.

## Reference files

- `src/lib/theme/openelectricity.js` — `fuelTechColourMap`.
- `src/lib/fuel_techs.js` — `fuelTechNameMap`, `loadFuelTechs`, `isLoad`.
- `src/lib/fuel-tech-groups/simple.js` — canonical grouping shape (`fuelTechMap`, `order`, `labels`, `fuelTechNameReducer`).
- `src/lib/icons/fuel-techs/` — per-fueltech SVG icons.
